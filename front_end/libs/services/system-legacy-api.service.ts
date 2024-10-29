import { Location } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injector } from '@angular/core';
import { pick } from 'lodash-es';
import md5 from 'md5';
import { CookieService } from 'ngx-cookie-service';
import { BehaviorSubject, firstValueFrom, from, Observable, of, Subject, throwError } from 'rxjs';
import {
    catchError,
    flatMap,
    map,
    mergeMap,
    retryWhen,
    share,
    shareReplay,
    startWith,
    switchMap,
    tap,
    throttleTime,
    timeout,
} from 'rxjs/operators';

import { environment } from '@environments/environment';
import type { APIDoc } from '@pages/api-tool/api-tool-types';
import { NxHealthService } from '@pages/health/health.service';
import { LegacyNewUser, LegacyUser, Role, SystemUser } from '@services/system-user.types';
import { cleanIdLegacy } from '@utils/general';
import { InterceptorManager } from '@utils/interceptor-manager';
import {
    defaultHashFunction,
    memoizeAsync,
    memoizeAsyncLong,
    memoizeAsyncMedium,
    memoizeAsyncPersistent,
    memoizeAsyncShort,
} from '@utils/memoize';

import { apiTool, healthMonitoring } from '../variables/static-variables';

import { Account } from './account.service/account';
import {
    MediaserverLegacyConnection,
    RequestParams,
    WithOptionalJson,
    WithoutRT,
} from './mediaserver-apis/connections/adapters/adapter-target-types';
import type {
    RequestOpts,
    WithResponseType,
} from './mediaserver-apis/connections/adapters/adapter-target-types';
import { createEventLegacyV1 } from './mediaserver-apis/endpoints/create-event';
import { getNonceLegacyV1 } from './mediaserver-apis/endpoints/get-nonce';
import { getServerInfoLegacy } from './mediaserver-apis/endpoints/get-server-info';
import { getSystemSettingsLegacyV1 } from './mediaserver-apis/endpoints/get-system-settings';
import { proxyLegacyV1 } from './mediaserver-apis/endpoints/proxy';
import { removeStorageLegacyV1 } from './mediaserver-apis/endpoints/remove-storage';
import { saveStorageLegacyV1 } from './mediaserver-apis/endpoints/save-storage';
import { NxAppStateService } from './nx-app-state.service';
import type { APIDocType, LegacyMenuManifest, MenuManifest } from './nx-config/base-config';
import { nxConfig } from './nx-config/config';
import type {
    AggregatedResp,
    AggregatedUsers,
    CamerasAndServerTimes,
    GetLicenses,
    HealthReport,
    StorageAnalytics,
    ViewMediaServersAndCameras,
} from './system-api.aggregated-types';
import type { GetEndpoints } from './system-api.endpoint-types';
import {
    ChangedIdReturned,
    EmptyObjectReturned,
    NormalResponse,
    ResourceParam,
    ServerDocumentation,
    UnauthorizedCallback,
} from './system-api.types';
import {
    ec2CameraEx,
    Ec2CameraHistoryItems,
    Ec2RecordedTimePeriodsResp,
} from './system-api.types/devices.types';
import { EventRule } from './system-api.types/events.types';
import { PtzCommand } from './system-api.types/layouts.types';
import {
    ConfigureParams,
    ec2Storage,
    LogLevel,
    ModuleInformation,
    RebuildArchiveResponse,
    RestartServer,
    ServerHardareIdsResp,
    StaticWebContentDownload,
    StaticWebContentInfo,
    TimeOfServers,
} from './system-api.types/servers.types';
import {
    Alarms,
    DiscoveredPeers,
    Manifests,
    MergeStatus,
    MergeSystems,
    Settings,
    Statistics,
    SystemSettingsResp,
    Values,
} from './system-api.types/system.types';
import { ec2SaveUser } from './system-api.types/users.types';
import type { MediaStreams } from './system.service/camera-manager/add-params.types';
import type {
    PreprocessCamera,
    SaveCameraUserAttributes,
} from './system.service/camera-manager/camera-manager-types';
import type { SaveStoragePayload } from './system.service/storage-manager/storage';
import type { PreprocessServer, ViewBaseCamera } from './system.service/types/servers.types';
import { NxUriCacheService } from './uri-cache.service';

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
    protected override readonly notImplementedMsg = 'Not implemented in the legacy api.';
    public readonly requiresPassword: boolean = true;

    protected CONFIG = nxConfig;
    protected http: HttpClient;
    protected location: Location;

    protected serverId: string;
    protected systemId: string;
    protected currentUser: SystemUser;
    protected userEmail: string;
    protected userRequest: Promise<SystemUser>;
    unauthorizedCallback: UnauthorizedCallback;
    cacheService: NxUriCacheService;
    cookieService: CookieService;
    healthService: NxHealthService;
    appState: NxAppStateService;
    protected injector: Injector;

    constructor(
        http: HttpClient,
        location: Location,
        userEmail: string,
        systemId: string,
        serverId: string,
        unauthorizedCallback: UnauthorizedCallback,
        cacheService: NxUriCacheService,
        cookieService: CookieService,
        healthService: NxHealthService,
        appState: NxAppStateService,
        injector: Injector,
        public skipSettingSystem = false,
    ) {
        super();
        this.version = 0;
        this.http = http;
        this.location = location;
        this.cacheService = cacheService;
        this.cookieService = cookieService;
        this.healthService = healthService;
        this.appState = appState;
        this.injector = injector;

        this.setAuthKeys('', '', '');
        this.userEmail = userEmail;
        this.systemId = systemId;
        this.serverId = serverId;
        this.unauthorizedCallback = unauthorizedCallback;
        this.currentRelayHost = this.urlBase.split('://').pop();
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

    protected getUrlBase(protocol = window.location.protocol) {
        const getCurrentRelayHost = () =>
            this.currentRelayHost ||
            this.CONFIG.trafficRelayHost
                .replace('{host}', window.location.host)
                .replace('{systemId}', this.systemId);
        let urlBase =
            protocol !== window.location.protocol ? `${protocol}//${window.location.host}` : '';
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

    protected generateGetUrl(url: string, params_: RequestParams, absUrl?: boolean) {
        const params = new HttpParams({ fromObject: params_ });
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

    /** Overload for get requests without params whose return type can be looked up
     * in `GetEndpoints`. Params are excluded because they might change the return type.
     */
    protected override get<U extends keyof GetEndpoints>(
        url: U,
        opts?: Omit<WithOptionalJson, 'params'>,
    ): Observable<GetEndpoints[U]>;
    /** Overload for catching attempts to incorrectly use a generic on a request
     * whose return type has already been added to `GetEndpoints` for lookups.
     */
    protected override get<_T>(
        url: keyof GetEndpoints,
        opts?: Omit<WithOptionalJson, 'params'>,
    ): void;
    /** Overload for ArrayBuffer response. */
    protected override get(
        url: string,
        opts: WithResponseType<'arraybuffer'>,
    ): Observable<ArrayBuffer>;
    /** Overload for Blob response. */
    protected override get(url: string, opts: WithResponseType<'blob'>): Observable<Blob>;
    /** Overload for text response. */
    protected override get(url: string, opts: WithResponseType<'text'>): Observable<string>;
    /** Base overload for unknown JSON response. */
    protected override get<T>(url: string, opts?: WithOptionalJson): Observable<T>;
    @memoizeAsync(1000)
    protected override get(url: string, opts?: RequestOpts): Observable<unknown> {
        const {
            params: _params = {},
            headers: _headers = {},
            timeout: customTimeout = 60000,
            responseType = 'json',
        } = opts ?? {};
        let headers = new HttpHeaders(_headers);

        if (environment.isWebadmin) {
            headers = headers.set('X-Runtime-Guid', this.cookieService.get('x-runtime-guid'));
            headers = headers.set('X-CSRFToken', this.cookieService.get('x-runtime-guid'));
        }
        if (this.serverId) {
            headers = headers.set('X-Server-Guid', this.serverId);
        }

        const fullUrl = `${this.urlBase}${url}`;

        const getRequest = () => {
            let params = new HttpParams({ fromObject: _params });

            if (!environment.isWebadmin && this.authGet) {
                params = params.append('auth', this.authGet);
            }

            let request: Observable<unknown>;
            if (responseType === 'json') {
                request = this.http.get(fullUrl, { headers, params, responseType });
            } else if (responseType === 'arraybuffer') {
                request = this.http.get(fullUrl, { headers, params, responseType });
            } else if (responseType === 'blob') {
                request = this.http.get(fullUrl, { headers, params, responseType });
            } else {
                request = this.http.get(fullUrl, { headers, params, responseType: 'text' });
            }
            return request;
        };

        return of('').pipe(
            switchMap(() => getRequest()),
            retryWhen(request => this.retryHandler(request)),
            timeout(customTimeout),
            tap(undefined, error => {
                // 'Gateway Timeout' is added for 'local' testing of webadmin
                if (
                    environment.isWebadmin &&
                    (error.name === 'TimeoutError' || error.statusText === 'Gateway Timeout')
                ) {
                    this.appState.systemAvailable$.next(false);
                }
            }),
        );
    }

    protected post<T>(url: string, data?: unknown, opts?: WithoutRT) {
        const {
            params: _params = {},
            headers: _headers = {},
            timeout: customTimeout = 60000,
        } = opts ?? {};
        let params = new HttpParams({ fromObject: _params });
        let headers = new HttpHeaders(_headers);

        if (!environment.isWebadmin && this.authPost) {
            params = params.append('auth', this.authPost);
        }
        if (this.serverId) {
            headers = headers.set('X-Server-Guid', this.serverId);
        }
        if (environment.isWebadmin) {
            headers = headers.set('X-Runtime-Guid', this.cookieService.get('x-runtime-guid'));
        }

        const fullUrl = `${this.urlBase}${url}`;

        return this.http.post<T>(fullUrl, data || {}, { params, headers }).pipe(
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
                        return from(this.unauthorizedCallback(true));
                    } else if (error.status === 503) {
                        // Repeat the request once again for 503 error
                        return of('');
                    }
                }
                return throwError(error);
            }),
        );
    }

    protected getRequestAggregator<U extends readonly (keyof GetEndpoints)[]>(
        urls: U,
        headers?: Record<string, string>,
    ): Observable<AggregatedResp<U>>;
    protected getRequestAggregator<T = never>(
        urls: string[],
        headers?: Record<string, string>,
    ): Observable<T>;
    protected getRequestAggregator(
        urls: string[],
        headers?: Record<string, string>,
    ): Observable<unknown> {
        let params = new HttpParams();
        urls.forEach(url => {
            params = params.append('exec_cmd', url);
        });
        const url = `/api/aggregator?${params.toString()}`;
        return this.get(url, { headers });
    }

    protected proxy = proxyLegacyV1;
    currentRelayHost = '';

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

    /* Authentication */
    getAuthKeys() {
        const { authGet, authPost, authPlay } = this;
        return { authGet, authPost, authPlay };
    }

    public isSessionFresh(): Observable<any> {
        throw Error(this.notImplementedMsg);
    }

    @memoizeAsync(defaultHashFunction, forceReload => !!forceReload, 10 * 1000)
    public getCurrentUser(forceReload?: boolean): Promise<SystemUser> {
        let headers: RequestOpts['headers'];
        if (forceReload) {
            // Clean cache to
            this.currentUser = undefined;
            this.userRequest = undefined;
            headers = { 'reset-cache': 'reset' };
        }
        if (this.currentUser) {
            // We have user - return him right away
            return Promise.resolve(this.currentUser);
        }
        if (this.userRequest) {
            // Currently requesting user
            return this.userRequest;
        }
        const endpoint = '/api/getCurrentUser';
        this.cacheService.addToCache(endpoint);
        this.userRequest = firstValueFrom(this.get(endpoint, { headers })).then(({ reply }) => {
            this.currentUser = reply;
            return this.currentUser;
        });
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
            return firstValueFrom(this.get('/static/openapi_legacy.json'));
        }
    }

    @memoizeAsyncPersistent
    fetchApiToolJSON(route: string) {
        return firstValueFrom(this.get<APIDoc>(`/static/${route}`));
    }

    getAPIToolManifest(): Promise<MenuManifest | LegacyMenuManifest | undefined> {
        return Promise.resolve(apiTool.legacyManifest);
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
        return firstValueFrom(
            this.post('/api/cookieLogout').pipe(
                tap(() => {
                    this.cookieService.delete('x-runtime-guid');
                }),
            ),
        );
    }

    logUrl(params: { name?: string; lines?: number }) {
        return firstValueFrom(
            this.get('/api/showLog', {
                params: { ...params },
                headers: { 'Content-Type': 'text' },
                responseType: 'text',
            }),
        );
    }

    @memoizeAsyncMedium
    getSystemSettings() {
        return getSystemSettingsLegacyV1.apply(this);
    }

    changeSystemName(systemName: string) {
        return firstValueFrom(this.updateOrGetSettings({ systemName }));
    }

    configureServer(configureParams: ConfigureParams) {
        return firstValueFrom(this.post<any>('/api/configure', configureParams));
    }

    changeAdminPassword(newPassword: string, currentPassword: string) {
        return this.configureServer({ password: newPassword, currentPassword });
    }

    ping() {
        return this.get('/api/ping', {
            params: { 'x-server-guid': cleanIdLegacy(this.serverId) },
        });
    }

    private updateRelayHost$ = new Subject<null>();
    private relayHost$ = this.updateRelayHost$.pipe(
        startWith(null),
        throttleTime(5000),
        switchMap(() =>
            fetch(`${this.urlBase}/api/ping?x-server-guid=${cleanIdLegacy(this.serverId)}`).then(
                response => new URL(response.url).host,
            ),
        ),
        shareReplay({ bufferSize: 1, refCount: false }),
    );

    public getRelayHost(): Observable<string> {
        this.updateRelayHost$.next(null);
        return this.relayHost$;
    }

    @memoizeAsyncPersistent
    getStatistics(salt: number): Observable<Statistics> {
        return this.get('/api/statistics', { params: { salt } });
    }

    checkInternet(reload = true) {
        return firstValueFrom(this.getModuleInfo()).then(res =>
            res.reply.serverFlags.includes('SF_HasPublicIP'),
        );
    }

    checkLocalIfNew(reload = true) {
        return environment.isWebadmin ? Promise.resolve({}) : firstValueFrom(this.getModuleInfo());
    }

    createEvent = createEventLegacyV1;

    /**
     * @deprecated remove method once support for 4.2 systems is dropped.
     */
    backupControl(action?: 'start' | 'stop') {
        return firstValueFrom(
            this.get<any>('/api/backupControl', action ? { params: { action } } : {}),
        );
    }

    setAuthKeys(authGet: string, authPost: string, authPlay: string): void {
        this.authGet = authGet;
        this.authPost = authPost;
        this.authPlay = authPlay;
    }

    /* End of Authentication  */

    /* Server settings */
    public getServerTimes(): Observable<TimeOfServers> {
        return this.get('/ec2/getTimeOfServers');
    }

    // protected getSystemTime(): Observable<t.SystemTime> {
    //     return this.get('/api/synchronizedTime');
    // }

    public settingsUpdater$ = new BehaviorSubject('');

    @memoizeAsyncPersistent
    public getSettings(): Observable<SystemSettingsResp> {
        return this.settingsUpdater$.pipe(switchMap(() => this.get('/api/systemSettings')));
    }

    // TODO: Split this into two
    public updateOrGetSettings(params: Partial<Settings> = {}) {
        const update = Object.keys(params).length > 0;
        return update
            ? this.get<SystemSettingsResp>('/api/systemSettings', { params }).pipe(
                  tap(() => this.settingsUpdater$.next('')),
              )
            : this.getSettings();
    }

    @memoizeAsyncPersistent
    getSettingsDocumentation(): Promise<ServerDocumentation> {
        return firstValueFrom(this.get('/api/settingsDocumentation'));
    }

    /**
     * Start of Storage
     */
    public getStoragesInfo(params?) {
        return this.get<ec2Storage[]>('/ec2/getStorages', { params });
    }

    @memoizeAsyncLong
    public getStorageAnalytics(): Observable<StorageAnalytics> {
        const analyticsEndpoint = '/ec2/analyticsLookupObjectTracks?limit=1';
        const getCamerasEndpoint = '/ec2/getCamerasEx';
        const getServerEndpoint = '/ec2/getMediaServersEx';
        return this.getRequestAggregator<
            NormalResponse<{
                [analyticsEndpoint]: unknown[];
                [getCamerasEndpoint]: GetEndpoints[typeof getCamerasEndpoint];
                [getServerEndpoint]: GetEndpoints[typeof getServerEndpoint];
            }>
        >([analyticsEndpoint, getCamerasEndpoint, getServerEndpoint]).pipe(
            map(({ reply }) => ({
                hasAnalyticsData: !!reply[analyticsEndpoint].length,
                hasPlugins: reply[getCamerasEndpoint].some(
                    ({ addParams, parentId }) =>
                        parentId === this.serverId &&
                        addParams.find(({ name }) => name === 'compatibleAnalyticsEngines'),
                ),
                metadataStorageId: reply[getServerEndpoint]
                    .find(({ id }) => id === this.serverId)
                    ?.addParams?.find(({ name }) => name === 'metadataStorageId')?.value,
            })),
        );
    }

    public getStorages(useCache = false, customTimeout = this.storageRequestTimeout) {
        return this.get<NormalResponse<any>>('/api/storageSpace', {
            headers: this.cacheHeader(useCache),
            timeout: customTimeout,
        });
    }

    public getStorageStatus(params) {
        return this.get<NormalResponse<any>>('/api/storageStatus', {
            params,
            timeout: 60000,
        });
    }

    saveStorage = saveStorageLegacyV1;

    removeStorage = removeStorageLegacyV1;

    updateStorages(updateParams: SaveStoragePayload[], customTimeout = 8000) {
        return this.post<any>('/ec2/saveStorages', updateParams, { timeout: customTimeout });
    }

    rebuildArchive(type: number, action?: string): Observable<RebuildArchiveResponse> {
        let url = `/api/rebuildArchive?mainPool=${type}`;
        if (action) {
            url += `&action=${action}`;
        }
        return this.get(url);
    }

    protected storageRequestTimeout = 2 * 60 * 1000;

    @memoizeAsyncLong
    checkForAnalyticsData() {
        const params = {
            startTime: 0,
            endTime: Number.MAX_SAFE_INTEGER,
            limit: 1,
        };
        return this.get('/ec2/analyticsLookupObjectTracks', {
            params,
            timeout: this.storageRequestTimeout,
        });
    }

    // End of storage

    getCameraHistoryItems(): Observable<Ec2CameraHistoryItems> {
        return this.get('/ec2/getCameraHistoryItems');
    }

    @memoizeAsync(defaultHashFunction, useCache => !useCache, 10 * 1000)
    getServerStats(useCache = false) {
        return this.get<NormalResponse<any>>('/api/metrics/values', {
            headers: this.cacheHeader(useCache),
        });
    }

    changePort(port: number) {
        return this.configureServer({ port }).catch(err => Promise.reject(err));
    }

    renameServer(serverId: string, serverName: string) {
        return firstValueFrom(
            this.post<ChangedIdReturned>('/ec2/saveMediaServerUserAttributes', {
                serverId,
                serverName,
            }),
        );
    }

    saveServerUserSettings(serverId: string, param: { [key: string]: string }) {
        const [key, value] = Object.entries(param)[0];
        return firstValueFrom(
            this.post<ChangedIdReturned>('/ec2/saveMediaServerUserAttributes', {
                serverId,
                [key]: value,
            }),
        );
    }

    @memoizeAsyncLong
    getAnalyticsEngines() {
        return this.get('/ec2/getAnalyticsEngines');
    }

    saveCameraUserSettings(cameraId: string, param: { [key: string]: string }) {
        const [key, value] = Object.entries(param)[0];
        return firstValueFrom(
            this.post<ChangedIdReturned>('/ec2/saveCameraUserAttributes', {
                cameraId,
                [key]: value,
            }),
        );
    }

    restartServer(serverId?: string) {
        return firstValueFrom(this.post<RestartServer>('/api/restart')).catch(err =>
            Promise.reject(err),
        );
    }

    @memoizeAsyncMedium
    getModuleInfo(): Observable<ModuleInformation> {
        return this.get('/api/moduleInformation');
    }

    @memoizeAsyncMedium
    getModuleInfoUsingUrl(url: string): Observable<ModuleInformation> {
        return this.http.get<ModuleInformation>(`${url}/api/moduleInformation`);
    }

    detachFromSystem(currentPassword: string, serverId?: string) {
        return this.post<NormalResponse<any>>('/api/detachFromSystem', {
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

    getHardwareIdsOfServers(): Observable<ServerHardareIdsResp> {
        return this.get('/ec2/getHardwareIdsOfServers');
    }

    getLicenses(): Observable<GetLicenses> {
        const routes = ['/ec2/getLicenses', '/ec2/getHardwareIdsOfServers'] as const;
        return this.getRequestAggregator(routes).pipe(
            map(({ reply }) => ({
                licenses: reply[routes[0]],
                hwids: reply[routes[1]].reply.flatMap(ids => ids.hardwareIds),
            })),
        );
    }

    activateLicense(key) {
        const params = { key }; // 3.2 systems expect key as param
        return this.post('/api/activateLicense', { licenseKey: key }, { params });
    }

    logLevel(logId?: string, name?: string, value?: string): Observable<LogLevel> {
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

    @memoizeAsyncShort
    getAllRoles(): Observable<Role[]> {
        return this.get('/ec2/getUserRoles').pipe(
            map(roles =>
                [...this.CONFIG.accessRoles.predefinedRoles, ...roles].map(role => ({
                    ...role,
                    permissions: role.permissions.split('|').sort().join('|'),
                })),
            ),
        );
    }
    getAggregatedUsersData(): Observable<AggregatedUsers> {
        const routes = ['/ec2/getUsers', '/ec2/getUserRoles'] as const;
        return this.getRequestAggregator(routes);
    }

    saveUser(user: LegacyNewUser | LegacyUser): Observable<ChangedIdReturned> {
        return this.post<ChangedIdReturned>('/ec2/saveUser', this.cleanUserObject(user));
    }

    deleteUser(userId: string) {
        return this.post<ChangedIdReturned>('/ec2/removeUser', {
            id: userId,
        });
    }

    protected cleanUserObject(user: LegacyNewUser | LegacyUser): Partial<LegacyUser> {
        const supportedFields: (keyof ec2SaveUser)[] = [
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
    getCamera(id: string): Observable<PreprocessCamera> {
        const params = { id: cleanIdLegacy(id) };
        return this.get<ec2CameraEx[]>('/ec2/getCamerasEx', { params }).pipe(
            map(cameras => cameras[0]),
        );
    }

    @memoizeAsyncShort
    getCamerasAndServerTime(): Observable<CamerasAndServerTimes> {
        const routes = ['/ec2/getCamerasEx', '/ec2/getTimeOfServers'] as const;
        return this.getRequestAggregator(routes).pipe(
            map(({ reply }) => ({
                cameras: reply[routes[0]],
                serverTimes: reply[routes[1]].reply,
            })),
        );
    }

    /**
     * @deprecated Setting resource params is deprecated and should not be used with 5.1+ systems.
     *
     * The `/rest/v#/devices/{deviceId}` and `rest/v#/servers/{serverId}` endpoints should be used instead.
     *
     * ResourceParams are now included on the parameters property of both these endpoints.
     *
     * Parameters are incrementally being moved out of the parameters property. We can't really
     * use the generic way of setting parameters anymore because the permissions for this endpoint
     * are different and a lot of times throws a 403 on newer systems even if you have the correct
     * credentials.
     *
     * We probably need to update the type signature of the parameters property to omit any key within
     * the parent type.
     *
     * @param params - An array of ResourceParams to update
     * @returns EmptyObjectReturned
     */
    setResourceParams(params: ResourceParam[]) {
        return this.post<EmptyObjectReturned>('/ec2/setResourceParams', params);
    }

    updateRecordingSettings({
        id: cameraId,
        name: cameraName,
        ...params
    }: SaveCameraUserAttributes) {
        return this.post<ChangedIdReturned>('/ec2/saveCameraUserAttributes', {
            cameraName,
            cameraId,
            ...params,
        });
    }

    @memoizeAsync(defaultHashFunction, useCache => !useCache, 60 * 1000)
    getMediaServers(useCache: boolean): Observable<PreprocessServer[]> {
        const endpoint = '/ec2/getMediaServersEx';
        return this.get(endpoint, {
            headers: this.cacheHeader(useCache),
        }).pipe(
            map(servers =>
                servers.map(({ osInfo, networkAddresses, ...rest }) => ({
                    ...rest,
                    osInfo: JSON.parse(osInfo),
                    endpoints: networkAddresses ? networkAddresses.split(';') : [],
                })),
            ),
        );
    }

    @memoizeAsyncMedium
    getViewMediaServersAndCameras(): Observable<ViewMediaServersAndCameras> {
        const routes = ['/ec2/getMediaServersEx', '/ec2/getCamerasEx'] as const;
        return this.getRequestAggregator(routes).pipe(
            map(res => {
                const mediaServers = res.reply['/ec2/getMediaServersEx'].map(
                    ({ networkAddresses, id, name, status }) => ({
                        id,
                        name,
                        status,
                        endpoints: networkAddresses.split(';'),
                    }),
                );
                const cameras = res.reply['/ec2/getCamerasEx'].map(({ addParams, ...cam_ }) => {
                    const {
                        id,
                        disableDualStreaming,
                        model,
                        name,
                        parentId,
                        preferredServerId,
                        scheduleEnabled,
                        status,
                        url,
                    } = cam_;
                    const cam: Omit<ViewBaseCamera, 'mediaStreams' | 'rotation' | 'deviceType'> = {
                        id,
                        disableDualStreaming,
                        model,
                        name,
                        parentId,
                        preferredServerId,
                        scheduleEnabled,
                        status,
                        url,
                    };

                    const mediaStreamsRawValue = addParams.find(
                        p => p.name === 'mediaStreams',
                    )?.value;
                    const mediaStreams = mediaStreamsRawValue
                        ? (JSON.parse(mediaStreamsRawValue) as MediaStreams).streams
                        : [];

                    const rotationRawValue = addParams.find(p => p.name === 'rotation')?.value;
                    const rotation = rotationRawValue ? Number(rotationRawValue) : 0;

                    return {
                        ...cam,
                        deviceType: 'Camera',
                        mediaStreams,
                        rotation,
                    };
                });

                return {
                    mediaServers,
                    cameras,
                };
            }),
        );
    }

    // @memoizeAsyncPersistent
    // getResourceTypes(): Observable<t.GetResourceTypes> {
    //     return this.get('/ec2/getResourceTypes');
    // }

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
            cameraId: cleanIdLegacy(cameraId),
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
        startTime?: number,
        endTime?: number,
        detail?: number,
        limit?: number,
        label?: string,
        periodsType?: number,
    ): Observable<Ec2RecordedTimePeriodsResp> {
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
            cameraId: cleanIdLegacy(cameraId),
            detail,
            endTime,
            periodsType,
            startTime,
        };
        if (limit) {
            params.limit = limit;
        }
        // RecordedTimePeriods
        return this.get<Ec2RecordedTimePeriodsResp>(
            `/ec2/recordedTimePeriods?keepSmallChunks&${label || ''}`,
            { params },
        );
    }

    // TODO: param type
    recordedTimePeriods(params: RequestParams): Observable<Ec2RecordedTimePeriodsResp['reply']> {
        return this.get<Ec2RecordedTimePeriodsResp>('/ec2/recordedTimePeriods', { params }).pipe(
            map(({ reply }) => reply),
        );
    }

    /* End of Working with archive */

    /* Health Monitor */

    static memoizeHM = memoizeAsync(
        defaultHashFunction,
        forceUpdate => !!forceUpdate,
        healthMonitoring.staleReportTimeout * 60 * 1000,
    );

    @NxSystemAPI.memoizeHM
    getHealthManifest(): Observable<Manifests> {
        return this.get('/ec2/metrics/manifest');
    }

    @NxSystemAPI.memoizeHM
    getHealthValues(): Observable<Values> {
        return this.get('/ec2/metrics/values');
    }

    @NxSystemAPI.memoizeHM
    getHealthAlarms(): Observable<Alarms> {
        return this.get('/ec2/metrics/alarms');
    }

    @NxSystemAPI.memoizeHM
    getAggregateHealthReport(forceUpdate = false): Observable<HealthReport> {
        const endpoints = [
            '/ec2/metrics/alarms',
            '/ec2/metrics/manifest',
            '/ec2/metrics/values',
        ] as const;
        let params = new HttpParams();
        endpoints.forEach(endpoint => {
            params = params.append('exec_cmd', endpoint);
        });
        let headers: Record<string, string>;
        const secondsSinceUpdate = ((Date.now() - this.healthService.lastUpdate) / 1000) | 0;
        const stale = secondsSinceUpdate > this.CONFIG.cloudCapabilities.healthMonitorCacheTimeout;
        this.healthService.lastUpdate = Date.now();
        if (forceUpdate || stale) {
            this.cacheService.addToCache(`${this.urlBase}/api/aggregator?${params.toString()}`);
            headers = { 'reset-cache': 'reset' };
        }

        return this.getRequestAggregator(endpoints, headers);
    }
    // End of Health Monitor

    public getPlaybackUrl(
        cameraId: string,
        transport = 'webm',
        resolution = 'low',
        position = undefined,
        resolvedRelay = '',
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
                url = `${
                    resolvedRelay ? `wss://${resolvedRelay}` : this.getUrlBase('wss:')
                }/webrtc-tracker/?camera_id=${cleanIdLegacy(
                    cameraId,
                )}&x-server-guid=${cleanIdLegacy(this.serverId)}&`;
                break;
            case 'webRtc2':
                url = `${
                    resolvedRelay ? `wss://${resolvedRelay}` : this.getUrlBase('wss:')
                }/rest/v3/devices/${cleanIdLegacy(cameraId)}/webrtc?x-server-guid=${cleanIdLegacy(
                    this.serverId,
                )}&`;
                break;
            case 'hls':
                url = `${this.getUrlBase()}/web/hls/${cleanIdLegacy(
                    cameraId,
                )}.m3u8?${hlsResolutionOrEmpty(resolution)}&`;
                break;
            case 'rtsp':
                let urlBase = this.getUrlBase();
                // If we are in webadmin we need to have the origin or else https is not replaced with rtsp.
                if (!urlBase) {
                    urlBase = window.location.origin;
                }
                url = `${urlBase}/${cleanIdLegacy(cameraId)}?stream=${resolution}&`.replace(
                    /https?:\/\//,
                    'rtsp://',
                );
                break;
            default:
                // Rtsp plays as webm but does not support transcoding.
                if (transport === 'mjpeg') {
                    transport = 'webm';
                }
                url = `${this.getUrlBase()}/web/media/${cleanIdLegacy(
                    cameraId,
                )}.${transport}?resolution=${resolution || ''}&`;
        }

        if (
            this.authGet &&
            (this.version < 5.0 ||
                (!nxConfig.featureFlags.restCookieLogin && !transport.includes('webRtc')))
        ) {
            url += `auth=${this.authGet}&`;
        }
        if (position) {
            url += `${transport === 'webRtc' ? 'position' : 'pos'}=${position}&`;
        }
        return url;
    }

    /** Merge Systems */
    getPeerSystems(showAddresses = true): Observable<DiscoveredPeers> {
        return this.get('/api/discoveredPeers', {
            params: {
                showAddresses,
            },
        });
    }

    getServerInfo = getServerInfoLegacy;

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
        return this.post<MergeSystems>('/api/mergeSystems', data);
    }

    checkMergeStatus(forceReload = true): Observable<MergeStatus> {
        return this.get('/ec2/mergeStatus', {
            headers: this.cacheHeader(!forceReload),
        });
    }

    private getDigestKeys(adminPassword: string): Promise<{ getKey: string; postKey: string }> {
        return firstValueFrom(this.get('/api/getNonce')).then(({ nonce, realm }) => {
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
            return firstValueFrom(this.post('/api/mergeSystems', data));
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

    getEventRules(): Observable<EventRule[]> {
        return this.get('/ec2/getEventRules');
    }

    saveEventRule(eventRule: EventRule) {
        return this.post('/ec2/saveEventRule', eventRule);
    }

    ptz(ptzCommand: PtzCommand): Observable<unknown> {
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

    getLicenseSummariesOnActivation(): Observable<unknown> {
        throw new Error('should only be using rest');
    }

    updateLogLevel(logLevel: unknown): Observable<unknown> {
        throw new Error('should only be using rest v2 version');
    }

    addUser(user: unknown): Observable<unknown> {
        throw new Error('should only be using rest v2 version');
    }

    getCurrentWebadminBuild(): Observable<StaticWebContentInfo> {
        throw new Error('should only be using rest v2 version');
    }

    updateWebadmin(url: string, checksum?: string): Observable<StaticWebContentDownload> {
        throw new Error('should only be using rest v2 version');
    }
}
