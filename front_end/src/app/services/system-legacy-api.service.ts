import { Location } from '@angular/common';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import md5 from 'md5';
import { CookieService } from 'ngx-cookie-service';
import { from, of, throwError, Observable } from 'rxjs';
import {
    flatMap,
    map,
    mergeMap,
    retryWhen,
    timeout,
    tap
} from 'rxjs/operators';

import { environment } from '@environments/environment';
import type { APIDoc } from '@pages/api-tool/api-tool-types';
import { NxHealthService } from '@pages/health/health.service';

import { Account } from './account.service/account';
import { NxAppStateService } from './nx-app-state.service';
import type { APIDocType, MenuManifest } from './nx-config/base-config';
import type { IConfig } from './nx-config/config-types';
import * as t from './system-api.types';
import { User } from './system-api.types';
import type {
    ICamera
} from './system.service/camera-manager/camera-manager-types';
import type {
    NxSystemUser
} from './system.service/user-manager/user-manager-types';
import { NxUriCacheService } from './uri-cache.service';

interface IParams<Value = any> {
    [key: string]: Value;
}

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
    authPost: string;
    protected authPlay: string;
    readonly version: number;
    protected readonly emptyId = '{00000000-0000-0000-0000-000000000000}';
    protected readonly forbiddenMsg = 'Using legacy API calls for owner actions are forbidden.';
    private readonly notImplementedMsg = 'Not implemented in the legacy api.';
    public readonly requiresPassword: boolean = true;

    protected CONFIG: IConfig;
    protected http: HttpClient;
    protected location: Location;

    protected serverId: string;
    protected systemId: string;
    protected currentUser: any;
    protected userEmail: string;
    protected userRequest: Promise<t.NormalResponse<User>>;
    urlBase: string;
    unauthorizedCallback: (params: unknown) => Promise<any>;
    cacheService: NxUriCacheService;
    cookieService: CookieService;
    healthService: NxHealthService;
    appState: NxAppStateService;

    constructor(
        http: HttpClient,
        configService: IConfig,
        location: Location,
        userEmail: string,
        systemId: string,
        serverId: string,
        unauthorizedCallback: (params: IParams) => Promise<any>,
        cacheService: NxUriCacheService,
        cookieService: CookieService,
        healthService: NxHealthService,
        appState: NxAppStateService
    ) {
        this.version = 0;
        this.http = http;
        this.CONFIG = configService;
        this.location = location;
        this.cacheService = cacheService;
        this.cookieService = cookieService;
        this.healthService = healthService;
        this.appState = appState;
        this.init(userEmail, systemId, serverId, unauthorizedCallback);

        // This is to make it easy to access the systemService from the console for testing,
        // uncomment to add systemService to global context.
        // @ ts-expect-error
        // window.systemService = this;
        // console.log('systemService added to window');
        // console.log('to test system system api method just access the systemService from console');
        // console.log('ex. > systemService.login(\'admin\', \'qweasd1234\'');
    }

    public get isSessionOauth() {
        return false;
    }

    public setAccessTokenAsCookie(): void {
        throw new Error(this.notImplementedMsg);
    }

    protected cookieLogin(auth, remember = false, maxAge = 365) {
        return this.post('/api/cookieLogin', { auth }).pipe(
            tap(() => {
                const cookie = 'x-runtime-guid';
                if (remember) {
                    this.cookieService.set(
                        cookie,
                        this.cookieService.get(cookie),
                        maxAge
                    );
                }
            })
        );
    }

    protected digest(
        login: string,
        password: string,
        realm: string,
        nonce: string,
        method?: string
    ) {
        method = md5(`${method || 'GET'}:`);
        const digest = md5(`${login}:${realm}:${password}`);
        const authDigest = md5(`${digest}:${nonce}:${method}`);
        return btoa(`${login}:${nonce}:${authDigest}`);
    }

    protected getUrlBase(protocol = window.location.protocol) {
        let urlBase = '';
        if (this.systemId) {
            urlBase =
                protocol +
                '//' +
                this.CONFIG.trafficRelayHost
                    .replace('{host}', window.location.host)
                    .replace('{systemId}', this.systemId);
        }
        return urlBase;
    }

    generateHeaders() {
        return false;
    }

    protected generateGetUrl(url: string, data: IParams, absUrl?: boolean) {
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
        return `${url}${url.includes('?') ? '&' : '?'}${params}`;
    }

    protected get<ResponseType = any>(
        url: string,
        params?: any,
        customHttpHeaders: IParams<string> = {},
        requestTimeout = 60000
    ) {
        let headers = new HttpHeaders();
        params = params || {};

        if (!environment.isLocal && this.authGet) {
            params.auth = this.authGet;
        }

        if (environment.isLocal) {
            headers = headers.set(
                'X-Runtime-Guid',
                this.cookieService.get('x-runtime-guid')
            );
            headers = headers.set(
                'X-CSRFToken',
                this.cookieService.get('x-runtime-guid')
            );
        }
        if (this.serverId) {
            headers = headers.set('X-Server-Guid', this.serverId);
        }

        Object.entries(customHttpHeaders).forEach(entry => {
            headers = headers.set(...entry);
        });
        const fullUrl = `${this.urlBase}${url}`;
        const responseType = <any>(customHttpHeaders?.responseType || 'json');
        return this.http
            .get<ResponseType>(fullUrl, { headers, params, responseType })
            .pipe(
                retryWhen(request => this.retryHandler(request)),
                timeout(requestTimeout),
                tap(undefined, error => {
                    // 'Gateway Timeout' is added for 'local' testing of webadmin
                    if (
                        environment.isLocal && (error.name === 'TimeoutError' ||
                            error.statusText === 'Gateway Timeout')
                    ) {
                        this.appState.systemAvailable$.next(false);
                    }
                })
            );
    }

    protected post<ResponseType = any>(
        url: string,
        data?: any,
        paramsToAdd = {},
        customTimeout = 60000
    ) {
        let headers = new HttpHeaders();
        let params = new HttpParams();
        const fullUrl = `${this.urlBase}${url}`;
        data = data || {};

        Object.keys(paramsToAdd).forEach(key => {
            params = params.append(key, paramsToAdd[key]);
        });

        if (!environment.isLocal && this.authPost) {
            params = params.append('auth', this.authPost);
        }
        if (this.serverId) {
            headers = headers.set('X-Server-Guid', this.serverId);
        }
        if (environment.isLocal) {
            headers = headers.set(
                'X-Runtime-Guid',
                this.cookieService.get('x-runtime-guid')
            );
        }
        return this.http
            .post<ResponseType>(fullUrl, data, { params, headers })
            .pipe(
                retryWhen(request => this.retryHandler(request)),
                timeout(customTimeout)
            );
    }

    // TODO: Need to figure out how to type this
    protected retryHandler(request) {
        return request.pipe(
            mergeMap(
                (
                    error: { status: number; resultCode: string },
                    attempt: number
                ) => {
                    if (attempt === 0) {
                        if (
                            error.status === 401 ||
                            error.status === 403 ||
                            error.resultCode === 'forbidden'
                        ) {
                            return from(this.unauthorizedCallback(error));
                        } else if (error.status === 503) {
                            // Repeat the request once again for 503 error
                            return of('');
                        }
                    }
                    return throwError(error);
                }
            )
        );
    }

    protected getRequestAggregator<AggregatedType>(requests: string[]) {
        const concatRequests = encodeURI(
            requests
                .map(request => {
                    return `exec_cmd=${request}`;
                })
                .join('&')
        ).replace('/', '%2F');
        const url = `/api/aggregator?${concatRequests}`;
        return this.get<AggregatedType>(url);
    }

    init(
        userEmail: string,
        systemId: string,
        serverId: string,
        unauthorizedCallback: (params: IParams) => Promise<any>
    ): void {
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

    /* Authentication */
    getAuthKeys() {
        const { authGet, authPost, authPlay } = this;
        return { authGet, authPost, authPlay };
    }

    public isSessionFresh(): Observable<any> {
        throw Error(this.notImplementedMsg);
    }

    public getCurrentUser(forceReload?: boolean) {
        let customHeaders;
        if (forceReload) {
            // Clean cache to
            this.currentUser = undefined;
            this.userRequest = undefined;
            customHeaders = { 'reset-cache': 'reset' };
        }
        if (this.currentUser) {
            // We have user - return him right away
            return Promise.resolve(this.currentUser);
        }
        if (this.userRequest) {
            // Currently requesting user
            return this.userRequest;
        }
        if (this.userEmail) {
            // Cloud portal mode - getCurrentUser is not working
            const endpoint = '/ec2/getUsers';
            this.cacheService.addToCache(endpoint);
            this.userRequest = this.get<Promise<t.NormalResponse<User>>>(
                endpoint,
                {},
                customHeaders
            )
                .toPromise()
                .then((result: any) => {
                    this.currentUser = result.find((user: User) => {
                        return (
                            user.name.toLowerCase() ===
                            this.userEmail.toLowerCase()
                        );
                    });
                    return this.currentUser;
                });
        } else {
            // Local system mode ???
            const endpoint = '/api/getCurrentUser';
            this.cacheService.addToCache(endpoint);
            this.userRequest = this.get<t.NormalResponse<User>>(
                endpoint,
                {},
                customHeaders
            )
                .toPromise()
                .then(result => {
                    this.currentUser = result;
                    return this.currentUser;
                });
        }
        this.userRequest.finally(() => {
            this.userRequest = undefined; // Clear cache in case of errors
        });
        return this.userRequest;
    }

    public getCurrentServerInfo(): Observable<any> {
        throw Error(this.notImplementedMsg);
    }

    public checkIfConnectedToServer(serverId: string): Observable<boolean> {
        throw Error(this.notImplementedMsg);
    }

    protected getNonce(login: string, url?: string) {
        const params: any = {
            userName: login
        };
        if (url) {
            if (!url.includes('http')) {
                url = 'http://' + url;
            }
            params.url = url;
        }
        const nonceType = url ? 'getRemoteNonce' : 'getNonce';
        return this.get(`/api/${nonceType}`, params);
    }

    protected getRolePermissions(roleId: string) {
        return this.get('/ec2/getUserRoles', { id: roleId });
    }

    getApiDoc(type: APIDocType) {
        if (type === 'main') {
            return this.get<APIDoc>('/static/openapi_legacy.json').toPromise();
        }
    }

    fetchApiToolJSON(route: string) {
        return this.get<APIDoc>(`/static/${route}`).toPromise();
    }

    getAPIToolManifest(): Promise<MenuManifest> {
        return Promise.resolve(this.CONFIG.apiTool.legacyManifest);
    }

    public getApiPreamble(): void {
        throw Error(this.notImplementedMsg);
    }

    public getApiChangelog(): void {
        throw Error(this.notImplementedMsg);
    }

    login(
        login: string,
        password: string,
        remember = false
    ): Observable<{ data: { account: Account; resultCode: string } } | any> {
        let auth, authPost, authRtsp, nonce, realm;
        login = login.toLowerCase();
        return this.getNonce(login).pipe(
            flatMap((response: any) => {
                nonce = response.reply.nonce;
                realm = response.reply.realm;
                auth = this.digest(login, password, realm, nonce);
                authPost = this.digest(login, password, realm, nonce, 'POST');
                authRtsp = this.digest(login, password, realm, nonce, 'PLAY');
                return this.cookieLogin(auth, remember);
            }),
            flatMap((data: any) => {
                if (data.error !== '0') {
                    this.cookieService.delete('x-runtime-guid');
                    return Promise.reject(data.data || data);
                }
                this.setAuthKeys(auth, authPost, authRtsp);
                return of(data.reply);
            })
        );
    }

    loginToken(username: string, password: string, remember: boolean): Observable<any> {
        throw Error(this.notImplementedMsg);
    }

    loginTokenUrl(token: string): Observable<any> {
        throw Error(this.notImplementedMsg);
    }

    loginOauth(code: string, skipSetting?: boolean): Observable<any> {
        throw Error(this.notImplementedMsg);
    }

    logout() {
        return this.post('/api/cookieLogout')
            .pipe(
                tap(() => {
                    this.cookieService.delete('x-runtime-guid');
                })
            )
            .toPromise();
    }

    logUrl(params: { name?: string; lines?: number }) {
        return this.get<string>(
            '/api/showLog',
            { ...params },
            { 'Content-Type': 'text', responseType: 'text' }
        ).toPromise();
    }

    getScripts() {
        return this.get('/api/scriptList').toPromise();
    }

    execute(script: string, mode: string = '') {
        return this.post(`/api/execute${script}?${mode}`);
    }

    getSystemSettings() {
        return this.get<t.Params[]>('/ec2/getSettings')
            .toPromise()
            .then(params => {
                return new t.SystemConfigSettings(params);
            });
    }

    async getSystemCloudInfo() {
        const {
            cloudSystemID,
            cloudAccountName
        } = await this.getSystemSettings();
        return { cloudSystemID, cloudAccountName };
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
            systemSettings: Object.entries(
                systemSettings
            ).map(([name, value]) => ({ name, value }))
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
            systemSettings: Object.entries(
                systemSettings
            ).map(([name, value]) => ({ name, value }))
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
        return this.getNonce(remoteLogin, url)
            .toPromise()
            .then((res: any) => {
                if (res.data.error !== '0') {
                    return Promise.reject(res);
                }
                const {
                    data: {
                        reply: { realm, nonce }
                    }
                } = res;
                const getKey = this.digest(
                    remoteLogin,
                    remotePassword,
                    realm,
                    nonce,
                    'GET'
                );

                if (!url.startsWith('http')) {
                    url = 'http://' + url;
                }

                return this.get('/api/pingSystem', { getKey, url }).toPromise();
            });
    }

    getStatistics() {
        return this.get('/api/statistics', { salt: Date.now() });
    }

    /**
        @deprecated
     */
    saveCloudSystemCredentials(
        cloudSystemID: string,
        cloudAuthKey: string,
        cloudAccountName: string
    ): void {
        throw Error(this.forbiddenMsg);
    }

    checkInternet(reload = true) {
        return this.getModuleInfo()
            .toPromise()
            .then(res => res.reply.serverFlags.includes('SF_HasPublicIP'));
    }

    checkLocalIfNew(reload = true) {
        return environment.isLocal
            ? Promise.resolve({})
            : this.getModuleInfo().toPromise();
    }

    createEvent(params: t.EventParams) {
        return this.get('/api/createEvent', params).toPromise();
    }

    getEvents(
        from: number,
        to: number,
        cameraId?: string,
        eventType?: t.EventTypes,
        actionType?: t.ActionTypes,
        eventRuleId?: string
    ) {
        // eslint-disable-next-line camelcase
        const [event_type, action_type, brule_id] = [
            eventType,
            actionType,
            eventRuleId
        ];
        return this.get('/api/getEvents', {
            from,
            to,
            cameraId,
            event_type,
            action_type,
            brule_id
        }).toPromise();
    }

    /**
     * @deprecated remove method once support for 4.2 systems is dropped.
     */
    backupControl(action?: 'start' | 'stop') {
        return this.get('/api/backupControl', action && { action }).toPromise();
    }

    cameraDiagnostic(cameraId: string, type: t.CameraDiagnosticSteps) {
        return this.get('/api/doCameraDiagnosticsStep', {
            cameraId,
            type
        }).toPromise();
    }

    getServerNetworkSettings() {
        return this.get<t.NormalResponse<t.ServerNetworkSettings>>(
            '/api/iflist'
        ).toPromise();
    }

    setServerNetworkSettings(networkSettings: t.ServerNetworkSettings) {
        return this.post('/api/ifconfig', networkSettings).toPromise();
    }

    setAuthKeys(authGet: string, authPost: string, authPlay: string): void {
        this.authGet = authGet;
        this.authPost = authPost;
        this.authPlay = authPlay;
    }

    /* End of Authentication  */

    /* Server settings */
    public getServerTimes(): Observable<t.NormalResponse<t.ServerTime[]>> {
        return this.get<t.NormalResponse<t.ServerTime[]>>('/ec2/getTimeOfServers', '', {});
    }

    protected getSystemTime() {
        return this.get<t.SystemTime>('/api/synchronizedTime');
    }

    public updateOrGetSettings(updateParams: Partial<t.Settings>) {
        return this.get<t.NormalResponse<t.SystemSettings>>(
            '/api/systemSettings',
            updateParams
        );
    }

    /**
     * Start of Storage
     */
    public getStoragesInfo(queryParams?) {
        return this.get<t.GetStorages[]>('/ec2/getStorages', queryParams);
    }

    public getStorageAnalytics() {
        const analyticsEndpoint = '/ec2/analyticsLookupObjectTracks?limit=1';
        const getCamerasEndpoint = `/ec2/getCamerasEx?id=${this.serverId}`;
        const getServerEndpoint = '/ec2/getMediaServersEx';
        return this.getRequestAggregator([
            analyticsEndpoint,
            getCamerasEndpoint,
            getServerEndpoint
        ]).pipe(
            map(({ reply }: any) => {
                return {
                    hasAnalyticsData: !!reply[analyticsEndpoint]?.length,
                    hasPlugins: reply[getCamerasEndpoint]?.reduce(
                        (hasPlugins, { addParams, parentId }) =>
                            hasPlugins ||
                            addParams.find(
                                ({ name }) =>
                                    name === 'compatibleAnalyticsEngines' &&
                                    parentId === this.serverId
                            )?.value !== '[]',
                        false
                    ),
                    metadataStorageId: reply[getServerEndpoint]
                        .find(({ id }) => id === this.serverId)
                        ?.addParams?.find(
                            ({ name }) => name === 'metadataStorageId'
                        )?.value
                };
            })
        );
    }

    public getStorages(useCache = false, customTimeout = 8000) {
        return this.get<t.NormalResponse<any>>(
            '/api/storageSpace',
            undefined,
            { [useCache ? 'cache-request' : 'reset-cache']: 'true' },
            customTimeout
        );
    }

    public getStorageStatus(queryParams) {
        return this.get<t.NormalResponse<any>>(
            '/api/storageStatus',
            queryParams,
            {},
            60000
        );
    }

    saveStorage(updateParams: IParams) {
        return this.post<any>('/ec2/saveStorage', updateParams, {}, 60000);
    }

    removeStorage(updateParams: IParams) {
        return this.post<any>('/ec2/removeStorage', updateParams);
    }

    updateStorages(updateParams: IParams, customTimeout = 8000) {
        return this.post<any>(
            '/ec2/saveStorages',
            updateParams,
            {},
            customTimeout
        );
    }

    rebuildArchive(
        type: number,
        action?: string
    ): Observable<t.RebuildArchiveResponse> {
        let url = `/api/rebuildArchive?mainPool=${type}`;
        if (action) {
            url += `&action=${action}`;
        }
        return this.get(url);
    }

    checkForAnalyticsData() {
        const queryParams = {
            startTime: 0,
            endTime: Number.MAX_SAFE_INTEGER,
            limit: 1
        };
        return this.get('/ec2/analyticsLookupObjectTracks', queryParams);
    }

    // End of storage

    getCameraHistoryItems() {
        return this.get('/ec2/getCameraHistoryItems');
    }

    getServerStats(useCache = false) {
        return this.get<t.NormalResponse<any>>(
            '/api/metrics/values',
            undefined,
            { [useCache ? 'cache-request' : 'reset-cache']: 'true' }
        );
    }

    changePort(port: number) {
        return this.configureServer({ port }).catch(err =>
            Promise.reject(err)
        );
    }

    renameServer(serverId: string, serverName: string) {
        return this.post<t.ChangedIdReturned>(
            '/ec2/saveMediaServerUserAttributes',
            { serverId, serverName }
        ).toPromise();
    }

    saveServerUserSettings(serverId: string, param: { [key: string]: string }) {
        const [key, value] = Object.entries(param)[0];
        return this.post<t.ChangedIdReturned>(
            '/ec2/saveMediaServerUserAttributes',
            { serverId, [key]: value }
        ).toPromise();
    }

    getAnalyticsEngines() {
        return this.get('/ec2/getAnalyticsEngines');
    }

    saveCameraUserSettings(cameraId: string, param: { [key: string]: string }) {
        const [key, value] = Object.entries(param)[0];
        return this.post<t.ChangedIdReturned>('/ec2/saveCameraUserAttributes', {
            cameraId,
            [key]: value
        }).toPromise();
    }

    restartServer(serverId?: string) {
        return this.post<t.RestartServer>('/api/restart')
            .toPromise()
            .catch(err => Promise.reject(err));
    }

    getModuleInfo(): Observable<t.ModuleInformation> {
        return this.get('/api/moduleInformation');
    }

    getModuleInfoUsingUrl(url: string): Observable<t.ModuleInformation> {
        return this.http.get<t.ModuleInformation>(
            `${url}/api/moduleInformation`
        );
    }

    detachFromSystem(currentPassword: string, serverId?: string) {
        return this.post<t.NormalResponse<any>>('/api/detachFromSystem', {
            currentPassword
        });
    }

    // will put in response type when we start using
    removeResource(id: string) {
        return this.post('/ec2/removeResource', { id });
    }

    restoreFactorySettings(currentPassword: string, serverId?: string) {
        return this.post('/api/restoreState', { currentPassword });
    }

    getHardwareIdsOfServers() {
        return this.get('/ec2/getHardwareIdsOfServers');
    }

    getLicenses() {
        return this.getRequestAggregator([
            'ec2/getLicenses',
            'ec2/getHardwareIdsOfServers'
        ]).pipe(
            map(({ reply }: any) => {
                return {
                    licenses: reply['ec2/getLicenses'],
                    hwids:
                        reply['ec2/getHardwareIdsOfServers'].reply
                            .reduce((ids: any[], { hardwareIds }) => {
                                ids.push(...hardwareIds);
                                return ids;
                            }, [])
                };
            })
        );
    }

    activateLicense(key) {
        const params: any = { key }; // 3.2 systems expect key as param
        return this.post('/api/activateLicense', { licenseKey: key }, params);
    }

    logLevel(
        logId?: string,
        name?: string,
        value?: string
    ): Observable<t.LogLevel> {
        const params = { id: logId, name, value };
        Object.keys(params).forEach(key => {
            if (params[key] === undefined) {
                delete params[key];
            }
        });
        return this.get('/api/logLevel', params);
    }

    /* End of Server settings */

    /* Working with users */
    getAggregatedUsersData() {
        const routes = [
            'ec2/getUsers',
            'ec2/getPredefinedRoles',
            'ec2/getUserRoles',
            'ec2/getAccessRights'
        ];
        return this.getRequestAggregator<t.AggregatedUsers>(routes);
    }

    saveUser(user: NxSystemUser) {
        return this.post<t.ChangedIdReturned>(
            '/ec2/saveUser',
            this.cleanUserObject(user)
        );
    }

    deleteUser(userId: string) {
        return this.post<t.ChangedIdReturned>('/ec2/removeUser', {
            id: userId
        });
    }

    isEmptyId(id: string) {
        return !id || id === this.emptyId;
    }

    cleanUserObject(user: NxSystemUser): Partial<NxSystemUser> {
        // Remove unnecessary fields from the object
        const cleanedUser: Partial<NxSystemUser> = {};
        if (user.id) {
            cleanedUser.id = user.id;
        }
        const supportedFields = [
            'email',
            'name',
            'fullName',
            'userId',
            'userRoleId',
            'permissions',
            'isCloud',
            'isEnabled',
            'password'
        ];
        supportedFields.forEach((field: string) => {
            if (field in user) {
                cleanedUser[field] = user[field];
            }
        });
        if (!cleanedUser.userRoleId) {
            cleanedUser.userRoleId = this.emptyId;
        }

        return cleanedUser;
    }

    userObject(fullName: string, email: string): User {
        return {
            canBeEdited: true,
            canBeDeleted: true,
            email,
            id: '',
            isCloud: true,
            isEnabled: true,
            userRoleId: this.emptyId,
            permissions: '',
            // TODO: Remove the trash below after #VMS-2968
            name: email,
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
        return this.getRequestAggregator<
            t.NormalResponse<[t.SystemTime, t.GetCameras]>
        >(['ec2/getTimeOfServers', 'ec2/getCamerasEx']).pipe(
            map(({ reply }) => {
                return [
                    reply['ec2/getTimeOfServers'].reply,
                    reply['ec2/getCamerasEx']
                ];
            })
        );
    }

    setResourceParams(params: t.ResourceParam[]) {
        return this.post<t.EmptyObjectReturned>(
            '/ec2/setResourceParams',
            params
        );
    }

    updateRecordingSettings({
        id: cameraId,
        name: cameraName,
        ...params
    }: Partial<ICamera>) {
        return this.post<t.ChangedIdReturned>('/ec2/saveCameraUserAttributes', {
            cameraName,
            cameraId,
            ...params
        });
    }

    getMediaServers(useCache: boolean) {
        const endpoint = '/ec2/getMediaServersEx';
        return this.get<t.GetMediaServers[]>(
            endpoint,
            {},
            { [useCache ? 'cache-request' : 'reset-cache']: 'true' }
        );
    }

    getMediaServersAndCameras() {
        const routes = ['/ec2/getMediaServersEx', 'ec2/getCamerasEx'];
        return this.getRequestAggregator<
            t.NormalResponse<[t.GetMediaServers, t.GetCameras]>
        >(routes);
    }

    getResourceTypes() {
        return this.get<t.GetResourceTypes>('/ec2/getResourceTypes');
    }

    updateSystemServersCameras() {
        const routes = [
            '/api/moduleInformation',
            '/ec2/getMediaServersEx',
            'ec2/getTimeOfServers',
            'ec2/getCamerasEx'
        ];
        return this.getRequestAggregator<
            t.NormalResponse<
                [
                    t.ModuleInformationReply,
                    t.GetMediaServers,
                    t.SystemTime,
                    t.GetCameras
                ]
            >
        >(routes).pipe(
            map(({ reply }) => {
                return routes.map(route => {
                    if (
                        [
                            '/api/moduleInformation',
                            'ec2/getTimeOfServers'
                        ].includes(route)
                    ) {
                        return reply[route].reply;
                    }
                    return reply[route];
                });
            })
        );
    }

    /* End of Cameras and Servers */

    /* Formatting urls */
    previewUrl(
        cameraId: string,
        time?: number | string,
        width?: number,
        height?: number,
        rotate?: number,
        _auth?: string // For compatibility with rest api signature
    ) {
        const data: {
            cameraId: string;
            time?: number | string;
            width?: number;
            height?: number;
            rotate?: number;
            auth?: string;
        } = {
            cameraId: this.cleanId(cameraId)
        };
        let endpoint = '/ec2/cameraThumbnail';

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

        if (rotate) {
            data.rotate = rotate;
        }

        if (this.version === 0 && this.systemId) {
            data.auth = this.authGet;
        }
        const url = this.generateGetUrl(endpoint, data);
        return this.get(url, undefined, { responseType: 'blob' })
            .pipe(map(blob => blob ? URL.createObjectURL(blob) : undefined));
    }

    hlsUrl(cameraId: string, position: string = 'now', resolution: string = '') {
        const data: {
            pos?: string;
            auth: string;
        } = {
            auth: this.authGet
        };
        if (position) {
            data.pos = position;
        }
        const url = `/web/hls/${this.cleanId(cameraId)}.m3u8?${resolution}`;
        return this.generateGetUrl(url, data);
    }

    webmUrl(
        cameraId: string,
        position: string,
        resolution: string,
        force: boolean
    ) {
        const data: {
            auth: string;
            resolution: string;
            pos?: string;
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

    public getExportUrl({ transport, cameraId, pos, endPos, duration }) {
        cameraId = cameraId?.replace(/{|}/g, '');
        if (!['mp4', 'mkv'].includes(transport)) {
            transport = 'mkv';
        }
        const url = `/web/media/${cameraId}.${transport}`;
        const params = {
            auth: this.authGet,

            pos,
            endPos,
            duration,

            // see VMS-29347
            download: true,
            export: true
        };
        return this.generateGetUrl(url, params);
    }

    /* End of formatting urls */

    /* Working with archive */
    getRecords(
        cameraId: string,
        startTime: number,
        endTime: number,
        detail: number,
        limit: number,
        label: string,
        periodsType: number
    ) {
        const date = new Date();
        if (typeof startTime === 'undefined') {
            startTime = date.getTime() - 30 * 24 * 60 * 60 * 1000;
        }
        if (typeof endTime === 'undefined') {
            endTime = date.getTime() + 100 * 1000;
        }
        if (typeof detail === 'undefined') {
            detail = (endTime - startTime) / 1000;
        }

        if (typeof periodsType === 'undefined') {
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
        return this.get(
            `/ec2/recordedTimePeriods?keepSmallChunks&${label || ''}`,
            params, {});
    }

    /* End of Working with archive */

    setCameraPath(cameraId: string): void {
        let systemLink = '';
        const route =
            this.location.path().startsWith('/embed') ? '/embed/' : '';

        if (this.systemId) {
            if (route !== '') {
                systemLink = route + this.systemId;
            } else {
                systemLink = `/systems/${this.systemId}`;
            }
        }
        this.location.path(
            `${systemLink}/view/${this.cleanId(cameraId)}`,
            // @ts-expect-error: TODO Expected 0-1 arguments, but got 2
            false
        );
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
        const endpoint =
            '/api/aggregator?exec_cmd=ec2%2Fmetrics%2Fmanifest&exec_cmd=ec2%2Fmetrics%2Fvalues&exec_cmd=ec2%2Fmetrics%2Falarms';
        const headers = {};
        const secondsSinceUpdate =
            ((Date.now() - this.healthService.lastUpdate) / 1000) | 0;
        const stale =
            secondsSinceUpdate >
            this.CONFIG.cloudCapabilities.healthMonitorCacheTimeout;
        if (
            forceUpdate ||
            !this.cacheService.addedToCache(`${this.urlBase}${endpoint}`) ||
            stale
        ) {
            this.cacheService.addToCache(`${this.urlBase}${endpoint}`);
            this.healthService.lastUpdate = Date.now();
            headers['reset-cache'] = 'reset';
        }

        return this.get(endpoint, {}, headers);
    }
    // End of Health Monitor

    public getPlaybackUrl(
        cameraId,
        transport = 'webm',
        resolution = 'low',
        position = undefined
    ) {
        let url;
        function hlsResolutionOrEmpty(res) {
            if (res === 'hi' || res === 'lo') {
                return res;
            }
            return '';
        }
        switch (transport) {
            case 'webRtc':
                url = `${this.getUrlBase('wss:')}/webrtc-tracker/?camera_id=${this.cleanId(cameraId)}&`;
                break;
            case 'hls':
                url = `${this.getUrlBase()}/web/hls/${this.cleanId(cameraId)}.m3u8?${hlsResolutionOrEmpty(resolution)}&`;
                break;
            case 'rtsp':
                let urlBase = this.getUrlBase();
                // If we are in webadmin we need to have the origin or else https is not replaced with rtsp.
                if (!urlBase) {
                    urlBase = window.location.origin;
                }
                url = `${urlBase}/${this.cleanId(cameraId)}?stream=${resolution}&`.replace(/https?:\/\//, 'rtsp://');
                break;
            default:
                // Rtsp plays as webm but does not support transcoding.
                if (transport === 'mjpeg') {
                    transport = 'webm';
                }
                url = `${this.getUrlBase()}/web/media/${this.cleanId(cameraId)}.${transport}?resolution=${resolution || ''}&`;
        }

        if (this.authGet) {
            url += `auth=${this.authGet}&`;
        }
        if (position) {
            url += `pos=${position}&`;
        }
        return url;
    }

    /** Merge Systems */
    getPeerSystems(showAddresses = true) {
        return this.get<t.DiscoveredPeers>('/api/discoveredPeers', {
            showAddresses
        });
    }

    getServerInfo(serverId: string): void {
        throw Error(this.notImplementedMsg);
    }

    getRemoteServerInfo(remoteEndpoint: string) {
        return of({});
    }

    mergeSystems(
        url: string,
        targetSystemId: string,
        dryRun: boolean,
        currentPassword?: string,
        takeRemoteSettings = false
    ) {
        const data = {
            url,
            currentPassword,
            takeRemoteSettings,
            dryRun
        };
        return this.post<t.MergeSystems>('/api/mergeSystems', data);
    }

    checkMergeStatus(forceReload = true) {
        return this.get<t.MergeStatus>(
            '/ec2/mergeStatus',
            {},
            { [forceReload ? 'reset-cache' : 'cache-request']: 'true' }
        );
    }

    getDigestKeys(adminPassword: string) {
        return this.get('/api/getNonce')
            .toPromise()
            .then(({ nonce, realm }) => {
                const digest = md5(`admin:${realm}:${adminPassword}`);
                const postSimplified = md5(
                    `${digest}:${nonce}:${md5('POST:')}`
                );
                const getSimplified = md5(`${digest}:${nonce}:${md5('GET:')}`);
                const postKey = btoa(`admin:${nonce}:${postSimplified}`);
                const getKey = btoa(`admin:${nonce}:${getSimplified}`);
                return { getKey, postKey };
            });
    }

    deprecatedMergeSystems(
        url: string,
        currentPassword: string,
        adminPassword: string,
        takeRemoteSettings = false
    ) {
        return this.getDigestKeys(adminPassword).then(({ getKey, postKey }) => {
            const data = {
                getKey,
                postKey,
                currentPassword,
                takeRemoteSettings,
                url
            };
            return this.post('/api/mergeSystems', data).toPromise();
        });
    }

    renameSystem(_, systemName: string) {
        return this.get('/api/systemSettings', { systemName }).toPromise();
    }

    getBookmarks(params = {
        order: 'desc',
        column: 'creationTime',
        deviceId: '*',
        _keepDefault: 'true',
        _orderBy: 'creationTimeMs'
    }): Observable<unknown> {
        throw new Error('should only be using rest version');
    }

    getBookmarkTags(limit: number = 100): Observable<any> {
        throw new Error('should only be using rest version');
    }

    getDevices(): Observable<unknown> {
        throw new Error('should only be using rest version');
    }

    getWebPages(): Observable<unknown> {
        throw new Error('should only be using rest version');
    }

    getLayouts(): Observable<unknown> {
        throw new Error('should only be using rest version');
    }

    getLayout(layoutId): Observable<unknown> {
        throw new Error('should only be using rest version');
    }

    getEventRules() {
        return this.get<t.EventRule[]>('/ec2/getEventRules');
    }

    saveEventRule(eventRule: t.EventRule) {
        return this.post('/ec2/saveEventRule', eventRule);
    }

    /**
     * Alias removeResource which is used for deleting event rules.
     */
    removeEventRule = this.removeResource;

    /** Not Implemented functions **/
    getLicenseSummaries(): Observable<unknown> {
        throw new Error('should only be using rest');
    }

    updateLogLevel(logLevel: unknown): Observable<unknown> {
        throw new Error('should only be using rest v2 version');
    }
}
