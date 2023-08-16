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
import { LegacyNewUser, LegacyUser, Role, SystemUser } from '@services/system-user.types';
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
    WithoutRT,
} from './mediaserver-apis/connections/adapters/adapter-target-types';
import type {
    RequestOpts,
    WithResponseType,
} from './mediaserver-apis/connections/adapters/adapter-target-types';
import type { addUserRestV1 } from './mediaserver-apis/endpoints/add-user';
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
import type {
    AggregatedUsers,
    ViewMediaServersAndCameras,
    CamerasAndServerTimes,
    AggregatedResp,
    StorageAnalytics,
    GetLicenses,
    HealthReport,
} from './system-api.aggregated-types';
import { AggregatedRoles } from './system-api.aggregated-types';
import type { GetEndpoints } from './system-api.endpoint-types';
import * as t from './system-api.types';
import type {
    PreprocessCamera,
    SaveCameraUserAttributes,
} from './system.service/camera-manager/camera-manager-types';
import type { SaveStoragePayload } from './system.service/storage-manager/storage';
import type { PreprocessServer } from './system.service/system-types';
import { NxUriCacheService } from './uri-cache.service';
import { WINDOW } from './window-provider';

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
    protected currentUser: SystemUser;
    protected userEmail: string;
    protected userRequest: Promise<SystemUser>;
    unauthorizedCallback: t.UnauthorizedCallback;
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
        unauthorizedCallback: t.UnauthorizedCallback,
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

        this.setAuthKeys('', '', '');
        this.userEmail = userEmail;
        this.systemId = systemId;
        this.serverId = serverId;
        this.unauthorizedCallback = unauthorizedCallback;
        this.currentRelayHost = this.urlBase.split('://').pop();
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

    protected generateGetUrl(url: string, params_: RequestParams, absUrl?: boolean) {
        const params = new HttpParams({ fromObject: params_ });
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
        let params = new HttpParams({ fromObject: _params });
        let headers = new HttpHeaders(_headers);

        if (!environment.isLocal && this.authGet) {
            params = params.append('auth', this.authGet);
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
            timeout(customTimeout),
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

    protected post<T>(url: string, data?: unknown, opts?: WithoutRT) {
        const {
            params: _params = {},
            headers: _headers = {},
            timeout: customTimeout = 60000,
        } = opts ?? {};
        let params = new HttpParams({ fromObject: _params });
        let headers = new HttpHeaders(_headers);

        if (!environment.isLocal && this.authPost) {
            params = params.append('auth', this.authPost);
        }
        if (this.serverId) {
            headers = headers.set('X-Server-Guid', this.serverId);
        }
        if (environment.isLocal) {
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
        this.userRequest = this.get(endpoint, { headers })
            .toPromise()
            .then(({ reply }) => {
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
            return this.get('/static/openapi_legacy.json').toPromise();
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
            headers: { 'Content-Type': 'text' },
            responseType: 'text',
        }).toPromise();
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
        return this.post<any>('/api/configure', configureParams).toPromise();
    }

    changeAdminPassword(newPassword: string, currentPassword: string) {
        return this.configureServer({ password: newPassword, currentPassword });
    }

    ping() {
        return this.get('/api/ping');
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
    ): Observable<unknown> {
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

    /**
     * @deprecated remove method once support for 4.2 systems is dropped.
     */
    backupControl(action?: 'start' | 'stop') {
        return this.get<any>(
            '/api/backupControl',
            action ? { params: { action } } : {},
        ).toPromise();
    }

    setAuthKeys(authGet: string, authPost: string, authPlay: string): void {
        this.authGet = authGet;
        this.authPost = authPost;
        this.authPlay = authPlay;
    }

    /* End of Authentication  */

    /* Server settings */
    public getServerTimes(): Observable<t.TimeOfServers> {
        return this.get('/ec2/getTimeOfServers');
    }

    // protected getSystemTime(): Observable<t.SystemTime> {
    //     return this.get('/api/synchronizedTime');
    // }

    public settingsUpdater$ = new BehaviorSubject('');

    @memoizeAsyncPersistent
    public getSettings(): Observable<t.SystemSettingsResp> {
        return this.settingsUpdater$.pipe(switchMap(() => this.get('/api/systemSettings')));
    }

    // TODO: Split this into two
    public updateOrGetSettings(params: Partial<t.Settings> = {}) {
        const update = Object.keys(params).length > 0;
        return update
            ? this.get<t.SystemSettingsResp>('/api/systemSettings', { params }).pipe(
                  tap(() => this.settingsUpdater$.next('')),
              )
            : this.getSettings();
    }

    @memoizeAsyncPersistent
    getSettingsDocumentation(): Promise<t.ServerDocumentation> {
        return this.get('/api/settingsDocumentation').toPromise();
    }

    /**
     * Start of Storage
     */
    public getStoragesInfo(params?) {
        return this.get<t.ec2Storage[]>('/ec2/getStorages', { params });
    }

    @memoizeAsyncLong
    public getStorageAnalytics(): Observable<StorageAnalytics> {
        const analyticsEndpoint = '/ec2/analyticsLookupObjectTracks?limit=1';
        const getCamerasEndpoint = '/ec2/getCamerasEx';
        const getServerEndpoint = '/ec2/getMediaServersEx';
        return this.getRequestAggregator<
            t.NormalResponse<{
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

    public getStorages(useCache = false, customTimeout = 8000) {
        return this.get<t.NormalResponse<any>>('/api/storageSpace', {
            headers: this.cacheHeader(useCache),
            timeout: customTimeout,
        });
    }

    public getStorageStatus(params) {
        return this.get<t.NormalResponse<any>>('/api/storageStatus', {
            params,
            timeout: 60000,
        });
    }

    saveStorage = saveStorageLegacyV1;

    removeStorage = removeStorageLegacyV1;

    updateStorages(updateParams: SaveStoragePayload[], customTimeout = 8000) {
        return this.post<any>('/ec2/saveStorages', updateParams, { timeout: customTimeout });
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
            headers: this.cacheHeader(useCache),
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
    getHardwareIdsOfServers(): Observable<t.ServerHardareIdsResp> {
        return this.get('/ec2/getHardwareIdsOfServers');
    }

    @memoizeAsyncMedium
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

    @memoizeAsyncShort
    getAllRoles(): Observable<Role[]> {
        const endpoints = ['/ec2/getPredefinedRoles', '/ec2/getUserRoles'];
        return this.getRequestAggregator<AggregatedRoles>(endpoints).pipe(
            map(({ reply }) =>
                Object.values(reply).flatMap(roles =>
                    roles.map(role => ({
                        ...role,
                        permissions: role.permissions.split('|').sort().join('|'),
                    })),
                ),
            ),
        );
    }
    getAggregatedUsersData(): Observable<AggregatedUsers> {
        const routes = ['/ec2/getUsers', '/ec2/getPredefinedRoles', '/ec2/getUserRoles'] as const;
        return this.getRequestAggregator(routes);
    }

    saveUser(user: LegacyNewUser | LegacyUser): Observable<t.ChangedIdReturned> {
        return this.post<t.ChangedIdReturned>('/ec2/saveUser', this.cleanUserObject(user));
    }

    deleteUser(userId: string) {
        return this.post<t.ChangedIdReturned>('/ec2/removeUser', {
            id: userId,
        });
    }

    protected cleanUserObject(user: LegacyNewUser | LegacyUser): Partial<LegacyUser> {
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
    getCamera(id: string): Observable<PreprocessCamera> {
        const params = { id: this.cleanId(id) };
        return this.get<t.ec2CameraEx[]>('/ec2/getCamerasEx', { params }).pipe(
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
        return this.getRequestAggregator(routes);
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
    ): Observable<t.Ec2RecordedTimePeriodsResp> {
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
        return this.get<t.Ec2RecordedTimePeriodsResp>(
            `/ec2/recordedTimePeriods?keepSmallChunks&${label || ''}`,
            { params },
        );
    }

    // TODO: param type
    recordedTimePeriods(params: RequestParams): Observable<t.Ec2RecordedTimePeriodsResp['reply']> {
        return this.get<t.Ec2RecordedTimePeriodsResp>('/ec2/recordedTimePeriods', { params }).pipe(
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
    getHealthManifest(): Observable<t.Manifests> {
        return this.get('/ec2/metrics/manifest');
    }

    @NxSystemAPI.memoizeHM
    getHealthValues(): Observable<t.Values> {
        return this.get('/ec2/metrics/values');
    }

    @NxSystemAPI.memoizeHM
    getHealthAlarms(): Observable<t.Alarms> {
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
        deliveryMethod = '',
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
            case 'webRtc2':
                url = `${this.getUrlBase('wss:')}/rest/v3/devices/${this.cleanId(
                    cameraId,
                )}/webrtc?x-server-guid=${this.cleanId(this.serverId)}&api=v2&deliveryMethod=${
                    deliveryMethod || 'srtp'
                }&`;
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

        if (this.authGet && (this.version < 5.0 || !this.CONFIG.featureFlags.restCookieLogin)) {
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

    checkMergeStatus(forceReload = true): Observable<t.MergeStatus> {
        return this.get('/ec2/mergeStatus', {
            headers: this.cacheHeader(!forceReload),
        });
    }

    private getDigestKeys(adminPassword: string): Promise<{ getKey: string; postKey: string }> {
        return this.get('/api/getNonce')
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

    getEventRules(): Observable<t.EventRule[]> {
        return this.get('/ec2/getEventRules');
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
    ) as typeof addUserRestV1;
}
