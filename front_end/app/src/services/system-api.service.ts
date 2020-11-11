import { Injectable }                          from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Location }                            from '@angular/common';
import md5                                     from 'md5';
import { from, of, throwError, Observable }    from 'rxjs';
import {
    flatMap, map, mergeMap, retryWhen, timeout, tap, catchError
}                                              from 'rxjs/operators';

import { NxConfigService, IConfig }            from './nx-config';
import { ICamera, NxSystemUser }               from './system.service';
import * as t                                  from './system-api.types';
import { Account }                             from './account.service';
import { NxUriCacheService }                   from './uri-cache.service';
import { NxAppStateService }                   from './nx-app-state.service';
import { CookieService }                       from 'ngx-cookie-service';
import { NxHealthService }                     from '../pages/health/health.service';
import { environment }                         from '@environments/environment';

interface IParams<Value = any> {
    [key: string]: Value;
}

export interface User {
    canBeEdited: boolean;
    canBeDeleted: boolean;
    email: string;
    id: string;
    isCloud: boolean;
    isAdmin?: boolean;
    isEnabled: boolean;
    userRoleId: string;
    permissions: string;
    // TODO: Remove the trash below after #VMS-2968
    name: string;
    fullName: string;
}

export interface AddResponseTypeHere extends IParams {}

export class NxSystemAPI {
    /*
     * System API is a unified service for making API requests to media servers
     *
     * There are several modes for this service:
     * 1. Upper level: working locally (no systemId) or through the cloud (with systemId)
     * 2. Lower level: working with default server (no serverID) or through the proxy (with serverId)
     *
     * Service supports authentication methods for all these cases
     * 1. working locally we use cookie authentication on server
     * 2. working through cloud we use cloudAPI method to get auth keys
     *
     * Service also supports re-authentication?
     *
     *
     * Service also should support global handlers for responses:
     * 1. Not authorised
     * 2. Server offline
     * 3. Server not available
     *
     * Other error handling is done outside. For example, in process service, or in model
     * No http cache here - caching is handled either by browser or by upper-level model
     *
     * Service is initialised to work with specific system and server.
     * Each instance representing a single connection and is cached
     *
     *
     * TODO (v 3.2): Support websocket connection to server as well
     * */
    authGet: string;
    private authPost: string;
    private authPlay: string;

    private readonly emptyId = '{00000000-0000-0000-0000-000000000000}';

    private CONFIG: IConfig;
    private http: HttpClient;
    private location: Location;

    private serverId: string;
    private systemId: string;
    private currentUser: t.NormalResponse<User>;
    private userEmail: string;
    private userRequest: Promise<t.NormalResponse<User>>;
    private urlBase: string;
    unauthorizedCallback: (params: unknown) => any;
    cacheService: NxUriCacheService;
    cookieService: CookieService
    healthService: NxHealthService;
    appState: NxAppStateService;

    constructor(
        http: HttpClient,
        configService: IConfig,
        location: Location,
        userEmail: string,
        systemId: string,
        serverId: string,
        unauthorizedCallback: (params: IParams) => any,
        cacheService: NxUriCacheService,
        cookieService: CookieService,
        healthService: NxHealthService,
        appState: NxAppStateService
    ) {
        this.http = http;
        this.CONFIG = configService;
        this.location = location;
        this.cacheService = cacheService;
        this.cookieService = cookieService;
        this.healthService = healthService;
        this.appState = appState;
        this.init(userEmail, systemId, serverId, unauthorizedCallback);

        // @ts-ignore TODO: This is to make it easy to access the systemService from the console for testing ,uncomment to add systemService to global context.
        // window.systemService = this;
        // console.log('systemService added to window');
        // console.log('to test system system api method just access the systemService from console');
        // console.log('ex. > systemService.login(\'admin\', \'qweasd1234\'');
    }

    private cookieLogin(auth, remember = false, maxAge = 365) {
        return this.post('/api/cookieLogin', { auth }).pipe(
            tap(() => {
                const cookie = 'x-runtime-guid';
                if (remember) {
                    this.cookieService.set(cookie, this.cookieService.get(cookie), maxAge);
                }
            })
        );
    }

    private digest(login: string, password: string, realm: string, nonce: string, method?: string) {
        method = md5(`${method || 'GET'}:`);
        const digest = md5(`${login}:${realm}:${password}`);
        const authDigest = md5(`${digest}:${nonce}:${method}`);
        return btoa(`${login}:${nonce}:${authDigest}`);
    }

    private getUrlBase() {
        let urlBase = '';
        if (this.systemId) {
            urlBase = window.location.protocol + '//' +
                (this.CONFIG.trafficRelayHost.replace('{host}', window.location.host).replace('{systemId}', this.systemId));
        }
        return urlBase;
    }

    private generateGetUrl(url: string, data: IParams, absUrl?: boolean) {
        let params = new HttpParams();
        Object.keys(data).forEach((key: string) => {
            params = params.set(key, data[key]);
        });
        if (absUrl) {
            const proto = window.location.protocol;
            const hostName = window.location.hostname;
            const usePort = window.location.port;
            const port = usePort ? `:${usePort}` : '';
            url = `${proto}//${hostName}${port}${url}`;
        } else {
            url = `${this.urlBase}${url}`;
        }
        return `${url}${url.indexOf('?') > -1 ? '&' : '?'}${params}`;
    }

    private get<ResponseType>(url: string, params?: any, customHttpHeaders: IParams<string> = {}) {
        let headers = new HttpHeaders();
        params = params || {};

        if (this.authGet) {
            params.auth = this.authGet;
        }

        if (environment.isLocal) {
            headers = headers.set('X-Runtime-Guid', this.cookieService.get('x-runtime-guid'));
        }
        if (this.serverId) {
            headers = headers.set('X-Server-Guid', this.serverId);
        }

        Object.entries(customHttpHeaders).forEach((entry) => {
            headers = headers.set(...entry);
        });
        const fullUrl = `${this.urlBase}${url}`;
        return this.http.get<ResponseType>(fullUrl, { headers, params }).pipe(
            retryWhen((request) => this.retryHandler(request)),
            timeout(8000),
            catchError(error => {
                if (this.CONFIG.isLocal && error.name === 'TimeoutError') {
                    this.appState.systemAvailable$.next(false);
                }
                return of(error);
            })
        );
    }

    private post<ResponseType>(url: string, data?: any, paramsToAdd = {}) {
        let headers = new HttpHeaders();
        let params = new HttpParams();
        const fullUrl = `${this.urlBase}${url}`;
        data = data || {};

        Object.keys(paramsToAdd).forEach((key) => {
            params = params.append(key, paramsToAdd[key]);
        });

        if (this.authPost) {
            params = params.append('auth', this.authPost);
        }
        if (this.serverId) {
            headers = headers.set('X-Server-guid', this.serverId);
        }
        if (environment.isLocal) {
            headers = headers.set('X-Runtime-Guid', this.cookieService.get('x-runtime-guid'));
        }
        return this.http.post<ResponseType>(fullUrl, data, { params, headers }).pipe(
            retryWhen((request) => this.retryHandler(request)),
            timeout(8000)
        );
    }

    // TODO: Need to figure out how to type this
    private retryHandler(request) {
        return request.pipe(mergeMap((error: {status: number, resultCode: string}, attempt: number) => {
            if (attempt === 0) {
                if (error.status === 401 || error.status === 403 || error.resultCode === 'forbidden') {
                    return from(this.unauthorizedCallback(error));
                } else if (error.status === 503) { // Repeat the request once again for 503 error
                    return of('');
                }
            }
            return throwError(error);
        }));
    }

    private getRequestAggregator<AggregatedType>(requests: string[]) {
        const concatRequests = encodeURI(requests.map((request) => {
            return `exec_cmd=${request}`;
        }).join('&')).replace('/', '%2F');
        const url = `/api/aggregator?${concatRequests}`;
        return this.get<AggregatedType>(url);
    }

    init(userEmail: string, systemId: string, serverId: string, unauthorizedCallback: (params: IParams) => void) {
        this.setAuthKeys('', '', '');
        this.userEmail = userEmail;
        this.systemId = systemId;
        this.serverId = serverId;
        this.unauthorizedCallback = unauthorizedCallback;
        this.urlBase = this.getUrlBase();
    }

    cleanId(id: string) {
        return id.replace('{', '').replace('}', '');
    }

    // TODO: Doesn't look like this is being used, maybe delete
    private apiHost() {
        if (this.systemId) {
            return this.CONFIG.trafficRelayHost.replace('{host}', window.location.host).replace('{systemId}', this.systemId);
        }
        return window.location.host;
    }

    /* Authentication */
    getAuthKeys() {
        const { authGet, authPost, authPlay } = this;
        return { authGet, authPost, authPlay };
    }

    public getCurrentUser(forceReload?: boolean) {
        let customHeaders;
        if (forceReload) { // Clean cache to
            this.currentUser = undefined;
            this.userRequest = undefined;
            customHeaders = { 'reset-cache': 'reset' };
        }
        if (this.currentUser) { // We have user - return him right away
            return Promise.resolve(this.currentUser);
        }
        if (this.userRequest) { // Currently requesting user
            return this.userRequest;
        }
        if (this.userEmail) { // Cloud portal mode - getCurrentUser is not working
            const endpoint = '/ec2/getUsers';
            this.cacheService.addToCache(endpoint);
            this.userRequest = this.get<Promise<t.NormalResponse<User>>>(endpoint, {}, customHeaders).toPromise()
                .then((result: any) => {
                    this.currentUser = result.find((user: User) => {
                        return user.name.toLowerCase() === this.userEmail.toLowerCase();
                    });
                    return this.currentUser;
                });
        } else { // Local system mode ???
            const endpoint = '/api/getCurrentUser';
            this.cacheService.addToCache(endpoint);
            this.userRequest = this.get<t.NormalResponse<User>>(endpoint, {}, customHeaders).toPromise()
                .then((result) => {
                    this.currentUser = result;
                    return this.currentUser;
                });
        }
        this.userRequest.finally(() => {
            this.userRequest = undefined; // Clear cache in case of errors
        });
        return this.userRequest;
    }

    private getNonce(login: string, url?: string) {
        const params: any = {
            userName: login
        };
        if (url) {
            if (url.indexOf('http') < 0) {
                url = 'http://' + url;
            }
            params.url = url;
        }
        const nonceType = url ? 'getRemoteNonce' : 'getNonce';
        return this.get(`/api/${nonceType}`, params);
    }

    private getRolePermissions(roleId: string) {
        return this.get('/ec2/getUserRoles', { id: roleId });
    }

    getApiDoc() {
        // return this.get<JSON>('/static/api.json'); // current API
        // mock response
        return this.http.get<JSON>('/static/openapi_v1.json');
    }

    login(login: string, password: string, remember = false): Observable<{data: {account: Account, resultCode: string}}|any> {
        let auth, authPost, authRtsp, nonce, realm;
        return this.getNonce(login).pipe(
            flatMap((response : any) => {
                nonce = response.reply.nonce;
                realm = response.reply.realm;
                auth = this.digest(login, password, realm, nonce);
                authPost = this.digest(login, password, realm, nonce, 'POST');
                authRtsp = this.digest(login, password, realm, nonce, 'PLAY');
                return this.cookieLogin(auth, remember);
            }),
            flatMap((data: any) => {
                if (data.error !== '0') {
                    return Promise.reject(data.data || data);
                }
                this.setAuthKeys(auth, authPost, authRtsp);
                return of(data.reply);
            }));
    }

    logout() {
        return this.post('/api/cookieLogout').pipe(tap(() => {
            this.cookieService.delete('x-runtime-guid');
        })).toPromise();
    }

    logUrl(params: {id?: number, lines?: number}) {
        return this.get<string>('/api/showLog', { ...params }, { 'Content-Type': 'text' }).toPromise();
    }

    getScripts() {
        return this.get('/api/scriptList').toPromise();
    }

    execute(script: string, mode: string = '') {
        return this.post(`/api/execute${script}?${mode}`);
    }

    getSystemSettings() {
        return this.get<t.Params[]>('/ec2/getSettings').toPromise().then(params => new t.SystemConfigSettings(params));
    }

    async getSystemCloudInfo() {
        const { cloudSystemID, cloudAccountName } = await this.getSystemSettings();
        return { cloudSystemID, cloudAccountName };
    }

    disconnectFromCloud(currentPassword: string, newAdminLogin: string = 'admin', newAdminPassword?: string) {
        const [login, password] = [newAdminLogin, newAdminPassword];
        const params = newAdminPassword ? { currentPassword, login, password } : { currentPassword };

        return NxConfigService.isLocal
            ? this.post('/web/api/detachFromCloud', params).toPromise()
            : this.post('/api/detachFromCloud', params).toPromise();
    }

    setupCloudSystem(
        systemName: string,
        cloudSystemID: string,
        cloudAuthKey: string,
        cloudAccountName: string,
        systemSettings: t.SystemConfigSettings
    ) {
        return this.post('/api/setupCloudSystem', {
            systemName,
            cloudSystemID,
            cloudAuthKey,
            cloudAccountName,
            systemSettings: Object.entries(systemSettings).map(([name, value]) => ({ name, value }))
        }).toPromise();
    }

    setupLocalSystem(
        systemName: string,
        password: string,
        systemSettings: t.SystemConfigSettings
    ) {
        return this.post('/api/setupLocalSystem', {
            systemName,
            password,
            systemSettings: Object.entries(systemSettings).map(([name, value]) => ({ name, value }))
        }).toPromise();
    }

    changeSystemName(systemName: string) {
        return this.updateOrGetSettings({ systemName }).toPromise();
    }

    configureServer(configureParams: t.ConfigureParams) {
        return this.post('/api/configure', configureParams).toPromise();
    }

    changeAdminPassword(newPassword: string, currentPassword: string) {
        return this.configureServer({ password: newPassword, currentPassword });
    }

    pingSystem(url: string, remoteLogin: string, remotePassword: string) {
        return this.getNonce(remoteLogin, url).toPromise().then((res: any) => {
            if (res.data.error !== '0') {
                return Promise.reject(res);
            }
            const { data: { reply: { realm, nonce } } } = res;
            const getKey = this.digest(remoteLogin, remotePassword, realm, nonce, 'GET');

            if (url.indexOf('http') !== 0) {
                url = 'http://' + url;
            }

            return this.get('/api/pingSystem', { getKey, url }).toPromise();
        });
    }

    getStatistics() {
        return this.get('/api/statistics', { salt: Date.now() }).toPromise();
    }

    getTimeZones() {
        return this.get('/api/getTimeZones').toPromise();
    }

    saveCloudSystemCredentials(
        cloudSystemID: string,
        cloudAuthKey: string,
        cloudAccountName: string
    ) {
        return this.post('/web/api/saveCloudSystemCredentials', {
            cloudSystemID,
            cloudAuthKey,
            cloudAccountName
        }).toPromise();
    }

    checkInternet(reload = true) {
        return this.getModuleInfo().toPromise().then(res => res.reply.serverFlags.includes('SF_HasPublicIP'));
    }

    checkLocalIfNew(reload = true) {
        return NxConfigService.isLocal
            ? Promise.resolve({})
            : this.getModuleInfo().toPromise();
    }

    createEvent(params: t.EventParams) {
        return this.get('/api/createEvent', params).toPromise();
    }

    getEvents(
        from: Date,
        to = Date.now(),
        cameraId?: string,
        eventType?: t.EventTypes,
        actionType?: t.ActionTypes,
        eventRuleId?: string
    ) {
        // eslint-disable-next-line camelcase
        const [event_type, action_type, brule_id] = [eventType, actionType, eventRuleId];
        return this.get('/api/getEvents', { from, to, cameraId, event_type, action_type, brule_id }).toPromise();
    }

    backupControl(action?: 'start' | 'stop') {
        this.get('/api/backupControl', { action }).toPromise();
    }

    cameraDiagnostic(cameraId: string, type: t.CameraDiagnosticSteps) {
        return this.get('/api/doCameraDiagnosticsStep', { cameraId, type }).toPromise();
    }

    getServerNetworkSettings() {
        return this.get<t.NormalResponse<t.ServerNetworkSettings>>('/api/iflist').toPromise();
    }

    setServerNetworkSettings(networkSettings: t.ServerNetworkSettings) {
        return this.post('/api/ifconfig', networkSettings).toPromise();
    }

    // TODO: This doesn't look like it's being used
    // private checkPermissions(flag) {
    //     // TODO: getCurrentUser will not work on portal for 3.0 systems, think of something
    //     return this.getCurrentUser().then((user) => {
    //         if (!user.isAdmin && this.isEmptyId(user.userRoleId)) {
    //             return this.getRolePermissions(user.userRoleId).subscribe((role: unknown) => {
    //                 return role.permissions.indexOf(flag) > -1;
    //             });
    //         }
    //         return user.isAdmin || user.permissions.indexOf(flag) > -1;
    //     });
    // }

    setAuthKeys(authGet: string, authPost: string, authPlay: string) {
        this.authGet = authGet;
        this.authPost = authPost;
        this.authPlay = authPlay;
    }

    /* End of Authentication  */

    /* Server settings */
    public getServerTimes() {
        return this.get<t.SystemTime>('/ec2/getTimeOfServers');
    }

    private getSystemTime() {
        return this.get<t.SystemTime>('/api/synchronizedTime');
    }

    public updateOrGetSettings(updateParams: Partial<t.Settings>) {
        return this.get<t.SystemSettings>('/api/systemSettings', updateParams);
    }

    /**
     * Start of Storage
     */
    public getStoragesInfo(queryParams) {
        return this.get<Array<t.GetStorages>>('/ec2/getStorages', queryParams);
    }

    public getStorages() {
        return this.get<Array<t.GetStorages>>('/api/storageSpace');
    }

    public getStorageStatus(queryParams) {
        return this.get<Array<t.GetStorages>>('/api/storageStatus', queryParams);
    }

    saveStorage(updateParams: IParams) {
        return this.post<any>('/ec2/saveStorage', updateParams);
    }

    removeStorage(updateParams: IParams) {
        return this.post<any>('/ec2/removeStorage', updateParams);
    }

    updateStorages(updateParams: IParams) {
        return this.post<any>('/ec2/saveStorages', updateParams);
    }

    rebuildArchive(type: number, action?: string) {
        let url = `/api/rebuildArchive?mainPool=${type}`;
        if (action) {
            url += `&action=${action}`;
        }
        return this.get(url);
    }

    checkForAnalyticsData() {
        const queryParams = {
            startTime : 0,
            endTime   : Number.MAX_SAFE_INTEGER,
            limit     : 1
        };
        return this.get('/ec2/analyticsLookupObjectTracks', queryParams);
    }

    // End of storage

    getRecordStats() {
        return this.get('/api/recStats');
    }

    changePort(port: number) {
        return this.configureServer({ port }).catch(err => Promise.reject(err));
    }

    renameServer(serverId: string, serverName: string) {
        return this.post<t.ChangedIdReturned>('/ec2/saveMediaServerUserAttributes', { serverId, serverName }).toPromise();
    }

    saveServerUserSettings(serverId: string, param: { [key: string]: string }) {
        const [key, value] = Object.entries(param)[0];
        return this.post<t.ChangedIdReturned>('/ec2/saveMediaServerUserAttributes', { serverId, [key]: value }).toPromise();
    }

    saveCameraUserSettings(cameraId: string, param: { [key: string]: string }) {
        const [key, value] = Object.entries(param)[0];
        return this.post<t.ChangedIdReturned>('/ec2/saveCameraUserAttributes', { cameraId, [key]: value }).toPromise();
    }

    restartServer() {
        return this.post<t.RestartServer>('/api/restart').toPromise()
            .catch(err => Promise.reject(err));
    }

    getModuleInfo() {
        return this.get<t.ModuleInformation>('/api/moduleInformation');
    }

    detachFromSystem(currentPassword: string) {
        return this.post<t.NormalResponse>('/api/detachFromSystem', { currentPassword });
    }

    // will put in response type when we start using
    removeMediaserver(serverId: string) {
        return this.post('/ec2/removeResource', { id: serverId });
    }

    restoreFactorySettings(currentPassword: string) {
        return this.post('/api/restoreState', { currentPassword });
    }

    getHardwareIdsOfServers() {
        return this.get('/ec2/getHardwareIdsOfServers');
    }

    getLicenses() {
        return this.getRequestAggregator(['ec2/getLicenses', 'ec2/getHardwareIdsOfServers'])
            .pipe(map(({ reply }: any) => {
                return ({
                    licenses : reply['ec2/getLicenses'],
                    hwids    : reply['ec2/getHardwareIdsOfServers'].reply[0].hardwareIds
                });
            }));
    }

    activateLicense(key) {
        const params: any = { key }; // 3.2 systems expect key as param
        return this.post('/api/activateLicense', { licenseKey: key }, params);
    }

    logLevel(logId?: string, name?: string, value?: string) {
        const params: { id: string, name: string, value: string } = { id: logId, name, value };
        Object.keys(params).forEach((key) => {
            if (params[key] === undefined) {
                delete params[key];
            }
        });
        return this.get<t.LogLevel>('/api/logLevel', params);
    }

    /* End of Server settings */

    /* Working with users */
    getAggregatedUsersData() {
        const routes = ['ec2/getUsers', 'ec2/getPredefinedRoles', 'ec2/getUserRoles', 'ec2/getAccessRights'];
        return this.getRequestAggregator<t.AggregatedUsers>(routes);
    }

    saveUser(user: NxSystemUser) {
        return this.post<t.ChangedIdReturned>('/ec2/saveUser', this.cleanUserObject(user));
    }

    deleteUser(userId: string) {
        return this.post<t.ChangedIdReturned>('/ec2/removeUser', { id: userId });
    }

    isEmptyId(id: string) {
        return !id || id === this.emptyId;
    }

    cleanUserObject(user: NxSystemUser): Partial<NxSystemUser> { // Remove unnecessary fields from the object
        const cleanedUser: Partial<NxSystemUser> = {};
        if (user.id) {
            cleanedUser.id = user.id;
        }
        const supportedFields = ['email', 'name', 'fullName', 'userId', 'userRoleId', 'permissions', 'isCloud', 'isEnabled', 'password'];
        supportedFields.forEach((field: string) => {
            if (field in user) {
                cleanedUser[field] = user[field];
            }
        });
        if (!cleanedUser.userRoleId) {
            cleanedUser.userRoleId = this.emptyId;
        }
        cleanedUser.email = cleanedUser.email.toLowerCase();
        cleanedUser.name = cleanedUser.name.toLowerCase();
        return cleanedUser;
    }

    userObject(fullName: string, email: string): User {
        return {
            canBeEdited  : true,
            canBeDeleted : true,
            email,
            id           : '',
            isCloud      : true,
            isEnabled    : true,
            userRoleId   : this.emptyId,
            permissions  : '',
            // TODO: Remove the trash below after #VMS-2968
            name         : email,
            fullName
        };
    }

    /* End of Working with users */
    /* Cameras and Servers */
    getCameras(id?: string) {
        const params = id ? { id: this.cleanId(id) } : {};
        return this.get<t.GetCameras>('/ec2/getCamerasEx', params);
    }

    getCamerasWithSeverTime(): Observable<any> {
        return this.getRequestAggregator<t.NormalResponse<[t.SystemTime, t.GetCameras]>>(['ec2/getTimeOfServers', 'ec2/getCamerasEx'])
            .pipe(map(({ reply }) => {
                return ([reply['ec2/getTimeOfServers'].reply, reply['ec2/getCamerasEx']]);
            }));
    }

    setResourceParams(params: ResourceParam[]) {
        return this.post<t.EmptyObjectReturned>('/ec2/setResourceParams', params);
    }

    updateRecordingSettings({ id: cameraId, name: cameraName, ...params }: Partial<ICamera>) {
        return this.post<t.ChangedIdReturned>('/ec2/saveCameraUserAttributes', { cameraName, cameraId, ...params });
    }

    getMediaServers(id?: string, url?: string) {
        const params = id ? { id: this.cleanId(id) } : {};
        if (url) {
            return this.http.get<t.GetMediaServers>(`${url}/ec2/getMediaServersEx`, { params });
        } else {
            return this.get<t.GetMediaServers>('/ec2/getMediaServersEx', params);
        }
    }

    getMediaServersAndCameras() {
        const routes = ['/ec2/getMediaServersEx', 'ec2/getCamerasEx'];
        return this.getRequestAggregator<t.NormalResponse<[t.GetMediaServers, t.GetCameras]>>(routes);
    }

    getResourceTypes() {
        return this.get<t.GetResourceTypes>('/ec2/getResourceTypes');
    }

    updateSystemServersCameras() {
        const routes = ['/api/moduleInformation', '/ec2/getMediaServersEx', 'ec2/getTimeOfServers', 'ec2/getCamerasEx'];
        return this.getRequestAggregator<t.NormalResponse<[t.ModuleInformation, t.GetMediaServers, t.SystemTime, t.GetCameras]>>(routes)
            .pipe(map(({ reply }) => {
                return routes.map(route => {
                    if (['/api/moduleInformation', 'ec2/getTimeOfServers'].includes(route)) {
                        return reply[route].reply;
                    }
                    return reply[route];
                });
            }));
    }

    /* End of Cameras and Servers */

    /* Formatting urls */
    previewUrl(cameraId: string, time?: number, width?: number, height?: number, rotate?: number) {
        const data: {
            cameraId: string,
            time?: number | string,
            width?: number,
            height?: number,
            rotate?: number,
            auth?: string
        } = {
            cameraId: this.cleanId(cameraId)
        };
        let endpoint    = '/ec2/cameraThumbnail';

        if (time) {
            data.time = time;
        } else {
            endpoint += '?ignoreExternalArchive';
            data.time = 'LATEST';
        }

        if (width) {
            data.width = width;
        }

        if (height) {
            data.height = height;
        }

        if (rotate !== null) {
            data.rotate = rotate;
        }

        if (this.systemId) {
            data.auth = this.authGet;
        }
        return this.generateGetUrl(endpoint, data);
    }

    hlsUrl(cameraId: string, position: string, resolution: string) {
        const data: {
            pos?: string,
            auth: string
        } = {
            auth: this.authGet
        };
        if (position) {
            data.pos = position;
        }
        const url = `/hls/${this.cleanId(cameraId)}.m3u8?${resolution}`;
        return this.generateGetUrl(url, data, true);
    }

    webmUrl(cameraId: string, position: string, resolution: string, force: boolean) {
        const data: {
            auth: string,
            resolution: string,
            pos?: string
        } = {
            auth: this.authGet,
            resolution
        };
        if (position) {
            data.pos = position;
        }
        const url = `/media/${this.cleanId(cameraId)}.webm?rt`;
        return this.generateGetUrl(url, data, force);
    }

    /* End of formatting urls */

    /* Working with archive */
    getRecords(cameraId: string, startTime: number, endTime: number, detail: number, limit: number, label: string, periodsType: number) {
        const date = new Date();
        if (typeof (startTime) === 'undefined') {
            startTime = date.getTime() - 30 * 24 * 60 * 60 * 1000;
        }
        if (typeof (endTime) === 'undefined') {
            endTime = date.getTime() + 100 * 1000;
        }
        if (typeof (detail) === 'undefined') {
            detail = (endTime - startTime) / 1000;
        }

        if (typeof (periodsType) === 'undefined') {
            periodsType = 0;
        }
        const params: IParams = {
            cameraId: this.cleanId(cameraId),
            detail,
            endTime,
            periodsType,
            startTime
        };
        if (limit) {
            params.limit = limit;
        }
        // RecordedTimePeriods
        return this.get(`/ec2/recordedTimePeriods?flat&keepSmallChunks&${label || ''}`, params);
    }

    /* End of Working with archive */

    setCameraPath(cameraId: string) {
        let systemLink = '';
        const route    = this.location.path().indexOf('/embed') === 0 ? '/embed/' : '';

        if (this.systemId) {
            if (route !== '') {
                systemLink = route + this.systemId;
            } else {
                systemLink = `/systems/${this.systemId}`;
            }
        }
        // @ts-ignore: TODO Expected 0-1 arguments, but got 2
        this.location.path(`${systemLink}/view/${this.cleanId(cameraId)}`, false);
    }

    /* Health Monitor */
    getHealthManifest() {
        return this.get<t.Manifests>('/ec2/metrics/manifest');
    }

    getHealthValues() {
        return this.get<t.Values>('/ec2/metrics/values');
        // return this.http.get<AddResponseTypeHere>('/getdata');
    }

    getHealthAlarms() {
        return this.get<t.Alarms>('/ec2/metrics/alarms');
    }

    getAggregateHealthReport(forceUpdate = false) {
        const endpoint = '/api/aggregator?exec_cmd=ec2%2Fmetrics%2Fmanifest&exec_cmd=ec2%2Fmetrics%2Fvalues&exec_cmd=ec2%2Fmetrics%2Falarms';
        const headers = {};
        const secondsSinceUpdate = (Date.now() - (this.healthService.lastUpdate)) / 1000 | 0;
        const stale = secondsSinceUpdate > this.CONFIG.cloudCapabilities.healthMonitorCacheTimeout;
        if (forceUpdate || !this.cacheService.addedToCache(`${this.urlBase}${endpoint}`) || stale) {
            this.cacheService.addToCache(`${this.urlBase}${endpoint}`);
            this.healthService.lastUpdate = Date.now();
            headers['reset-cache'] = 'reset';
        }

        return this.get(endpoint, {}, headers);
    }
    // End of Health Monitor

    // <added by @gbezyuk for watch component>
    public checkCameraThumbnail(camera_id, width = 70, height = 40) {
        // it expects JSON yet normally gets JPG, thus rejects,
        // let's override to make it more meaningful (@gbezyuk)
        const _checker = response => {
            if (!response || response.status !== 200) {
                return Promise.reject(response);
            } else {
                return Promise.resolve(response);
            }
        };
        return this.get(`/ec2/cameraThumbnail?cameraId=${camera_id}&width=${width}&height=${height}`)
            .toPromise().then(_checker).catch(_checker);
    }

    public getCameraThumbnailUrl(cameraId, width = 68, height = 38) {
        return `${this.urlBase}/ec2/cameraThumbnail?cameraId=${cameraId}&width=${width}&height=${height}&auth=${this.authGet}`;
    }

    getLiveHlsUrl(cameraId, resolution = 'lo') {
        return `${this.getUrlBase()}/hls/${this.cleanId(cameraId)}.m3u8?${resolution}&auth=${this.authGet}`;
    }

    getHlsUrl(cameraId, position, resolution = 'lo') {
        return `${this.getUrlBase()}/hls/${this.cleanId(cameraId)}.m3u8?${resolution}&auth=${this.authGet}&pos=${Math.floor(position)}`;
    }
    // </added by @gbezyuk for watch component>

    /** Merge Systems */
    getPeerSystems(showAddresses = true) {
        return this.get<t.DiscoveredPeers>('/api/discoveredPeers', { showAddresses });
    }

    mergeSystems(url: string, dryRun: string, currentPassword?: string) {
        const data = {
            url,
            currentPassword,
            takeRemoteSettings: false,
            dryRun
        };
        return this.post<t.MergeSystems>('/api/mergeSystems', data);
    }

    checkMergeStatus() {
        return this.get<t.MergeStatus>('/ec2/mergeStatus');
    }

    getDigestKeys(adminPassword: string) {
        return this.get('/api/getNonce').toPromise().then(({ nonce, realm }) => {
            const digest = md5(`admin:${realm}:${adminPassword}`);
            const postSimplified = md5(`${digest}:${nonce}:${md5('POST:')}`);
            const getSimplified = md5(`${digest}:${nonce}:${md5('GET:')}`);
            const postKey = btoa(`admin:${nonce}:${postSimplified}`);
            const getKey = btoa(`admin:${nonce}:${getSimplified}`);
            return { getKey, postKey };
        });
    }

    deprecatedMergeSystems(url: string, currentPassword: string, adminPassword: string) {
        return this.getDigestKeys(adminPassword)
            .then(({ getKey, postKey }) => {
                const data = {
                    getKey,
                    postKey,
                    currentPassword,
                    takeRemoteSettings: false,
                    url
                };
                return this.post('/api/mergeSystems', data).toPromise();
            });
    }

    renameSystem(_, systemName: string) {
        return this.get('/api/systemSettings', { systemName }).toPromise();
    }
}

@Injectable({
    providedIn: 'root'
})
export class NxSystemAPIService {
    CONFIG: IConfig;
    systemConnections: { [serverId: string]: NxSystemAPI };

    constructor(
        configService: NxConfigService,
        private location: Location,
        private http: HttpClient,
        private cacheService: NxUriCacheService,
        private cookieService: CookieService,
        private healthService: NxHealthService,
        private appState: NxAppStateService
    ) {
        this.CONFIG = configService.getConfig();
        this.systemConnections = {};
    }

    createConnection(user: string,
        systemId: string,
        serverId: string,
        unauthorizedCallback: (params?: IParams) => any
    ) {
        // const sysServe = `${systemId}+${serverId}`;
        // if (systemId && serverId && sysServe in this.systemConnections) {
        //     return this.systemConnections[sysServe];
        // } else if (systemId in this.systemConnections) {
        //     return this.systemConnections[systemId];
        // } else if (serverId in this.systemConnections) {
        //     return this.systemConnections[serverId];
        // } else {
        //     const mediaserverConnection = new NxSystemAPI(this.http, this.CONFIG, this.location, user, systemId, serverId, unauthorizedCallback);
        //     this.systemConnections[sysServe]
        // }
        return new NxSystemAPI(this.http, this.CONFIG, this.location, user, systemId, serverId, unauthorizedCallback, this.cacheService, this.cookieService, this.healthService, this.appState);
    }
}

export interface ResourceParam {
    value: string;
    name: string;
    resourceId?: string;
}
