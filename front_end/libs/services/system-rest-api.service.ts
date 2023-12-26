import { Location } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injector } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { SessionStorageService } from 'ngx-webstorage';
import {
    BehaviorSubject,
    combineLatest,
    firstValueFrom,
    forkJoin,
    from,
    Observable,
    of,
    throwError,
} from 'rxjs';
import {
    catchError,
    filter,
    map,
    mergeMap,
    retry,
    retryWhen,
    share,
    switchMap,
    tap,
    throttleTime,
    timeout,
} from 'rxjs/operators';

import { environment } from '@environments/environment';
import type { APIDoc } from '@pages/api-tool/api-tool-types';
import { NxHealthService } from '@pages/health/health.service';
import {
    bookmarksDeviceKeys,
    type BookmarksDevice,
} from '@pages/systems/bookmarks/bookmarks.types';
import { addUserRestV1 } from '@services/mediaserver-apis/endpoints/add-user';
import { getPredefinedRolesLegacy } from '@services/mediaserver-apis/endpoints/get-predefined-roles';
import { getUserRolesRestV1 } from '@services/mediaserver-apis/endpoints/get-user-roles';
import { getUsersRestV1 } from '@services/mediaserver-apis/endpoints/get-users';
import { NxStorageService } from '@services/storage.service';
import { SystemUser, RestV1User, NxUser, Role, UserType } from '@services/system-user.types';
import {
    serverKeyMapV1,
    type RestV1ServerCompat,
    ViewBaseCamera,
    ViewPreprocessServer,
} from '@services/system.service/system-server-types';
import { buildTopLevelKeyMap, cleanIdLegacy } from '@utils/general';
import { InterceptorManager } from '@utils/interceptor-manager';
import {
    defaultHashFunction,
    memoizeAsync,
    memoizeAsyncLong,
    memoizeAsyncMedium,
    memoizeAsyncPersistent,
    memoizeAsyncShort,
} from '@utils/memoize';
import { withKeyMap, NxRecursiveKeyMap, NxRecursivePick, ZERO_ID } from '@utils/nx';
import { startWithCache } from '@utils/start-with-cached';

import { apiTool, servers } from '../variables/static-variables';

import type {
    MediaserverRestConnection,
    RequestOpts,
    RequestParams,
    WithOptionalJson,
    WithResponseType,
    WithoutRT,
} from './mediaserver-apis/connections/adapters/adapter-target-types';
import { assertTransaction } from './mediaserver-apis/connections/methods/transaction-bus/types/transactions';
import { getRemoteServerInfoRestV1 } from './mediaserver-apis/endpoints/get-remote-info';
import { getServerInfoRestV1 } from './mediaserver-apis/endpoints/get-server-info';
import { createLayoutRestV1 } from './mediaserver-apis/endpoints/layout/create-layout';
import { deleteLayoutRestV1 } from './mediaserver-apis/endpoints/layout/delete-layout';
import { getLayoutRestV1 } from './mediaserver-apis/endpoints/layout/get-layout';
import { getLayoutsRestV1 } from './mediaserver-apis/endpoints/layout/get-layouts';
import { putLayoutRestV1 } from './mediaserver-apis/endpoints/layout/put-layout';
import { cleanUserObjectRest } from './mediaserver-apis/utils/clean-user-object';
import { useJsonRpc } from './mediaserver-apis/utils/use-json-rpc';
import { withSystemBusUpdates } from './mediaserver-apis/utils/with-system-bus-updates';
import { NxAppStateService } from './nx-app-state.service';
import type { APIDocType, MenuManifest } from './nx-config/base-config';
import { nxConfig } from './nx-config/config';
import type {
    AggregatedUsers,
    ViewMediaServersAndCameras,
    CamerasAndServerTimes,
    StorageAnalytics,
} from './system-api.aggregated-types';
import type {
    GetArrayTypesFull,
    GetEndpoints,
    GetEndpointsFull,
} from './system-api.endpoint-types';
import * as t from './system-api.types';
import { ChangedIdReturned, cameraKeyMapV1 } from './system-api.types';
import { NxSystemAPI } from './system-legacy-api.service';
import {
    DeviceType,
    type RestV1CameraCompat,
} from './system.service/camera-manager/camera-manager-types';
import { NxUriCacheService } from './uri-cache.service';

interface TokenResponse {
    access_token: string;
    refresh_token: string;
    scope: string;
    error?: string;
}

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
export class NxSystemRestAPI extends NxSystemAPI implements MediaserverRestConnection {
    readonly version: number;
    public readonly requiresPassword: boolean = false;
    private readonly cloudToken = 'cloudAccessToken';
    private readonly token = 'x-runtime-guid';
    private readonly refreshToken = 'refreshToken';
    protected injector: Injector;
    readonly sessionFreshnessSec: number = 600;

    protected _vmsToken: string;

    readonly apiDocURL: object = {
        main: '/swagger-ui/openapi_v1.json',
        legacy: '/swagger-ui/openapi_legacy.json',
        deprecated: '/swagger-ui/openapi_deprecated.json',
    };

    constructor(
        http: HttpClient,
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
        super(
            http,
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
        return !environment.isLocal || (this.currentUser as t.CurrentUser)?.type === 'cloud';
    }

    private get cloudAccessTokenName() {
        return `${this.systemId ? this.systemId + '-' : ''}${this.token}`;
    }

    public get accessToken(): string {
        return nxConfig.featureFlags.useAuthenticationInterceptor
            ? `${InterceptorManager.USE_SYSTEM_TOKEN}|${this.systemId}|${this.urlBase}/rest/v1/login/sessions/{accessToken}?setCookie=true`
            : this.sessionStorage.retrieve(this.cloudAccessTokenName);
    }

    public set accessToken(token: string) {
        const { accessToken, cloudAccessToken } = this.getTokens();
        if (
            this.isSessionOauth &&
            (accessToken || '').replace(InterceptorManager.USE_SYSTEM_TOKEN, '') &&
            cloudAccessToken
        ) {
            this.deleteToken(cloudAccessToken, accessToken).toPromise();
        }
        this.sessionStorage.clear(this.cloudAccessTokenName);
        this.sessionStorage.store(this.cloudAccessTokenName, token);
    }

    public setVmsToken(token) {
        this._vmsToken = token;
    }

    public get vmsToken() {
        return this._vmsToken;
    }

    private refreshTokens(
        refreshToken: string,
        isSystem?: boolean,
        remoteSystemId?: string,
    ): Observable<TokenResponse> {
        const params: any = {
            grant_type: 'refresh_token',
            response_type: 'token',
            refresh_token: refreshToken,
        };

        if (isSystem || remoteSystemId) {
            params.scope = `cloudSystemId=${remoteSystemId ?? this.CONFIG.cloudSystemId}`;
        }

        return this.http.post<TokenResponse>(`${this.CONFIG.cloudHost}/oauth/token/`, params);
    }

    private getTokens() {
        const storageService = this.storageService;
        const refreshToken = storageService.refreshToken;
        const accessToken = this.accessToken;
        const cloudAccessToken = storageService.cloudAccessToken;
        return { accessToken, cloudAccessToken, refreshToken };
    }

    @memoizeAsync(
        function (this: NxSystemRestAPI) {
            return this.accessToken;
        },
        () => false,
        Infinity,
    )
    public setAccessTokenAsCookie(): Observable<true | t.UserSession> {
        // Short circuit for new system, or if the token is already set as a cookie by the interceptor.
        if (
            this.CONFIG.newSystem ||
            !this.accessToken ||
            this.accessToken.includes(InterceptorManager.USE_SYSTEM_TOKEN)
        ) {
            return of(true);
        }
        return this.get<t.UserSession>(
            `/rest/v1/login/sessions/${this.accessToken}?setCookie=true`,
        ).pipe(
            catchError(e => {
                const location = this.window.location;
                if (
                    !environment.isLocal &&
                    [401, 403, 422].includes(e.status) &&
                    location.href.includes(this.systemId)
                ) {
                    location.reload();
                }
                throw e;
            }),
        );
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
        this.accessToken = '';
    }

    private deleteToken(cloudAccessToken, token) {
        const host = environment.isLocal ? this.CONFIG.cloudHost : '';
        return this.http.post(
            `${host}/api/systems/revokeToken`,
            { token },
            { headers: { Authorization: `Bearer ${cloudAccessToken}` } },
        );
    }

    protected retryHandler(request) {
        return request.pipe(
            mergeMap(
                (
                    error: {
                        status: number;
                        resultCode: string;
                        error: { error: string; errorId: string };
                        url: string;
                    },
                    attempt: number,
                ) => {
                    if (
                        attempt === 0 &&
                        error?.error?.errorId !== servers.errors.oldSessionErrorId
                    ) {
                        const storageService = this.storageService;
                        const refreshToken = storageService.refreshToken;
                        const errorId = error?.error?.errorId;

                        const isLoginRequest = error.url.includes('/rest/v1/login/sessions');
                        const isInvalidParamterError =
                            error.status === 422 && errorId === servers.errors.invalidParameter;
                        const isBadRequestError =
                            error.status === 400 && errorId === servers.errors.badRequest;

                        const expiredSession =
                            isLoginRequest && (isInvalidParamterError || isBadRequestError);
                        const authorizationError =
                            (!isLoginRequest && error.status >= 400 && error.status < 500) ||
                            error.resultCode === 'forbidden';

                        if (error.status === 503) {
                            return of('');
                        } else if (!refreshToken) {
                            if (expiredSession) {
                                return this.logout();
                            } else if (authorizationError) {
                                return from(this.unauthorizedCallback(true));
                            }
                        } else if (expiredSession || authorizationError) {
                            return this.refreshTokens(refreshToken, true).pipe(
                                catchError(error => {
                                    this.clearTokens();
                                    return throwError(error);
                                }),
                                switchMap(res => {
                                    // In webadmin if the token response has an error allow it to go to be handled by the login dialog.
                                    if (res.error) {
                                        return of(res);
                                    }
                                    return this.setTokens(res, true);
                                }),
                            );
                        }
                    }
                    return throwError(error);
                },
            ),
        );
    }

    generateHeaders(): any {
        let headers = new HttpHeaders();
        // if (!environment.isLocal && this.authGet) {
        //     params.auth = this.authGet;
        // }
        if (this._vmsToken) {
            headers = headers.set(this.token, this._vmsToken);
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
        return environment.isLocal;
    }

    // Legacy api requires runtime in the header of the request.
    private requiresToken(url) {
        return !url.includes('rest');
    }

    private parseRequestOpts(opts?: WithoutRT): {
        params: HttpParams;
        _headers: Record<string, string>;
        customTimeout: number;
    } {
        const {
            params: _params = {},
            headers: _headers = {},
            timeout: customTimeout = 60000,
        } = opts ?? {};
        const params = new HttpParams({ fromObject: _params });
        return { params, _headers, customTimeout };
    }

    private buildHeader(customHttpHeaders: Record<string, string> = {}, useToken = false) {
        const accessToken = this.accessToken;
        let headers = new HttpHeaders();
        if (useToken) {
            headers = headers.set(this.token, accessToken || this._vmsToken || '');
        }
        if (!environment.isLocal && accessToken) {
            if (!nxConfig.featureFlags.restCookieLogin) {
                headers = headers.set('x-runtime-guid', accessToken); // Adding this for CLOUD-10535. Safari keeps removing the auth headers.
            }
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

    #getHeaders = (customHttpHeaders: Record<string, string>, url = '') =>
        from(
            this.accessToken ? Promise.resolve(this.accessToken) : this.unauthorizedCallback(true),
        ).pipe(map(() => this.buildHeader(customHttpHeaders, this.requiresToken(url))));

    @useJsonRpc
    protected delete<T>(url: string, opts?: WithoutRT) {
        const { params, _headers, customTimeout } = this.parseRequestOpts(opts);

        if (this.requiresWeb(url)) {
            url = `/web${url}`;
        }
        const fullUrl = `${this.urlBase}${url}`;
        return this.#getHeaders(_headers, url).pipe(
            switchMap(headers =>
                this.http.delete<T>(fullUrl, {
                    headers,
                    params,
                }),
            ),
            retryWhen(request => this.retryHandler(request)),
            timeout(customTimeout),
            tap(undefined, error => {
                if (environment.isLocal && error.name === 'TimeoutError') {
                    this.appState.systemAvailable$.next(false);
                }
            }),
        );
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
    @memoizeAsync(defaultHashFunction, () => false, 1000)
    @useJsonRpc
    protected override get(url: string, opts?: RequestOpts): Observable<unknown> {
        const { params, _headers, customTimeout } = this.parseRequestOpts(opts);
        const responseType = opts?.responseType ?? 'json';

        if (this.requiresWeb(url)) {
            url = `/web${url}`;
        }
        const withCredentials =
            nxConfig.featureFlags.restCookieLogin &&
            url.includes('/rest/v1/login/sessions') &&
            url.includes('?setCookie=true');
        const fullUrl = `${this.urlBase}${url}`;
        return this.#getHeaders(_headers, url).pipe(
            switchMap(headers => {
                let request: Observable<unknown>;
                const otherOpts = { headers, params, withCredentials };
                if (responseType === 'json') {
                    request = this.http.get(fullUrl, { ...otherOpts, responseType });
                } else if (responseType === 'arraybuffer') {
                    request = this.http.get(fullUrl, { ...otherOpts, responseType });
                } else if (responseType === 'blob') {
                    request = this.http.get(fullUrl, { ...otherOpts, responseType });
                } else if (responseType === 'text') {
                    request = this.http.get(fullUrl, { ...otherOpts, responseType });
                }
                return request.pipe(startWithCache(fullUrl, { ...otherOpts, responseType }));
            }),
            retryWhen(request => this.retryHandler(request)),
            timeout(customTimeout),
            tap(undefined, error => {
                if (environment.isLocal && error.name === 'TimeoutError') {
                    this.appState.systemAvailable$.next(false);
                }
            }),
        );
    }

    /** Overload for array return with top level keys. */
    protected getWith<
        U extends keyof GetArrayTypesFull,
        K extends readonly (keyof GetArrayTypesFull[U])[],
    >(
        url: U,
        keys: K,
        opts?: WithOptionalJson,
    ): Observable<NxRecursivePick<GetArrayTypesFull[U], Record<K[number], true>>[]>;
    /** Overload for array return with key map. */
    protected getWith<
        U extends keyof GetArrayTypesFull,
        KM extends NxRecursiveKeyMap<GetArrayTypesFull[U]>,
    >(
        url: U,
        keyMap: KM,
        opts?: WithOptionalJson,
    ): Observable<NxRecursivePick<GetArrayTypesFull[U], KM>[]>;
    /** Overload for object return with top level keys. */
    protected getWith<
        U extends keyof GetEndpointsFull,
        K extends readonly (keyof GetEndpointsFull[U])[],
    >(
        url: U,
        keys: K,
        opts?: WithOptionalJson,
    ): Observable<NxRecursivePick<GetEndpointsFull[U], Record<K[number], true>>>;
    /** Overload for object return with key map. */
    protected getWith<
        U extends keyof GetEndpointsFull,
        KM extends NxRecursiveKeyMap<GetEndpointsFull[U]>,
    >(
        url: U,
        keyMap: KM,
        opts?: WithOptionalJson,
    ): Observable<NxRecursivePick<GetEndpointsFull[U], KM>>;
    /** A method for automatically typing requests using the `_with` parameter, which causes the
     * returned object(s) to only have the specified properties.
     */
    protected getWith(
        url: string,
        keysOrkeyMap: string[] | NxRecursiveKeyMap<unknown>,
        opts: WithOptionalJson = {},
    ): Observable<unknown> {
        const keyMap = Array.isArray(keysOrkeyMap)
            ? buildTopLevelKeyMap(keysOrkeyMap)
            : keysOrkeyMap;
        opts.params = { ...(opts.params ?? {}), _keepDefault: true, _with: withKeyMap(keyMap) };
        return this.get(url, opts);
    }

    @useJsonRpc
    protected post<T>(url: string, data?: Record<string, unknown>, opts?: WithoutRT) {
        const { params, _headers, customTimeout } = this.parseRequestOpts(opts);

        url = `${this.urlBase}${url}`;

        if (url.includes('/rest/v1/login/sessions')) {
            return this.#getHeaders(_headers, url).pipe(
                switchMap(headers => this.http.post<T>(url, data || {}, { params, headers })),
                // No need to use retryWhen() for Login or else it would send the Auth request twice if there's an error
                timeout(customTimeout),
            );
        }

        return this.#getHeaders(_headers, url).pipe(
            switchMap(headers => this.http.post<T>(url, data || {}, { params, headers })),
            retryWhen(request => this.retryHandler(request)),
            timeout(customTimeout),
        );
    }

    @useJsonRpc
    protected put<T>(url: string, data?: Record<string, unknown>, opts?: WithoutRT) {
        const { params, _headers, customTimeout } = this.parseRequestOpts(opts);

        if (this.requiresWeb(url)) {
            url = `/web${url}`;
        }

        url = `${this.urlBase}${url}`;

        return this.#getHeaders(_headers, url).pipe(
            switchMap(headers => this.http.put<T>(url, data || {}, { params, headers })),
            retryWhen(request => this.retryHandler(request)),
            timeout(customTimeout),
        );
    }

    @useJsonRpc
    protected patch<T>(url: string, data: Record<string, unknown>, opts?: WithoutRT) {
        const { params, _headers, customTimeout } = this.parseRequestOpts(opts);

        if (this.requiresWeb(url)) {
            url = `/web${url}`;
        }

        url = `${this.urlBase}${url}`;

        return this.#getHeaders(_headers, url).pipe(
            switchMap(headers => this.http.patch<T>(url, data || {}, { params, headers })),
            retryWhen(request => this.retryHandler(request)),
            timeout(customTimeout),
        );
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

        if (!this.CONFIG.newSystem) {
            const endpoint = `/rest/v1/login/sessions/${this.accessToken || 'current'}`;
            this.userRequest = this.get<t.UserSession>(endpoint, { headers })
                .toPromise()
                .then(result => {
                    if (!this.accessToken) {
                        this._vmsToken = result.token;
                    }
                    return this.get<RestV1User[]>('/rest/v1/users', {
                        params: { name: result.username, _keepDefault: true },
                    }).toPromise();
                })
                .then(result => {
                    // Todo: convert result to match getCurrentUser result.
                    this.currentUser = result[0];
                    return this.currentUser;
                })
                .catch(err => {
                    // Unknown session token
                    if (err.errorId === 'cantProcessRequest') {
                        this.accessToken = '';
                    }
                    return undefined;
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
        return this.getCurrentServerInfo().pipe(map(data => data.id === serverId));
    }

    public isSessionFresh() {
        if (this.CONFIG.newSystem || !this.accessToken) {
            return of(false);
        }
        return this.get<t.UserSession>(`/rest/v1/login/sessions/${this.accessToken}`).pipe(
            switchMap(res => {
                return of(res.ageS < this.sessionFreshnessSec);
            }),
        );
    }

    loginToken(username: string, password: string, remember: boolean): Observable<t.UserSession> {
        return this.post<t.UserSession>('/rest/v1/login/sessions', {
            username,
            password,
            setCookie: remember,
        }).pipe(
            map(data => {
                if (remember) {
                    this.setVmsToken(data.token);
                }
                return data;
            }),
        );
    }

    loginTokenUrl(token: string): Observable<any> {
        return this.get(`/rest/v1/login/sessions/${token}`, { params: { setCookie: true } });
    }

    loginOauth(code: string, skipSetting?: boolean) {
        const params = {
            code,
            grant_type: 'authorization_code',
            response_type: 'token',
        };
        return this.http
            .get<TokenResponse>(`${this.CONFIG.cloudHost}/oauth/token/`, { params })
            .pipe(
                switchMap(tokens => {
                    if (skipSetting) {
                        return of(tokens);
                    }
                    return this.setTokens(tokens, false).pipe(
                        switchMap(() => this.refreshTokens(tokens.refresh_token, true)),
                    );
                }),
                switchMap(systemTokens => {
                    // In webadmin if the token response has an error allow it to go to be handled by the login dialog.
                    if (!skipSetting && !systemTokens.error) {
                        return this.setTokens(systemTokens, true).pipe(map(() => systemTokens));
                    }
                    return of(systemTokens);
                }),
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
            scope: `${this.CONFIG.cloudHost.replace(
                /http?s:\/\//,
                '',
            )}/cdb/oauth2/token cloudSystemId=${allSystems ? '*' : this.CONFIG.cloudSystemId}`,
        });
        this.window.location.href = `${this.CONFIG.cloudHost}/authorize?${params.toString()}`;
    }

    async logout() {
        let { accessToken, cloudAccessToken, refreshToken } = this.getTokens();
        let cloudLogoutObservable = of({});
        if (this.CONFIG.cloudSystemId && refreshToken) {
            // Generate new tokens if they are missing
            if (!accessToken) {
                const res = await firstValueFrom(this.refreshTokens(refreshToken, true));
                // eslint-disable-next-line camelcase
                accessToken = res.access_token;
            }
            if (!cloudAccessToken) {
                const res = await firstValueFrom(this.refreshTokens(refreshToken, false));
                // eslint-disable-next-line camelcase
                cloudAccessToken = res.access_token;
            }
            cloudLogoutObservable = this.http.post(`${this.CONFIG.cloudHost}/oauth/logout/`, {
                accessToken,
                cloudAccessToken,
                refreshToken,
            });
        }
        return cloudLogoutObservable
            .pipe(
                map(() => this.delete(`/rest/v1/login/sessions/${accessToken || this._vmsToken}`)),
                map(() => this.clearTokens()),
            )
            .toPromise();
    }

    @memoizeAsyncPersistent
    getApiDoc(type: APIDocType = 'main'): Promise<APIDoc> {
        return this.get(this.apiDocURL[type]).toPromise();
    }

    @memoizeAsyncPersistent
    fetchApiToolJSON(route: string): Promise<APIDoc> {
        return this.get<APIDoc>(`/static/${route}`).toPromise();
    }

    @memoizeAsyncPersistent
    getAPIToolManifest(): Promise<MenuManifest> {
        return this.get('/static/openapi_manifest.json')
            .toPromise()
            .catch(() => apiTool.defaultManifest);
    }

    @memoizeAsyncPersistent
    getApiChangelog(): Promise<string> {
        return this.http
            .get(`${this.urlBase}/web/static/api_changelog.md`, { responseType: 'text' })
            .toPromise();
    }

    @memoizeAsyncPersistent
    getApiPreamble(): Promise<string> {
        return this.http
            .get(`${this.urlBase}/web/static/api_preamble.md`, { responseType: 'text' })
            .toPromise();
    }

    protected updateSystemSettings$ = new BehaviorSubject('');

    getSystemSettings(): Promise<any> {
        this.updateSystemSettings$.next('update');
        return firstValueFrom(this.getSystemSettingsHandler());
    }

    @memoizeAsyncPersistent
    protected getSystemSettingsHandler() {
        return this.updateSystemSettings$.pipe(
            throttleTime(1000),
            switchMap(() =>
                this.get<t.Settings>('/rest/v1/system/settings', {
                    params: { _keepDefault: true },
                }),
            ),
            retry(3),
        );
    }

    updateOrGetSettings(updateParams: Partial<t.Settings> = {}) {
        return (
            Object.keys(updateParams).length > 0
                ? this.patch<t.Settings>('/rest/v1/system/settings', updateParams)
                : this.getSystemSettingsHandler()
        ).pipe(
            map<t.Settings, t.SystemSettingsResp>(data => ({
                error: '0',
                errorString: '',
                reply: { settings: data },
            })),
        );
    }

    getMediaServers(useCache: boolean): Observable<RestV1ServerCompat[]> {
        const endpoint = '/rest/v1/servers';
        return this.getWith(endpoint, serverKeyMapV1, {
            headers: this.cacheHeader(useCache),
        });
    }

    private patchCameraCompatibilityV1(
        camera: NxRecursivePick<t.DeviceV1Full, typeof cameraKeyMapV1>,
    ): RestV1CameraCompat {
        const { serverId, options, parameters: params, motion, schedule, ...rest } = camera;
        const {
            isAudioEnabled: audioEnabled,
            isControlEnabled: controlEnabled,
            isDualStreamingDisabled,
            ...backupOpts
        } = options;
        const { deviceType = DeviceType.Camera, ...parameters } = params;
        const { type: motionType, mask: motionMask } = motion;
        const { isEnabled: scheduleEnabled, tasks: scheduleTasks } = schedule;
        return {
            ...rest,
            parentId: serverId,
            audioEnabled,
            controlEnabled,
            deviceType,
            disableDualStreaming: isDualStreamingDisabled,
            ...backupOpts,
            parameters,
            motionType,
            motionMask,
            scheduleEnabled,
            scheduleTasks,
        };
    }

    getCamera(id: string): Observable<RestV1CameraCompat> {
        return this.getWith('/rest/v1/devices', cameraKeyMapV1, {
            params: { id: cleanIdLegacy(id) },
        }).pipe(map(cameras => this.patchCameraCompatibilityV1(cameras[0])));
    }

    @memoizeAsyncShort
    getCamerasAndServerTime(): Observable<CamerasAndServerTimes> {
        return combineLatest([this.getServerTimes(), this.getCameras()]).pipe(
            map(([serverTimesResp, cameras]) => ({
                serverTimes: serverTimesResp.reply,
                cameras,
            })),
        );
    }

    getCameras(): Observable<RestV1CameraCompat[]> {
        return this.getWith('/rest/v1/devices', cameraKeyMapV1).pipe(
            map(cameras => cameras.map(this.patchCameraCompatibilityV1)),
        );
    }

    getCameraCredentials(id: string): Observable<t.DeviceV1Full['credentials']> {
        return this.getWith('/rest/v1/devices', ['credentials'], {
            params: { id },
        }).pipe(map(cameras => cameras[0].credentials));
    }

    protected getViewMediaServers(): Observable<ViewPreprocessServer[]> {
        return this.getWith('/rest/v1/servers', ['id', 'name', 'status', 'endpoints']);
    }

    protected getViewCameras(): Observable<ViewBaseCamera[]> {
        const viewCamKeyMap = {
            ...buildTopLevelKeyMap(['id', 'model', 'name', 'status', 'url', 'serverId']),
            options: {
                isDualStreamingDisabled: true,
                preferredServerId: true,
            },
            schedule: {
                isEnabled: true,
            },
            parameters: {
                deviceType: true,
                mediaStreams: true,
                rotation: true,
            },
        } as const;

        return this.getWith('/rest/v1/devices', viewCamKeyMap).pipe(
            map(cameras =>
                cameras.map(
                    ({
                        options: { isDualStreamingDisabled, preferredServerId },
                        schedule: { isEnabled: scheduleEnabled },
                        serverId,
                        parameters = {},
                        ...camera
                    }) => {
                        return {
                            ...camera,
                            scheduleEnabled,
                            parentId: serverId,
                            disableDualStreaming: isDualStreamingDisabled,
                            preferredServerId:
                                preferredServerId !== ZERO_ID ? preferredServerId : serverId,
                            rotation: parameters.rotation || 0,
                            mediaStreams: parameters.mediaStreams?.streams ?? [],
                            deviceType: parameters.deviceType,
                        };
                    },
                ),
            ),
        );
    }

    @memoizeAsyncMedium
    getViewMediaServersAndCameras(): Observable<ViewMediaServersAndCameras> {
        return combineLatest([this.getViewMediaServers(), this.getViewCameras()]).pipe(
            map(([mediaServers, cameras]) => ({
                mediaServers,
                cameras,
            })),
        );
    }

    public getServerTimes(): Observable<t.TimeOfServers> {
        return this.get('/ec2/getTimeOfServers');
    }

    @memoizeAsyncLong
    public getStorageAnalytics(): Observable<StorageAnalytics> {
        const getAnalytics = this.get<unknown[]>('/ec2/analyticsLookupObjectTracks', {
            params: { limit: 1 },
            timeout: this.storageRequestTimeout,
        });
        const cameraKeyMap = {
            serverId: true,
            parameters: { compatibleAnalyticsEngines: true },
        } satisfies NxRecursiveKeyMap<t.DeviceV1Full>;
        const getCameras = this.getWith('/rest/v1/devices', cameraKeyMap);
        const getServer = this.getWith('/rest/v1/servers', ['metadataStorageId'], {
            params: { id: this.serverId },
        }).pipe(map(([server]) => server));

        return combineLatest([getAnalytics, getCameras, getServer]).pipe(
            map(([analytics, cameras, server]) => ({
                hasAnalyticsData: !!analytics.length,
                hasPlugins: cameras.some(
                    c =>
                        c.serverId === this.serverId &&
                        !!c.parameters.compatibleAnalyticsEngines?.length,
                ),
                metadataStorageId: server.metadataStorageId,
            })),
        );
    }

    backupControl(action?: 'start' | 'stop') {
        const backupEndpoint = `/rest/v1/servers/${this.serverId}/backupSettings`;
        return this.post(backupEndpoint, {
            caption: action,
            backupNewCameras: true,
            quality: 'CameraBackupBoth',
        }).toPromise();
    }

    renameServer(serverId: string, name: string) {
        return this.patch<t.ChangedIdReturned>(`/rest/v1/servers/${serverId || 'this'}`, {
            name,
        }).toPromise();
    }

    renameSystem(_, systemName: string) {
        return firstValueFrom(this.updateOrGetSettings({ systemName })).catch();
    }

    detachFromSystem(currentPassword?: string, serverId?: string) {
        return this.post<any>(`/rest/v1/servers/${serverId || 'this'}/detach`);
    }

    disconnectFromCloud(): Promise<void> {
        return this.post('/rest/v1/system/cloudUnbind', { password: '' })
            .toPromise()
            .then(() => {
                if (this.isSessionOauth) {
                    this.clearTokens();
                }
            });
    }

    private mergeUpdater$ = new BehaviorSubject(true);

    checkMergeStatus(forceReload = true) {
        this.mergeUpdater$.next(forceReload);
        return this.checkMergeStatusHandler(forceReload);
    }

    @memoizeAsyncPersistent
    private checkMergeStatusHandler(forceReload: boolean) {
        return this.mergeUpdater$.pipe(
            throttleTime(10 * 1000),
            filter(force => force === forceReload),
            switchMap(() =>
                this.get('/rest/v1/system/merge', {
                    headers: this.cacheHeader(!forceReload),
                }),
            ),
        );
    }

    // serverId can be a server id, this, or *
    getServerInfo = getServerInfoRestV1;

    getRemoteServerInfo = getRemoteServerInfoRestV1;

    mergeSystems(
        remoteEndpoint: string,
        remoteServerId: string,
        dryRun: boolean,
        password = '',
        takeRemoteSettings = true,
    ) {
        const [basicCredentials, _] = remoteEndpoint.includes('@') ? remoteEndpoint.split('@') : [];
        remoteEndpoint = remoteEndpoint.replace(/https?:\/\/(?:.*@)?/, '').replace(/\/$/, '');
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
                        return this.refreshTokens(refreshToken, true, info.cloudSystemId).pipe(
                            map((res: any) => ({ token: res.access_token })),
                        );
                    } else if (password || basicCredentials) {
                        if (!password && basicCredentials) {
                            const [_, basicPassword] = basicCredentials
                                .replace(/https?:\/\//, '')
                                .split(':');
                            if (basicPassword) {
                                password = basicPassword;
                            }
                        }
                        const data = { username: 'admin', password, remember: false };
                        return this.proxy(
                            'post',
                            'https',
                            remoteEndpoint,
                            'rest/v1/login/sessions',
                            data,
                            true,
                        );
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
                    ignoreOfflineServerDuplicates: true,
                };
                return this.post<t.MergeSystems>('/rest/v1/system/merge', data, {
                    headers: {
                        'Accept-Language': 'en-US',
                    },
                });
            }),
        );
    }

    restartServer(serverId?: string) {
        return this.post<t.RestartServer>(`/rest/v1/servers/${serverId || 'this'}/restart `)
            .toPromise()
            .catch(err => Promise.reject(err));
    }

    restoreFactorySettings(password?: string, serverId?: string) {
        return this.post(`/rest/v1/servers/${serverId || 'this'}/reset`);
    }

    getBookmarks(
        params: t.BookmarksParams = {
            order: 'desc',
            column: 'creationTime',
            _keepDefault: true,
            _orderBy: 'creationTimeMs',
        },
    ): Observable<t.Bookmark[]> {
        return this.get('/rest/v1/devices/*/bookmarks', { params });
    }

    getBookmarkTags(params: t.BookmarksTagsParams = {}): Observable<t.BookmarksTags> {
        return this.get('/rest/v1/devices/*/bookmarks/*/tags', { params: params as RequestParams });
    }

    getBookmarksDevices(): Observable<BookmarksDevice[]> {
        return this.getWith('/rest/v1/devices', bookmarksDeviceKeys);
    }

    changePassword(cameraId: string, user: string, password: string): Observable<unknown> {
        return this.post(`/rest/v1/devices/${cameraId}/changePassword`, { user, password });
    }

    // Widgets aren't being used at the moment, but making this so the base getDevices() can be removed
    _getHmWidgetDevices(): Observable<{ id: string; name: string }[]> {
        return this.getWith('/rest/v1/devices', ['id', 'name']);
    }

    getWebPages(params = {}): Observable<t.WebPages> {
        return this.get('/rest/v1/webPages', { params });
    }

    // Layouts

    @withSystemBusUpdates(({ transaction }) =>
        [
            assertTransaction.saveLayout,
            assertTransaction.saveLayouts,
            assertTransaction.removeLayout,
        ].some(assert => assert(transaction)),
    )
    getLayouts(): ReturnType<typeof getLayoutsRestV1> {
        return getLayoutsRestV1.bind(this)();
    }
    getLayout = getLayoutRestV1;
    putLayout = putLayoutRestV1;
    createLayout = createLayoutRestV1;
    deleteLayout = deleteLayoutRestV1;

    @memoizeAsyncMedium
    getLicenseSummaries(): Observable<any> {
        const params = {
            _keepDefault: true,
        };
        return this.get('/rest/v1/licenseSummaries', { params });
    }

    getLicenseSummariesOnActivation(): Observable<any> {
        const params = {
            _keepDefault: true,
        };
        return this.get('/rest/v1/licenseSummaries', { params });
    }

    previewUrl(
        cameraId: string,
        time?: number | string,
        width?: number | string,
        height?: number | string,
        rotate?: number | string,
        auth?: string,
    ) {
        const data: {
            cameraId: string;
            time?: number | string;
            width?: number | string;
            height?: number | string;
            rotate?: number | string;
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

        return this.get(endpoint, { params: data, responseType: 'blob' }).pipe(
            catchError(e => of(new Blob(['unauthorized']))),
            map(blob => URL.createObjectURL(blob || new Blob())),
            share(),
        );
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

    protected override cleanUserObject = cleanUserObjectRest;

    /** Not Implemented functions **/
    updateLogLevel(logLevel: unknown): Observable<unknown> {
        throw new Error('should only be using rest v2 version');
    }

    getPredefinedRoles = getPredefinedRolesLegacy;
    getUsers = getUsersRestV1;
    getUserRoles = getUserRolesRestV1;

    @memoizeAsyncShort
    getAllRoles(): Observable<Role[]> {
        return forkJoin([this.getPredefinedRoles(), this.getUserRoles()]).pipe(
            map(([predefinedRoles, customRoles]) =>
                [...predefinedRoles, ...customRoles].map(role => ({
                    ...role,
                    permissions: role.permissions?.split('|').sort().join('|'),
                })),
            ),
        );
    }

    getAggregatedUsersData(): Observable<AggregatedUsers> {
        return combineLatest([
            this.getUsers(),
            this.getPredefinedRoles(),
            this.getUserRoles(),
        ]).pipe(
            map(([users, predefinedRoles, roles]) => ({
                reply: {
                    '/ec2/getUsers': users.map(user => ({
                        ...user,
                        isCloud: user.type === 'cloud',
                        isLdap: user.type === 'ldap',
                    })),
                    '/ec2/getPredefinedRoles': predefinedRoles,
                    '/ec2/getUserRoles': roles.filter(({ name }) => name !== 'Owner'), // hide the owner role
                },
            })),
        );
    }

    private _addUser = addUserRestV1;
    addUser(user): Observable<ChangedIdReturned> {
        return this._addUser(user);
    }

    override saveUser(user: NxUser): Observable<ChangedIdReturned> {
        const isCloud = user.type === UserType.cloud;
        user.isHttpDigestEnabled = !isCloud;

        if (!isCloud) {
            if (user.name) {
                delete user.name;
            }
            if (user.isHttpDigestEnabled) {
                delete user.isHttpDigestEnabled;
            }
        }

        return this.patch<t.ChangedIdReturned>(
            `/rest/v1/users/${user.id}`,
            this.cleanUserObject(user),
        );
    }

    deleteUser(userId: string): Observable<ChangedIdReturned> {
        return this.delete<t.ChangedIdReturned>(`/rest/v1/users/${cleanIdLegacy(userId)}`);
    }
}
