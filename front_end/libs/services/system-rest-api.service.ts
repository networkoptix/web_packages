import { Location } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injector } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { SessionStorageService } from 'ngx-webstorage';
import { combineLatest, from, Observable, of, throwError } from 'rxjs';
import {
    catchError,
    map,
    mergeMap,
    retryWhen,
    share,
    switchMap,
    tap,
    timeout
} from 'rxjs/operators';

import { environment } from '@environments/environment';
import type { APIDoc } from '@pages/api-tool/api-tool-types';
import { NxHealthService } from '@pages/health/health.service';
import { NxStorageService } from '@services/storage.service';
import { IPartialCamera, PartialCameraRest } from '@services/system.service/camera-manager/camera-manager-types';

import { SECURITY_LEVEL } from '../../apps/setup-wizard/src/app/types/wizard-state.types';

import { NxAppStateService } from './nx-app-state.service';
import type { APIDocType, MenuManifest } from './nx-config/base-config';
import type { IConfig } from './nx-config/config-types';
import * as t from './system-api.types';
import { SystemConfigSettings } from './system-api.types';
import { NxSystemAPI } from './system-legacy-api.service';
import type { IParams } from './system.service/system-types';
import { NxUriCacheService } from './uri-cache.service';

/**
 * The NxSystemRestAPI service follow the adapter pattern and shadows methods from NxSystemAPI that are changed in newer systems.
 *
 * Any new Rest API methods should be added here.
 * If possible, try to keep the type signature compatible with methods from NxSystemAPI.
 * Endpoints that are pretty much a one to one replacement should directly shadow the old method.
 *
 * If there are a lot of changes on the endpoints behavior compared to the old method,
 * a new Rest API method should be created and a wrapper for it should shadow the old method.
 *
 * Ideally, methods on NxSystemAPI with be labeled as deprecated with the last supported version noted.
 */
export class NxSystemRestAPI extends NxSystemAPI {
    readonly version: number;
    public readonly requiresPassword: boolean = false;
    private readonly cloudToken = 'cloudAccessToken';
    private readonly token = 'x-runtime-guid';
    private readonly refreshToken = 'refreshToken';
    protected injector: Injector;

    #vmsToken: string;

    constructor(
        http: HttpClient,
        configService: IConfig,
        location: Location,
        userEmail: string,
        systemId: string,
        serverId: string,
        unauthorizedCallback: (params: IParams<any>) => Promise<any>,
        cacheService: NxUriCacheService,
        cookieService: CookieService,
        healthService: NxHealthService,
        appState: NxAppStateService,
        injector: Injector
    ) {
        super(
            http,
            configService,
            location,
            userEmail,
            systemId,
            serverId,
            unauthorizedCallback,
            cacheService,
            cookieService,
            healthService,
            appState,
            injector,
        );
        this.version = 5.0;
        this.injector = injector;
    }

    private get storageService() {
        return this.injector.get(NxStorageService);
    }

    private get sessionStorage() {
        return this.injector.get(SessionStorageService);
    }

    public get isSessionOauth() {
        return !environment.isLocal || this.currentUser?.type === 'cloud';
    }

    private get cloudAccessTokenName() {
        return `${this.systemId ? this.systemId + '-' : ''}${this.token}`;
    }

    public get accessToken() {
        return this.sessionStorage.retrieve(this.cloudAccessTokenName);
    }

    public set accessToken(token) {
        const { accessToken, cloudAccessToken } = this.getTokens();
        if (this.isSessionOauth && accessToken && cloudAccessToken) {
            this.deleteToken(cloudAccessToken, accessToken).toPromise();
        }
        this.sessionStorage.clear(this.cloudAccessTokenName);
        this.sessionStorage.store(this.cloudAccessTokenName, token);
    }

    public setVmsToken(token) {
        this.#vmsToken = token;
    }

    public get vmsToken() {
        return this.#vmsToken;
    }

    protected proxy(method, protocol, serverAddress, requestUrl, data, coercedEnglishError?: boolean) {
        if (environment.isLocal && protocol === 'https') {
            protocol = 'https-insecure';
        }
        const url = `/proxy/${protocol}/${serverAddress}/${requestUrl}`;

        const headers = {};
        if (coercedEnglishError) {
            headers['Accept-Language'] = 'en-US';
        }
        if (method === 'get') {
            return this.get(url, data, headers);
        } else if (method === 'post') {
            return this.post(url, data, headers);
        }
        throwError(new Error('Invalid http method type was passed.'));
    }

    private setupSystem(
        systemName: string,
        systemSettings: Partial<SystemConfigSettings>,
        cloudSystemID = '',
        cloudAuthKey = '',
        owner = '',
        password = '',
        securityLevel: string = SECURITY_LEVEL.STANDARD,
    ) {
        const config = {
            name: systemName,
            settingsPreset: 'security',
            settings: systemSettings,
            local: {
                password
            },
            cloud: {
                systemId: cloudSystemID,
                authKey: cloudAuthKey,
                owner
            }
        };

        if (securityLevel === SECURITY_LEVEL.STANDARD) {
            delete config.settingsPreset;
        }

        !cloudSystemID ? delete config.cloud : delete config.local;
        return this.post('/rest/v1/system/setup', config).toPromise();
    }

    private refreshTokens(refreshToken: string, isSystem?: boolean, remoteSystemId?: string): any {
        const params: any = {
            grant_type: 'refresh_token',
            response_type: 'token',
            refresh_token: refreshToken
        };

        if (isSystem || remoteSystemId) {
            params.scope = `cloudSystemId=${remoteSystemId ?? this.CONFIG.cloudSystemId}`;
        }

        return this.http.post(`${this.CONFIG.cloudHost}/oauth/token/`, params);
    }

    private getTokens() {
        const storageService = this.storageService;
        const refreshToken = storageService.refreshToken;
        const accessToken = this.accessToken;
        const cloudAccessToken = storageService.cloudAccessToken;
        return { accessToken, cloudAccessToken, refreshToken };
    }

    public setAccessTokenAsCookie() {
        if (this.CONFIG.newSystem || !this.accessToken) {
            return of(true);
        }
        return this.get(
            `/rest/v1/login/sessions/${this.accessToken}?setCookie=true`,
            {},
            { withCredentials: 'true' }
        ).pipe(catchError(e => {
            const location = this.window.location;
            if (!environment.isLocal &&
                [401, 403, 422].includes(e.status) &&
                location.href.includes(this.systemId)
            ) {
                location.reload();
            }
            throw e;
        }));
    }

    public setTokens(tokens, isSystem) {
        const storageService = this.storageService;
        let cloudLoginObservable: Observable<any> = of(true);
        if (isSystem) {
            this.accessToken = tokens.access_token;
            cloudLoginObservable = this.setAccessTokenAsCookie();
        } else {
            storageService.cloudAccessToken = tokens.access_token;
        }
        // eslint-disable-next-line camelcase
        if (tokens?.refresh_token) {
            storageService.refreshToken = tokens.refresh_token;
        }
        return cloudLoginObservable;
    }

    private clearTokens(): void {
        const storageService = this.storageService;
        this.sessionStorage.clear(this.cloudAccessTokenName);
        this.sessionStorage.clear(this.token);
        storageService.clear(this.cloudToken);
        storageService.clear(this.refreshToken);
        storageService.clear('loginState');
        this.accessToken = '';
    }

    private deleteToken(cloudAccessToken, token) {
        const host = environment.isLocal ? this.CONFIG.cloudHost : '';
        return this.http.post(
            `${host}/api/systems/revokeToken`,
            { token },
            { headers: { Authorization: `Bearer ${cloudAccessToken}` } }
        );
    }

    protected retryHandler(request) {
        return request.pipe(
            mergeMap(
                (
                    error: { status: number; resultCode: string, error: { error: string, errorId: string }, url: string },
                    attempt: number
                ) => {
                    if (attempt === 0) {
                        const storageService = this.storageService;
                        const refreshToken = storageService.refreshToken;
                        const errorId = error?.error?.errorId;
                        const isLoginRequest = error.url.includes('/rest/v1/login/sessions/');
                        const expiredSession = isLoginRequest &&
                            (error.status === 422 && ['sessionExpired', 'invalidParameter'].includes(errorId) ||
                                error.status === 400 && errorId === 'badRequest');
                        const authorizationError = !isLoginRequest && error.status >= 400 && error.status < 500 || error.resultCode === 'forbidden';

                        if (error.status === 503) {
                            return of('');
                        } else if (!refreshToken) {
                            if (expiredSession) {
                                return this.logout();
                            } else if (authorizationError) {
                                return from(this.unauthorizedCallback(error));
                            }
                        } else if (expiredSession || authorizationError) {
                            return this.refreshTokens(refreshToken, true).pipe(
                                catchError(error => {
                                    this.clearTokens();
                                    return throwError(error);
                                }),
                                switchMap(res => this.setTokens(res, true))
                            );
                        }
                    }
                    return throwError(error);
                }
            )
        );
    }

    generateHeaders(): any {
        let headers = new HttpHeaders();
        // if (!environment.isLocal && this.authGet) {
        //     params.auth = this.authGet;
        // }
        if (this.#vmsToken) {
            headers = headers.set(this.token, this.#vmsToken);
        }
        if (this.accessToken) {
            headers = headers.set('Authorization', `Bearer ${this.accessToken}`);
        }
        if (this.serverId) {
            headers = headers.set('X-Server-Guid', this.serverId);
        }

        return headers;
    }

    // Checks if the url does not have swagger-ui in it.
    private requiresWeb(url) {
        // Leaving this method incase we remember what it was used for.
        return true;
    }

    // Legacy api requires runtime in the header of the request.
    private requiresToken(url) {
        return !url.includes('rest');
    }

    private buildHeader(customHttpHeaders: IParams<string> = {}, useToken = false) {
        const accessToken = this.accessToken;
        let headers = new HttpHeaders();
        if (useToken) {
            headers = headers.set(this.token, accessToken || this.#vmsToken || '');
        }
        if (!environment.isLocal && accessToken) {
            headers = headers.set('Authorization', `Bearer ${accessToken}`);
        }

        if (this.serverId) {
            headers = headers.set('X-Server-Guid', this.serverId);
        }

        Object.entries(customHttpHeaders).forEach(entry => {
            headers = headers.set(...entry);
        });
        return headers;
    }

    protected delete<ResponseType = any>(
        url: string,
        params?: any,
        customHttpHeaders: IParams<string> = {},
        requestTimeout = 60000
    ) {
        params = params || {};

        const headers = this.buildHeader(customHttpHeaders);
        if (this.requiresWeb(url)) {
            url = `/web${url}`;
        }
        const fullUrl = `${this.urlBase}${url}`;
        return this.http.delete<ResponseType>(fullUrl, { headers, params }).pipe(
            retryWhen(request => this.retryHandler(request)),
            timeout(requestTimeout),
            tap(undefined, error => {
                if (environment.isLocal && error.name === 'TimeoutError') {
                    this.appState.systemAvailable$.next(false);
                }
            })
        );
    }

    protected get<ResponseType = any>(
        url: string,
        params?: any,
        customHttpHeaders: IParams<string> = {},
        requestTimeout = 60000
    ) {
        params = params || {};

        const headers = this.buildHeader(customHttpHeaders, this.requiresToken(url));
        if (this.requiresWeb(url)) {
            url = `/web${url}`;
        }
        const fullUrl = `${this.urlBase}${url}`;
        const responseType = <any>(customHttpHeaders?.responseType || 'json');
        return this.http.get<ResponseType>(fullUrl, { headers, params, responseType }).pipe(
            retryWhen(request => this.retryHandler(request)),
            timeout(requestTimeout),
            tap(undefined, error => {
                if (environment.isLocal && error.name === 'TimeoutError') {
                    this.appState.systemAvailable$.next(false);
                }
            })
        );
    }

    protected post<ResponseType = any>(
        url: string,
        data?: any,
        paramsToAdd = {},
        customHeaders = {},
        customTimeout = 60000
    ) {
        data = data || {};

        const headers = this.buildHeader(customHeaders, this.requiresToken(url));
        if (this.requiresWeb(url)) {
            url = `/web${url}`;
        }

        let params = new HttpParams();
        Object.keys(paramsToAdd).forEach(key => {
            params = params.append(key, paramsToAdd[key]);
        });

        const fullUrl = `${this.urlBase}${url}`;

        return this.http
            .post<ResponseType>(fullUrl, data, { params, headers })
            .pipe(
                retryWhen(request => this.retryHandler(request)),
                timeout(customTimeout)
            );
    }

    protected put<ResponseType = any>(
        url: string,
        data?: any,
        paramsToAdd = {},
        customTimeout = 60000
    ) {
        data = data || {};

        const headers = this.buildHeader();
        if (this.requiresWeb(url)) {
            url = `/web${url}`;
        }

        let params = new HttpParams();
        Object.keys(paramsToAdd).forEach(key => {
            params = params.append(key, paramsToAdd[key]);
        });

        const fullUrl = `${this.urlBase}${url}`;

        return this.http
            .put<ResponseType>(fullUrl, data, { params, headers })
            .pipe(
                retryWhen(request => this.retryHandler(request)),
                timeout(customTimeout)
            );
    }

    protected patch<ResponseType = any>(
        url: string,
        data?: any,
        paramsToAdd = {},
        customTimeout = 60000
    ) {
        data = data || {};

        const headers = this.buildHeader();
        if (this.requiresWeb(url)) {
            url = `/web${url}`;
        }

        let params = new HttpParams();
        Object.keys(paramsToAdd).forEach(key => {
            params = params.append(key, paramsToAdd[key]);
        });

        const fullUrl = `${this.urlBase}${url}`;

        return this.http
            .patch<ResponseType>(fullUrl, data, { params, headers })
            .pipe(
                retryWhen(request => this.retryHandler(request)),
                timeout(customTimeout)
            );
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
            this.userRequest = this.get<Promise<t.NormalResponse<t.User>>>(endpoint, {}, customHeaders).toPromise()
                .then((result: any) => {
                    this.currentUser = result.find((user: t.User) => {
                        return user.name.toLowerCase() === this.userEmail.toLowerCase();
                    });
                    return this.currentUser;
                });
        } else if (environment.isLocal && !this.CONFIG.newSystem) { // Local system mode ???
            const endpoint = `/rest/v1/login/sessions/${this.accessToken || 'current'}`;
            this.userRequest = this.get<t.NormalResponse<t.User>>(endpoint, {}, customHeaders).toPromise()
                .then((result: any) => {
                    if (!this.accessToken) {
                        this.#vmsToken = result.token;
                    }
                    return this.get<t.NormalResponse<t.User[]>>('/rest/v1/users', { name: result.username }).toPromise();
                })
                .then(result => {
                    // Todo: convert result to match getCurrentUser result.
                    this.currentUser = result[0];
                    return this.currentUser;
                }).catch(err => {
                    // Unknown session token
                    if (err.errorId === 'cantProcessRequest') {
                        this.accessToken = '';
                    }
                });
        } else {
            this.userRequest = Promise.resolve(undefined);
        }
        this.userRequest.finally(() => {
            this.userRequest = undefined; // Clear cache in case of errors
        });
        return this.userRequest;
    }

    public getCurrentServerInfo(): Observable<any> {
        return this.get('/rest/v1/servers/this');
    }

    public checkIfConnectedToServer(serverId: string): Observable<boolean> {
        return this.getCurrentServerInfo()
            .pipe(map(data => data.id === serverId));
    }

    public isSessionFresh() {
        if (this.CONFIG.newSystem || !this.accessToken) {
            return of(false);
        }
        return this.get(`/rest/v1/login/sessions/${this.accessToken}`).pipe(
            switchMap(res => {
                return of(res.ageS < this.CONFIG.sessionFreshnessSec);
            }));
    }

    loginToken(username: string, password: string, remember: boolean): Observable<t.UserSession> {
        return this.post(
            '/rest/v1/login/sessions',
            { username, password, setCookie: remember }
        ).pipe(map(data => {
            if (remember) {
                this.setVmsToken(data.token);
            }
            return data;
        }));
    }

    loginTokenUrl(token: string): Observable<any> {
        return this.get(`/rest/v1/login/sessions/${token}`, { setCookie: true });
    }

    loginOauth(code: string, skipSetting?: boolean) {
        const params = {
            code,
            grant_type: 'authorization_code',
            response_type: 'token'
        };
        return this.http.get(`${this.CONFIG.cloudHost}/oauth/token/`, { params })
            .pipe(
                switchMap(tokens => {
                    if (skipSetting) {
                        return of(tokens);
                    }
                    return this.setTokens(tokens, false).pipe(
                        switchMap(() =>
                            // @ts-expect-error
                            this.refreshTokens(tokens.refresh_token, true)
                        )
                    );
                }),
                tap(systemTokens => {
                    !skipSetting && this.setTokens(systemTokens, true).subscribe(() => {});
                })
            );
    }

    async redirectOauth(allSystems?: boolean): Promise<void> {
        const { href } = this.window.location;
        const params = new URLSearchParams({
            client_type: 'loginWebadmin',
            view_type: 'web',
            redirect_uri: href,
            client_id: 'webadmin',
            response_type: 'code',
            grant_type: 'password',
            scope: `${this.CONFIG.cloudHost.replace(/http?s:\/\//, '')}/cdb/oauth2/token cloudSystemId=${allSystems ? '*' : this.CONFIG.cloudSystemId}`
        });
        this.window.location.href = `${this.CONFIG.cloudHost}/authorize?${params.toString()}`;
    }

    async logout() {
        let { accessToken, cloudAccessToken, refreshToken } = this.getTokens();
        let cloudLogoutObservable = of({});
        if (this.CONFIG.cloudSystemId && refreshToken) {
            // Generate new tokens if they are missing
            if (!accessToken) {
                // eslint-disable-next-line camelcase
                accessToken = await this.refreshTokens(refreshToken, true).toPromise()?.access_token;
            }
            if (!cloudAccessToken) {
                // eslint-disable-next-line camelcase
                cloudAccessToken = await this.refreshTokens(refreshToken, false).toPromise()?.access_token;
            }
            cloudLogoutObservable = this.http.post(`${this.CONFIG.cloudHost}/oauth/logout/`, { accessToken, cloudAccessToken, refreshToken });
        }
        return cloudLogoutObservable.pipe(
            map(() => this.delete(`/rest/v1/login/sessions/${accessToken || this.#vmsToken}`)),
            map(() => this.clearTokens())
        ).toPromise();
    }

    getApiDoc(type: APIDocType = 'main') {
        return this.get<APIDoc>(this.CONFIG.apiDocURL[type]).toPromise();
    }

    fetchApiToolJSON(route: string) {
        return this.get<APIDoc>(`/static/${route}`).toPromise();
    }

    getAPIToolManifest(): Promise<MenuManifest> {
        return this.get('/static/openapi_manifest.json').toPromise().catch(() => this.CONFIG.apiTool.defaultManifest);
    }

    getApiChangelog(): Promise<string> {
        return this.http.get(`${this.urlBase}/web/static/api_changelog.md`, { responseType: 'text' }).toPromise();
    }

    getApiPreamble(): Promise<string> {
        return this.http.get(`${this.urlBase}/web/static/api_preamble.md`, { responseType: 'text' }).toPromise();
    }

    getSystemSettings(): Promise<any> {
        return this.get('/rest/v1/system/settings').toPromise();
    }

    getMediaServers(useCache: boolean) {
        const endpoint = '/rest/v1/servers';
        const params = {
            _keepDefault: true,
            _with: 'id,name,status,version,osInfo,endpoints,url'
        };
        return this.get<t.GetMediaServers[]>(
            endpoint,
            params,
            { [useCache ? 'cache-request' : 'reset-cache']: 'true' }
        ).pipe(
            map(servers => {
                servers.forEach(server => {
                    if (typeof server.osInfo !== 'string') {
                        server.osInfo = JSON.stringify(server.osInfo);
                    }
                    server.networkAddresses = server.endpoints.join(';');
                });
                return servers;
            })
        );
    }

    getCameras(): Observable<IPartialCamera[]> {
        const endpoint = '/rest/v1/devices';
        const params = {
            _keepDefault: true,
            _with: 'id,name,serverId,status,url,schedule.isEnabled,deviceType'
        };
        return this.get<PartialCameraRest[]>(
            endpoint,
            params
        ).pipe(map(cameras => cameras
            .map(({ deviceType, id, name, schedule, serverId, status, url }) => (
                { deviceType, id, name, status, url, scheduleEnabled: schedule.isEnabled, parentId: serverId }
            ))));
    }
    getMediaServersAndCameras(): Observable<t.NormalResponse<t.AggregatedServersAndCameras>> {
        const cameras = this.get<t.GetCameras>('/ec2/getCamerasEx');
        const servers = this.getMediaServers(true);
        return combineLatest([servers, cameras]).pipe(
            map<any, t.NormalResponse<t.AggregatedServersAndCameras>>(([mediaServers, cameras]) => ({
                error: '0',
                errorId: 'ok',
                errorString: '',
                reply: {
                    '/ec2/getMediaServers': mediaServers,
                    'ec2/getCamerasEx': cameras
                }
            })));
    }

    updateSystemServersCameras() {
        const routes = [
            '/api/moduleInformation',
            '/ec2/getMediaServers',
            'ec2/getTimeOfServers'
        ];
        const aggregator = this.getRequestAggregator<
            t.NormalResponse<
                [
                    t.ModuleInformationReply,
                    t.GetMediaServers,
                    t.SystemTime
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

        return combineLatest([aggregator, this.getCameras()]).pipe(
            map(([[moduleInfo, mediaservers, systemTime], cameras]) => [moduleInfo, mediaservers, systemTime, cameras])
        );
    }

    backupControl(action?: 'start' | 'stop') {
        const backupEndpoint = `/rest/v1/servers/${this.serverId}/backupSettings`;
        return this.post(backupEndpoint, {
            caption: action,
            backupNewCameras: true,
            quality: 'CameraBackupBoth'
        }).toPromise();
    }

    renameSystem(_, systemName: string) {
        return this.post('/api/systemSettings', { systemName }).toPromise().catch();
    }

    detachFromSystem(currentPassword?: string, serverId?: string) {
        return this.post(`/rest/v1/servers/${serverId || 'this'}/detach`);
    }

    disconnectFromCloud(): Promise<void> {
        return this.post('/rest/v1/system/cloudUnbind', { password: '' }).toPromise()
            .then(() => {
                if (this.isSessionOauth) {
                    this.clearTokens();
                }
            });
    }

    checkMergeStatus(forceReload = true) {
        return this.get<t.MergeStatus>(
            '/rest/v1/system/merge',
            {},
            { [forceReload ? 'reset-cache' : 'cache-request']: 'true' }
        );
    }

    // serverId can be a server id, this, or *
    getServerInfo(serverId: '*'): Observable<t.ModuleInformationReply[]>;
    getServerInfo(serverId: string): Observable<t.ModuleInformationReply>;
    getServerInfo(serverId: string) {
        return this.get(`/rest/v1/servers/${serverId}/info`);
    }

    getRemoteServerInfo(remoteEndpoint: string) {
        remoteEndpoint = remoteEndpoint.replace(/https?:\/\/(?:.*@)?/, '');
        return this.proxy('get', 'https', remoteEndpoint, 'rest/v1/servers/this/info', {});
    }

    mergeSystems(
        remoteEndpoint: string,
        remoteServerId: string,
        dryRun: boolean,
        password = '',
        takeRemoteSettings = true
    ) {
        const [basicCredentials, _] = remoteEndpoint.includes('@') ? remoteEndpoint.split('@') : [];
        remoteEndpoint = remoteEndpoint
            .replace(/https?:\/\/(?:.*@)?/, '')
            .replace(/\/$/, '');
        const request = remoteServerId
            ? of({ id: remoteServerId, cloudSystemId: '' })
            : this.proxy('get', 'https', remoteEndpoint, 'rest/v1/servers/this/info', {});
        return request.pipe(
            // Gets the remoteServerID and checks if the remote system is connected to cloud.
            switchMap((data: any) => {
                if (!remoteServerId) {
                    remoteServerId = data.id.replace(/{|}/g, '');
                }
                return of({ token: '', cloudSystemId: data.cloudSystemId || '' });
            }),
            // Adds the remoteToken to the merge request.
            switchMap((info: any) => {
                if (!dryRun || (password && !this.isSessionOauth)) {
                    const refreshToken = this.storageService.refreshToken;
                    // Using oauth and target system is connected to cloud.
                    if (info.cloudSystemId && refreshToken) {
                        // Request for a cloud token that has the targetSystem scope.
                        return this.refreshTokens(refreshToken, true, info.cloudSystemId)
                            .pipe(map((res: any) => ({ token: res.access_token })));
                    } else if (password || basicCredentials) {
                        if (!password && basicCredentials) {
                            const [_, basicPassword] = basicCredentials.replace(/https?:\/\//, '').split(':');
                            if (basicPassword) {
                                password = basicPassword;
                            }
                        }
                        const data = { username: 'admin', password, remember: false };
                        return this.proxy('post', 'https', remoteEndpoint, 'rest/v1/login/sessions', data, true);
                    }
                }
                return of(info);
            }),
            // Executes the merge request
            switchMap((res: any) => {
                const remoteSessionToken = res.token ?? '';
                const data = {
                    remoteServerId,
                    takeRemoteSettings,
                    dryRun,
                    remoteEndpoint,
                    remoteSessionToken,
                    // remoteCertificatePem          : '', // Currently optional.
                    mergeOneServer: false,
                    ignoreIncompatible: false,
                    ignoreOfflineServerDuplicates: true
                };
                return this.post<t.MergeSystems>('/rest/v1/system/merge', data, undefined, { 'Accept-Language': 'en-US' });
            })
        );
    }

    restartServer(serverId?: string) {
        return this.post<t.RestartServer>(
            `/rest/v1/servers/${serverId || 'this'}/restart `
        ).toPromise()
            .catch(err => Promise.reject(err));
    }

    restoreFactorySettings(password?: string, serverId?: string) {
        return this.post(`/rest/v1/servers/${serverId || 'this'}/reset`);
    }

    saveCloudSystemCredentials(
        cloudSystemID: string,
        cloudAuthKey: string,
        cloudAccountName: string
    ) {
        return this.post('/rest/v1/system/cloudBind',
            {
                systemId: cloudSystemID,
                authKey: cloudAuthKey,
                owner: cloudAccountName
            });
    }

    setupCloudSystem(
        systemName: string,
        cloudSystemID: string,
        cloudAuthKey: string,
        cloudAccountName: string,
        systemSettings: t.SystemConfigSettings
    ) {
        return this.setupSystem(
            systemName,
            systemSettings,
            cloudSystemID,
            cloudAuthKey,
            cloudAccountName
        );
    }

    setupLocalSystem(
        systemName: string,
        password: string,
        systemSettings: Partial<SystemConfigSettings>,
        securityLevel: string = SECURITY_LEVEL.STANDARD,
    ) {
        return this.setupSystem(
            systemName,
            systemSettings,
            undefined,
            undefined,
            undefined,
            password,
            securityLevel,
        );
    }

    getBookmarks(params = {
        order: 'desc',
        column: 'creationTime',
        deviceId: '*',
        _keepDefault: 'true',
        _orderBy: 'creationTimeMs'
    }) {
        return this.get('/rest/v1/devices/*/bookmarks', params);
    }

    getBookmarkTags(limit:number = 100) {
        return this.get('/rest/v1/devices/*/bookmarks/*/tags', { limit });
    }

    getDevices(params = {}) {
        return this.get('/rest/v1/devices', params);
    }

    getWebPages(params = {}): Observable<t.WebPages> {
        return this.get('/rest/v1/webPages', params);
    }

    getLayouts(params = { _keepDefault: true }): Observable<t.Layouts> {
        return this.get('/rest/v1/layouts', params);
    }

    getLayout(layoutId: string, params = { _keepDefault: true }): Observable<t.Layout> {
        return this.get(`/rest/v1/layouts/${layoutId}`, params);
    }

    putLayout(layoutId: string, data: Partial<t.Layout>): Observable<t.Layout> {
        return this.put(`/rest/v1/layouts/${layoutId}`, data);
    }

    createLayout(data: Omit<t.Layout, 'id' | 'systemId'>): Observable<t.Layout> {
        return this.post('/rest/v1/layouts/', data);
    }

    getLicenseSummaries(): Observable<any> {
        const params = {
            _keepDefault: true
        };
        return this.get('/rest/v1/licenseSummaries', params);
    }

    previewUrl(
        cameraId: string,
        time?: number | string,
        width?: number,
        height?: number,
        rotate?: number,
        auth?: string
    ) {
        const data: {
            cameraId: string;
            time?: number | string;
            width?: number;
            height?: number;
            rotate?: number;
        } = {
            cameraId: this.cleanId(cameraId),
        };
        let endpoint = '/ec2/cameraThumbnail';

        if (data.time === 'now' || time === 'now') {
            data.time = 'LATEST';
        } else if (!time) {
            data.time = 'LATEST';
            endpoint += '?ignoreExternalArchive';
        } else {
            data.time = time;
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

        return this.get(endpoint, data, { responseType: 'blob' })
            .pipe(map(blob => blob ? URL.createObjectURL(blob) : undefined), share());
    }

    protected generateGetUrl(url: string, data: IParams, absUrl?: boolean) {
        let params = new HttpParams();
        Object.keys(data).forEach((key: string) => {
            params = params.set(key, data[key]);
        });
        if (absUrl) {
            const proto = this.window.location.protocol;
            const hostName = this.window.location.hostname;
            const usePort = this.window.location.port;
            const port = usePort ? `:${usePort}` : '';
            url = `${proto}//${hostName}${port}${url}`;
        } else {
            url = `${this.urlBase}${url}`;
        }
        return `${url}${url.includes('?') ? '&' : '?'}${params}`;
    }

    createEvent(params: t.EventParams) {
        return this.post('/api/createEvent', params).toPromise();
    }

    /** Not Implemented functions **/
    updateLogLevel(logLevel: unknown): Observable<unknown> {
        throw new Error('should only be using rest v2 version');
    }
}
