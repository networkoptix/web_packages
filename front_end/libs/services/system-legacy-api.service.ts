import { Location } from '@angular/common';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Injector } from '@angular/core';
import { pick } from 'lodash-es';
import md5 from 'md5';
import { CookieService } from 'ngx-cookie-service';
import { from, of, throwError, Observable, BehaviorSubject, firstValueFrom } from 'rxjs';
import {
    catchError,
    flatMap,
    map,
    mergeMap,
    retryWhen,
    timeout,
    tap,
    share,
    switchMap,
} from 'rxjs/operators';

import { environment } from '@environments/environment';
import type { APIDoc } from '@pages/api-tool/api-tool-types';
import { NxHealthService } from '@pages/health/health.service';
import { InterceptorManager } from '@utils/interceptor-manager';
import {
    memoizeAsync,
    memoizeAsyncLong,
    memoizeAsyncMedium,
    memoizeAsyncPersistent,
    defaultHashFunction,
    memoizeAsyncShort,
} from '@utils/memoize';
import { startWithCache } from '@utils/start-with-cached';

import { apiTool, healthMonitoring } from '../variables/static-variables';

import { Account } from './account.service/account';
import {
    MediaserverLegacyConnection,
    RequestParams,
    WithOptionalJson,
} from './mediaserver-apis/connections/adapters/adapter-target-types';
import type {
    RequestOpts,
    WithResponseType,
} from './mediaserver-apis/connections/adapters/adapter-target-types';
import type { addUserRestV2 } from './mediaserver-apis/endpoints/add-user';
import { createEventLegacyV1 } from './mediaserver-apis/endpoints/create-event';
import { getNonceLegacyV1 } from './mediaserver-apis/endpoints/get-nonce';
import { getSystemSettingsLegacyV1 } from './mediaserver-apis/endpoints/get-system-settings';
import { notImplementedCustomMessage } from './mediaserver-apis/endpoints/not-implemented';
import { proxyLegacyV1 } from './mediaserver-apis/endpoints/proxy';
import { removeStorageLegacyV1 } from './mediaserver-apis/endpoints/remove-storage';
import { saveStorageLegacyV1 } from './mediaserver-apis/endpoints/save-storage';
import { wizardGetSystemSettingsRestV2 } from './mediaserver-apis/endpoints/wizard-get-system-settings';
import { NxAppStateService } from './nx-app-state.service';
import type { APIDocType, MenuManifest } from './nx-config/base-config';
import type { IConfig } from './nx-config/config-types';
import * as t from './system-api.types';
import type { SaveCameraUserAttributes } from './system.service/camera-manager/camera-manager-types';
import type { ServerPreprocess } from './system.service/system-types';
import { NxUriCacheService } from './uri-cache.service';
import { WINDOW } from './window-provider';

interface IParams<Value = any> {
    [key: string]: Value;
}

export class NxSystemAPI extends MediaserverLegacyConnection {
    // Exclude V5.2 since we should try to remove all legacy calls at that point.
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
    protected readonly notImplementedMsg = 'Not implemented in the legacy api.';
    public readonly requiresPassword: boolean = true;

    protected CONFIG: IConfig;
    protected http: HttpClient;
    protected location: Location;

    protected serverId: string;
    protected systemId: string;
    protected currentUser: t.ec2User | t.CurrentUser;
    protected userEmail: string;
    protected userRequest: Promise<t.ec2User | t.CurrentUser>;
    unauthorizedCallback: (params: unknown) => Promise<any>;
    cacheService: NxUriCacheService;
    cookieService: CookieService;
    healthService: NxHealthService;
    appState: NxAppStateService;
    protected injector: Injector;

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
        appState: NxAppStateService,
        injector: Injector,
    ) {
        super();
        this.version = 0;
        this.http = http;
        this.CONFIG = configService;
        this.location = location;
        this.cacheService = cacheService;
        this.cookieService = cookieService;
        this.healthService = healthService;
        this.appState = appState;
        this.injector = injector;
        this.init(userEmail, systemId, serverId, unauthorizedCallback);

        // This is to make it easy to access the systemService from the console for testing,
        // uncomment to add systemService to global context.
        // @ ts-expect-error
        // window.systemService = this;
        // console.log('systemService added to window');
        // console.log('to test system system api method just access the systemService from console');
        // console.log('ex. > systemService.login(\'admin\', \'qweasd1234\'');
    }

    public get window() {
        return this.injector.get(WINDOW);
    }

    public get isSessionOauth() {
        return false;
    }

    public get urlBase() {
        return this.getUrlBase();
    }

    public setAccessTokenAsCookie(): void {
        throw new Error(this.notImplementedMsg);
    }

    protected cookieLogin(auth, remember = false, maxAge = 365) {
        if (InterceptorManager.enabled) {
            return of(true);
        }

        return this.post('/api/cookieLogin', { auth }).pipe(
            tap(() => {
                const cookie = 'x-runtime-guid';
                if (remember) {
                    this.cookieService.set(cookie, this.cookieService.get(cookie), maxAge);
                }
            }),
        );
    }

    protected digest(
        login: string,
        password: string,
        realm: string,
        nonce: string,
        method?: string,
    ) {
        method = md5(`${method || 'GET'}:`);
        const digest = md5(`${login}:${realm}:${password}`);
        const authDigest = md5(`${digest}:${nonce}:${method}`);
        return btoa(`${login}:${nonce}:${authDigest}`);
    }

    protected getUrlBase(protocol = this.window.location.protocol) {
        const getCurrentRelayHost = () =>
            this.currentRelayHost ||
            this.CONFIG.trafficRelayHost
                .replace('{host}', this.window.location.host)
                .replace('{systemId}', this.systemId);
        let urlBase =
            protocol !== this.window.location.protocol
                ? `${protocol}//${this.window.location.host}`
                : '';
        if (this.systemId) {
            const localProxy = this.cookieService.get('cors_bypass') || '';
            if (localProxy) {
                protocol = 'https:';
            }
            urlBase = localProxy + protocol + '//' + getCurrentRelayHost();
        }
        return urlBase;
    }

    generateHeaders() {
        return false;
    }

    protected cacheHeader(
        useCache: boolean,
    ): { 'cache-request': 'true' } | { 'reset-cache': 'true' } {
        return useCache ? { 'cache-request': 'true' } : { 'reset-cache': 'true' };
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

    protected override get(
        url: string,
        opts: WithResponseType<'arraybuffer'>,
    ): Observable<ArrayBuffer>;
    protected override get(url: string, opts: WithResponseType<'blob'>): Observable<Blob>;
    protected override get(url: string, opts: WithResponseType<'text'>): Observable<string>;
    protected override get<T>(url: string, opts?: WithOptionalJson): Observable<T>;
    @memoizeAsync(1000)
    protected override get(url: string, opts?: RequestOpts): Observable<unknown> {
        const {
            params = {},
            customHeaders = {},
            responseType = 'json',
            requestTimeout = 60000,
        } = opts ?? {};

        let headers = new HttpHeaders(customHeaders);

        if (!environment.isLocal && this.authGet) {
            params.auth = this.authGet;
        }

        if (environment.isLocal) {
            headers = headers.set('X-Runtime-Guid', this.cookieService.get('x-runtime-guid'));
            headers = headers.set('X-CSRFToken', this.cookieService.get('x-runtime-guid'));
        }
        if (this.serverId) {
            headers = headers.set('X-Server-Guid', this.serverId);
        }

        const fullUrl = `${this.urlBase}${url}`;

        let request: Observable<unknown>;
        if (responseType === 'json') {
            request = this.http.get(fullUrl, { headers, params, responseType });
        } else if (responseType === 'arraybuffer') {
            request = this.http.get(fullUrl, { headers, params, responseType });
        } else if (responseType === 'blob') {
            request = this.http.get(fullUrl, { headers, params, responseType });
        } else if (responseType === 'text') {
            request = this.http.get(fullUrl, { headers, params, responseType });
        }

        return request.pipe(
            startWithCache(fullUrl, { headers, params, responseType }),
            retryWhen(request => this.retryHandler(request)),
            timeout(requestTimeout),
            tap(undefined, error => {
                // 'Gateway Timeout' is added for 'local' testing of webadmin
                if (
                    environment.isLocal &&
                    (error.name === 'TimeoutError' || error.statusText === 'Gateway Timeout')
                ) {
                    this.appState.systemAvailable$.next(false);
                }
            }),
        );
    }

    protected post<ResponseType = any>(
        url: string,
        data?: any,
        paramsToAdd = {},
        customHeaders = {},
        customTimeout = 60000,
    ) {
        let headers = new HttpHeaders(customHeaders);
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
            headers = headers.set('X-Runtime-Guid', this.cookieService.get('x-runtime-guid'));
        }
        return this.http.post<ResponseType>(fullUrl, data, { params, headers }).pipe(
            retryWhen(request => this.retryHandler(request)),
            timeout(customTimeout),
        );
    }

    // TODO: Need to figure out how to type this
    protected retryHandler(request) {
        return request.pipe(
            mergeMap((error: { status: number; resultCode: string }, attempt: number) => {
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
            }),
        );
    }

    protected getRequestAggregator<AggregatedType>(requests: string[], requestTimeout = 60 * 1000) {
        const concatRequests = encodeURI(
            requests
                .map(request => {
                    return `exec_cmd=${request}`;
                })
                .join('&'),
        ).replace('/', '%2F');
        const url = `/api/aggregator?${concatRequests}`;
        return this.get<AggregatedType>(url, { requestTimeout });
    }

    protected proxy = proxyLegacyV1;
    currentRelayHost = '';

    init(
        userEmail: string,
        systemId: string,
        serverId: string,
        unauthorizedCallback: (params: IParams) => Promise<any>,
    ): void {
        this.setAuthKeys('', '', '');
        this.userEmail = userEmail;
        this.systemId = systemId;
        this.serverId = serverId;
        this.unauthorizedCallback = unauthorizedCallback;
        this.currentRelayHost = this.urlBase.split('://').pop();
    }

    /**
     * Pings the server. This allows the NxCurrentRelayInterceptor interceptor to inspect the response.
     *
     * This updated the currentRelayHost property which is then returned.
     *
     * This is mostly needed for websocket connections since they don't follow 307 redirects.
     *
     * @returns Actual resolved current relay host.
     */
    public getResolvedRelay(): Observable<string> {
        return this.ping().pipe(map(() => this.currentRelayHost));
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

    @memoizeAsync(defaultHashFunction, forceReload => !!forceReload, 10 * 1000)
    public getCurrentUser(forceReload?: boolean): Promise<t.ec2User | t.CurrentUser> {
        let customHeaders: RequestOpts['customHeaders'];
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
            const endpoint = '/ec2/getUsers';
            this.cacheService.addToCache(endpoint);
            this.userRequest = this.get<t.ec2User[]>(endpoint, { customHeaders })
                .toPromise()
                .then(result => {
                    this.currentUser = result.find(user => {
                        return user.name.toLowerCase() === this.userEmail.toLowerCase();
                    });
                    return this.currentUser;
                });
        } else {
            const endpoint = '/api/getCurrentUser';
            this.cacheService.addToCache(endpoint);
            this.userRequest = this.get<t.CurrentUser>(endpoint, { customHeaders })
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

    protected getNonce = getNonceLegacyV1;

    @memoizeAsyncLong
    protected getRolePermissions(roleId: string) {
        return this.get('/ec2/getUserRoles', { params: { id: roleId } });
    }

    @memoizeAsyncPersistent
    getApiDoc(type: APIDocType) {
        if (type === 'main') {
            return this.get<APIDoc>('/static/openapi_legacy.json').toPromise();
        }
    }

    @memoizeAsyncPersistent
    fetchApiToolJSON(route: string) {
        return this.get<APIDoc>(`/static/${route}`).toPromise();
    }

    getAPIToolManifest(): Promise<MenuManifest> {
        return Promise.resolve(apiTool.legacyManifest);
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
        remember = false,
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
            }),
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
                }),
            )
            .toPromise();
    }

    logUrl(params: { name?: string; lines?: number }) {
        return this.get('/api/showLog', {
            params: { ...params },
            customHeaders: { 'Content-Type': 'text' },
            responseType: 'text',
        }).toPromise();
    }

    getScripts() {
        return this.get('/api/scriptList').toPromise();
    }

    execute(script: string, mode: string = '') {
        return this.post(`/api/execute${script}?${mode}`);
    }

    @memoizeAsyncMedium
    getSystemSettings() {
        return getSystemSettingsLegacyV1.apply(this) as ReturnType<
            typeof getSystemSettingsLegacyV1
        >;
    }

    changeSystemName(systemName: string) {
        return firstValueFrom(this.updateOrGetSettings({ systemName }));
    }

    configureServer(configureParams: t.ConfigureParams) {
        return this.post('/api/configure', configureParams).toPromise();
    }

    changeAdminPassword(newPassword: string, currentPassword: string) {
        return this.configureServer({ password: newPassword, currentPassword });
    }

    ping() {
        return this.get('/api/ping');
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
                        reply: { realm, nonce },
                    },
                } = res;
                const getKey = this.digest(remoteLogin, remotePassword, realm, nonce, 'GET');

                if (!url.startsWith('http')) {
                    url = 'http://' + url;
                }

                return this.get('/api/pingSystem', { params: { getKey, url } }).toPromise();
            });
    }

    @memoizeAsyncPersistent
    getStatistics(salt: number): Observable<t.Statistics> {
        return this.get('/api/statistics', { params: { salt } });
    }

    /**
        @deprecated
     */
    saveCloudSystemCredentials(
        cloudSystemID: string,
        cloudAuthKey: string,
        cloudAccountName: string,
    ): Observable<void> {
        throw Error(this.forbiddenMsg);
    }

    checkInternet(reload = true) {
        return this.getModuleInfo()
            .toPromise()
            .then(res => res.reply.serverFlags.includes('SF_HasPublicIP'));
    }

    checkLocalIfNew(reload = true) {
        return environment.isLocal ? Promise.resolve({}) : this.getModuleInfo().toPromise();
    }

    createEvent = createEventLegacyV1;

    getEvents(
        from: number,
        to: number,
        cameraId?: string,
        eventType?: t.EventTypes,
        actionType?: t.ActionTypes,
        eventRuleId?: string,
    ) {
        // eslint-disable-next-line camelcase
        const [event_type, action_type, brule_id] = [eventType, actionType, eventRuleId];
        return this.get('/api/getEvents', {
            params: {
                from,
                to,
                cameraId,
                event_type,
                action_type,
                brule_id,
            },
        }).toPromise();
    }

    /**
     * @deprecated remove method once support for 4.2 systems is dropped.
     */
    backupControl(action?: 'start' | 'stop') {
        return this.get('/api/backupControl', action ? { params: { action } } : {}).toPromise();
    }

    @memoizeAsyncLong
    cameraDiagnostic(cameraId: string, type: t.CameraDiagnosticSteps) {
        return this.get('/api/doCameraDiagnosticsStep', {
            params: {
                cameraId,
                type,
            },
        }).toPromise();
    }

    @memoizeAsyncLong
    getServerNetworkSettings() {
        return this.get<t.NormalResponse<t.ServerNetworkSettings>>('/api/iflist').toPromise();
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
        return this.get<t.NormalResponse<t.ServerTime[]>>('/ec2/getTimeOfServers');
    }

    protected getSystemTime() {
        return this.get<t.SystemTime>('/api/synchronizedTime');
    }

    public settingsUpdater$ = new BehaviorSubject('');

    @memoizeAsyncPersistent
    public getSettings() {
        return this.settingsUpdater$.pipe(
            switchMap(() => this.get<t.NormalResponse<t.SystemSettings>>('/api/systemSettings')),
        );
    }

    public updateOrGetSettings(params: Partial<t.Settings> = {}) {
        const update = Object.keys(params).length > 0;
        return update
            ? this.get<t.NormalResponse<t.SystemSettings>>('/api/systemSettings', { params }).pipe(
                  tap(() => this.settingsUpdater$.next('')),
              )
            : this.getSettings();
    }

    @memoizeAsyncPersistent
    getSettingsDocumentation(): Promise<t.ServerDocumentation> {
        return this.get<t.ServerDocumentation>('/api/settingsDocumentation').toPromise();
    }

    /**
     * Start of Storage
     */
    public getStoragesInfo(params?) {
        return this.get<t.ec2Storage[]>('/ec2/getStorages', { params });
    }

    @memoizeAsyncLong
    public getStorageAnalytics() {
        const analyticsEndpoint = '/ec2/analyticsLookupObjectTracks?limit=1';
        const getCamerasEndpoint = `/ec2/getCamerasEx?id=${this.serverId}`;
        const getServerEndpoint = '/ec2/getMediaServersEx';
        return this.getRequestAggregator([
            analyticsEndpoint,
            getCamerasEndpoint,
            getServerEndpoint,
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
                                    parentId === this.serverId,
                            )?.value !== '[]',
                        false,
                    ),
                    metadataStorageId: reply[getServerEndpoint]
                        .find(({ id }) => id === this.serverId)
                        ?.addParams?.find(({ name }) => name === 'metadataStorageId')?.value,
                };
            }),
        );
    }

    public getStorages(useCache = false, customTimeout = 8000) {
        return this.get<t.NormalResponse<any>>('/api/storageSpace', {
            customHeaders: this.cacheHeader(useCache),
            requestTimeout: customTimeout,
        });
    }

    public getStorageStatus(params) {
        return this.get<t.NormalResponse<any>>('/api/storageStatus', {
            params,
            requestTimeout: 60000,
        });
    }

    saveStorage = saveStorageLegacyV1;

    removeStorage = removeStorageLegacyV1;

    updateStorages(updateParams: IParams, customTimeout = 8000) {
        return this.post<any>('/ec2/saveStorages', updateParams, {}, customTimeout);
    }

    rebuildArchive(type: number, action?: string): Observable<t.RebuildArchiveResponse> {
        let url = `/api/rebuildArchive?mainPool=${type}`;
        if (action) {
            url += `&action=${action}`;
        }
        return this.get(url);
    }

    @memoizeAsyncLong
    checkForAnalyticsData() {
        const params = {
            startTime: 0,
            endTime: Number.MAX_SAFE_INTEGER,
            limit: 1,
        };
        return this.get('/ec2/analyticsLookupObjectTracks', { params });
    }

    // End of storage

    getCameraHistoryItems(): Observable<t.Ec2CameraHistoryItems> {
        return this.get('/ec2/getCameraHistoryItems');
    }

    @memoizeAsync(defaultHashFunction, useCache => !useCache, 10 * 1000)
    getServerStats(useCache = false) {
        return this.get<t.NormalResponse<any>>('/api/metrics/values', {
            customHeaders: this.cacheHeader(useCache),
        });
    }

    changePort(port: number) {
        return this.configureServer({ port }).catch(err => Promise.reject(err));
    }

    renameServer(serverId: string, serverName: string) {
        return this.post<t.ChangedIdReturned>('/ec2/saveMediaServerUserAttributes', {
            serverId,
            serverName,
        }).toPromise();
    }

    saveServerUserSettings(serverId: string, param: { [key: string]: string }) {
        const [key, value] = Object.entries(param)[0];
        return this.post<t.ChangedIdReturned>('/ec2/saveMediaServerUserAttributes', {
            serverId,
            [key]: value,
        }).toPromise();
    }

    @memoizeAsyncLong
    getAnalyticsEngines() {
        return this.get('/ec2/getAnalyticsEngines');
    }

    saveCameraUserSettings(cameraId: string, param: { [key: string]: string }) {
        const [key, value] = Object.entries(param)[0];
        return this.post<t.ChangedIdReturned>('/ec2/saveCameraUserAttributes', {
            cameraId,
            [key]: value,
        }).toPromise();
    }

    restartServer(serverId?: string) {
        return this.post<t.RestartServer>('/api/restart')
            .toPromise()
            .catch(err => Promise.reject(err));
    }

    @memoizeAsyncMedium
    getModuleInfo(): Observable<t.ModuleInformation> {
        return this.get('/api/moduleInformation');
    }

    @memoizeAsyncMedium
    getModuleInfoUsingUrl(url: string): Observable<t.ModuleInformation> {
        return this.http.get<t.ModuleInformation>(`${url}/api/moduleInformation`);
    }

    detachFromSystem(currentPassword: string, serverId?: string) {
        return this.post<t.NormalResponse<any>>('/api/detachFromSystem', {
            currentPassword,
        });
    }

    // will put in response type when we start using
    removeResource(id: string) {
        return this.post('/ec2/removeResource', { id });
    }

    restoreFactorySettings(currentPassword: string, serverId?: string) {
        return this.post('/api/restoreState', { currentPassword });
    }

    @memoizeAsyncMedium
    getHardwareIdsOfServers() {
        return this.get('/ec2/getHardwareIdsOfServers');
    }

    @memoizeAsyncMedium
    getLicenses() {
        return this.getRequestAggregator(['ec2/getLicenses', 'ec2/getHardwareIdsOfServers']).pipe(
            map(({ reply }: any) => {
                return {
                    licenses: reply['ec2/getLicenses'],
                    hwids: reply['ec2/getHardwareIdsOfServers'].reply.reduce(
                        (ids: any[], { hardwareIds }) => {
                            ids.push(...hardwareIds);
                            return ids;
                        },
                        [],
                    ),
                };
            }),
        );
    }

    activateLicense(key) {
        const params: any = { key }; // 3.2 systems expect key as param
        return this.post('/api/activateLicense', { licenseKey: key }, params);
    }

    logLevel(logId?: string, name?: string, value?: string): Observable<t.LogLevel> {
        const params = { id: logId, name, value };
        Object.keys(params).forEach(key => {
            if (params[key] === undefined) {
                delete params[key];
            }
        });
        return this.get('/api/logLevel', { params });
    }

    /* End of Server settings */

    /* Working with users */
    getAggregatedUsersData() {
        const routes = [
            'ec2/getUsers',
            'ec2/getPredefinedRoles',
            'ec2/getUserRoles',
            'ec2/getAccessRights',
        ];
        return this.getRequestAggregator<t.AggregatedEc2Users>(routes);
    }

    saveUser<U extends t.ec2SaveUser>(user: U): Observable<t.ChangedIdReturned> {
        return this.post<t.ChangedIdReturned>('/ec2/saveUser', this.cleanUserObject(user));
    }

    deleteUser(userId: string) {
        return this.post<t.ChangedIdReturned>('/ec2/removeUser', {
            id: userId,
        });
    }

    isEmptyId(id: string) {
        return !id || id === this.emptyId;
    }

    protected cleanUserObject<U extends t.ec2SaveUser>(user: U): t.ec2SaveUser {
        const supportedFields: (keyof t.ec2SaveUser)[] = [
            'id',
            'email',
            'name',
            'fullName',
            'userId',
            'userRoleId',
            'permissions',
            'isCloud',
            'isEnabled',
            'password',
        ];
        return pick(user, supportedFields);
    }

    /* End of Working with users */
    /* Cameras and Servers */
    getCamera(id: string): Observable<t.ec2CameraEx> {
        const params = { id: this.cleanId(id) };
        return this.get<t.ec2CameraEx[]>('/ec2/getCamerasEx', { params }).pipe(
            map(cameras => cameras[0]),
        );
    }

    @memoizeAsyncShort
    getCamerasWithServerTime(): Observable<t.TimeAndCameras> {
        const routes = ['ec2/getTimeOfServers', 'ec2/getCamerasEx'];
        return this.getRequestAggregator<t.TimeAndCamerasResp>(routes).pipe(
            map(({ reply }) => ({
                serverTimes: reply['ec2/getTimeOfServers'].reply,
                cameras: reply['ec2/getCamerasEx'],
            })),
        );
    }

    setResourceParams(params: t.ResourceParam[]) {
        return this.post<t.EmptyObjectReturned>('/ec2/setResourceParams', params);
    }

    updateRecordingSettings({
        id: cameraId,
        name: cameraName,
        ...params
    }: SaveCameraUserAttributes) {
        return this.post<t.ChangedIdReturned>('/ec2/saveCameraUserAttributes', {
            cameraName,
            cameraId,
            ...params,
        });
    }

    @memoizeAsync(defaultHashFunction, useCache => !useCache, 60 * 1000)
    getMediaServers(useCache: boolean): Observable<ServerPreprocess[]> {
        const endpoint = '/ec2/getMediaServersEx';
        return this.get<t.ec2MediaServerEx[]>(endpoint, {
            customHeaders: this.cacheHeader(useCache),
        });
    }

    @memoizeAsyncMedium
    getMediaServersAndCameras(): Observable<t.ServersAndCameras> {
        const routes = ['/ec2/getMediaServers', 'ec2/getCamerasEx'];
        return this.getRequestAggregator<t.Ec2ServersAndCameras>(routes);
    }

    @memoizeAsyncPersistent
    getResourceTypes() {
        return this.get<t.GetResourceTypes>('/ec2/getResourceTypes');
    }

    updateSystemServersCameras(): Observable<t.CameraManagerUpdate> {
        const routes = [
            '/api/moduleInformation',
            '/ec2/getMediaServers',
            'ec2/getTimeOfServers',
            'ec2/getCamerasEx',
        ];
        return this.getRequestAggregator<t.CameraManagerUpdateResp>(routes).pipe(
            map(({ reply }) => ({
                moduleInfo: reply['/api/moduleInformation'].reply,
                servers: reply['/ec2/getMediaServers'],
                serverTimes: reply['ec2/getTimeOfServers'].reply,
                cameras: reply['ec2/getCamerasEx'],
            })),
        );
    }

    /* End of Cameras and Servers */

    /* Formatting urls */
    previewUrl(
        cameraId: string,
        time?: number | string,
        width?: number | string,
        height?: number | string,
        rotate?: number | string,
        _auth?: string, // For compatibility with rest api signature
    ) {
        const data: {
            cameraId: string;
            time?: number | string;
            width?: number | string;
            height?: number | string;
            rotate?: number | string;
            auth?: string;
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

        const url = this.generateGetUrl(endpoint, data).replace(this.urlBase, '');
        return this.get(url, { responseType: 'blob' }).pipe(
            catchError(e => of(new Blob())),
            map(blob => URL.createObjectURL(blob || new Blob())),
            share(),
        );
    }

    hlsUrl(cameraId: string, position: string = 'now', resolution: string = '') {
        const data: {
            pos?: string;
            auth: string;
        } = {
            auth: this.authGet,
        };
        if (position) {
            data.pos = position;
        }
        const url = `/web/hls/${this.cleanId(cameraId)}.m3u8?${resolution}`;
        return this.generateGetUrl(url, data);
    }

    webmUrl(cameraId: string, position: string, resolution: string, force: boolean) {
        const data: {
            auth: string;
            resolution: string;
            pos?: string;
        } = {
            auth: this.authGet,
            resolution,
        };
        if (position) {
            data.pos = position;
        }
        const url = `/media/${this.cleanId(cameraId)}.webm?rt`;
        return this.generateGetUrl(url, data, force);
    }

    public getExportUrl({ transport, cameraId, pos, endPos, duration }) {
        if (!['mp4', 'mkv'].includes(transport)) {
            transport = 'mkv';
        }
        cameraId = cameraId?.replace(/{|}/g, '');
        const url = `/web/media/${cameraId}.${transport}`;
        const params = {
            auth: this.authGet,

            pos,
            endPos,
            duration,

            // see VMS-29347
            download: true,
            export: true,
        };
        return this.generateGetUrl(url, params);
    }

    /* End of formatting urls */

    /* Working with archive */
    @memoizeAsyncMedium
    getRecords(
        cameraId: string,
        startTime: number,
        endTime: number,
        detail: number,
        limit: number,
        label: string,
        periodsType: number,
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
        const params: RequestParams = {
            cameraId: this.cleanId(cameraId),
            detail,
            endTime,
            periodsType,
            startTime,
        };
        if (limit) {
            params.limit = limit;
        }
        // RecordedTimePeriods
        return this.get<t.Ec2RecordedTimePeriods>(
            `/ec2/recordedTimePeriods?keepSmallChunks&${label || ''}`,
            { params },
        );
    }

    // TODO: param type
    recordedTimePeriods(params: RequestParams) {
        return this.get<t.Ec2RecordedTimePeriods>('/ec2/recordedTimePeriods', { params }).pipe(
            map(({ reply }) => reply),
        );
    }

    /* End of Working with archive */

    setCameraPath(cameraId: string): void {
        let systemLink = '';
        const route = this.location.path().startsWith('/embed') ? '/embed/' : '';

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
            false,
        );
    }

    /* Health Monitor */

    static memoizeHM = memoizeAsync(
        defaultHashFunction,
        forceUpdate => !!forceUpdate,
        healthMonitoring.staleReportTimeout * 60 * 1000,
    );

    @NxSystemAPI.memoizeHM
    getHealthManifest() {
        return this.get<t.Manifests>('/ec2/metrics/manifest');
    }

    @NxSystemAPI.memoizeHM
    getHealthValues() {
        return this.get<t.Values>('/ec2/metrics/values');
    }

    @NxSystemAPI.memoizeHM
    getHealthAlarms() {
        return this.get<t.Alarms>('/ec2/metrics/alarms');
    }

    @NxSystemAPI.memoizeHM
    getAggregateHealthReport(forceUpdate = false): Observable<t.AggregatedHealthReport> {
        const endpoint =
            '/api/aggregator?exec_cmd=ec2%2Fmetrics%2Fmanifest&exec_cmd=ec2%2Fmetrics%2Fvalues&exec_cmd=ec2%2Fmetrics%2Falarms';
        const headers = {};
        const secondsSinceUpdate = ((Date.now() - this.healthService.lastUpdate) / 1000) | 0;
        const stale = secondsSinceUpdate > this.CONFIG.cloudCapabilities.healthMonitorCacheTimeout;
        this.healthService.lastUpdate = Date.now();
        if (forceUpdate || stale) {
            this.cacheService.addToCache(`${this.urlBase}${endpoint}`);
            headers['reset-cache'] = 'reset';
        }

        return this.get<t.AggregatedHealthReport>(endpoint, { customHeaders: headers });
    }
    // End of Health Monitor

    public getPlaybackUrl(
        cameraId: string,
        transport = 'webm',
        resolution = 'low',
        position = undefined,
    ): string {
        let url;
        function hlsResolutionOrEmpty(res) {
            if (res === 'hi' || res === 'lo') {
                return res;
            }
            return '';
        }
        switch (transport) {
            case 'webRtc':
                url = `${this.getUrlBase('wss:')}/webrtc-tracker/?camera_id=${this.cleanId(
                    cameraId,
                )}&x-server-guid=${this.cleanId(this.serverId)}&`;
                break;
            case 'hls':
                url = `${this.getUrlBase()}/web/hls/${this.cleanId(
                    cameraId,
                )}.m3u8?${hlsResolutionOrEmpty(resolution)}&`;
                break;
            case 'rtsp':
                let urlBase = this.getUrlBase();
                // If we are in webadmin we need to have the origin or else https is not replaced with rtsp.
                if (!urlBase) {
                    urlBase = this.window.location.origin;
                }
                url = `${urlBase}/${this.cleanId(cameraId)}?stream=${resolution}&`.replace(
                    /https?:\/\//,
                    'rtsp://',
                );
                break;
            default:
                // Rtsp plays as webm but does not support transcoding.
                if (transport === 'mjpeg') {
                    transport = 'webm';
                }
                url = `${this.getUrlBase()}/web/media/${this.cleanId(
                    cameraId,
                )}.${transport}?resolution=${resolution || ''}&`;
        }

        if (this.authGet && !this.CONFIG.featureFlags.restCookieLogin) {
            url += `auth=${this.authGet}&`;
        }
        if (position) {
            url += `${transport === 'webRtc' ? 'position' : 'pos'}=${position}&`;
        }
        return url;
    }

    /** Merge Systems */
    getPeerSystems(showAddresses = true): Observable<t.DiscoveredPeers> {
        return this.get('/api/discoveredPeers', {
            params: {
                showAddresses,
            },
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
        takeRemoteSettings = false,
    ) {
        const data = {
            url,
            currentPassword,
            takeRemoteSettings,
            dryRun,
        };
        return this.post<t.MergeSystems>('/api/mergeSystems', data);
    }

    checkMergeStatus(forceReload = true) {
        return this.get<t.MergeStatus>('/ec2/mergeStatus', {
            customHeaders: this.cacheHeader(!forceReload),
        });
    }

    getDigestKeys(adminPassword: string) {
        return this.get<{ nonce: string; realm: string }>('/api/getNonce')
            .toPromise()
            .then(({ nonce, realm }) => {
                const digest = md5(`admin:${realm}:${adminPassword}`);
                const postSimplified = md5(`${digest}:${nonce}:${md5('POST:')}`);
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
        takeRemoteSettings = false,
    ) {
        return this.getDigestKeys(adminPassword).then(({ getKey, postKey }) => {
            const data = {
                getKey,
                postKey,
                currentPassword,
                takeRemoteSettings,
                url,
            };
            return this.post('/api/mergeSystems', data).toPromise();
        });
    }

    renameSystem(_, systemName: string) {
        return firstValueFrom(this.updateOrGetSettings({ systemName }));
    }

    getBookmarks(): Observable<unknown> {
        throw new Error('should only be using rest version');
    }

    getBookmarkTags(): Observable<unknown> {
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

    ptz(ptzCommand: t.PtzCommand): Observable<unknown> {
        return this.post('/api/ptz', ptzCommand);
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

    wizardGetSystemSettings = notImplementedCustomMessage(
        'should only be using rest v2 version',
    ) as typeof wizardGetSystemSettingsRestV2;

    addUser = notImplementedCustomMessage(
        'should only be using rest v2 version',
    ) as typeof addUserRestV2;
}
