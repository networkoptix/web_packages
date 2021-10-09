import { environment } from '@environments/environment';
import { Injector } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Location }             from '@angular/common';
import { CookieService }        from 'ngx-cookie-service';
import { from, of, throwError } from 'rxjs';
import { catchError, map, mergeMap, retryWhen, switchMap, tap, timeout } from 'rxjs/operators';

import { NxHealthService }      from '@pages/health/health.service';
import { NxAppStateService }    from './nx-app-state.service';
import { IConfig }              from './nx-config';
import { NxSystemAPI }          from './system-legacy-api.service';
import { IParams }              from './system.service';
import { NxUriCacheService }    from './uri-cache.service';
import * as t                   from './system-api.types';
import { NxAccountService }     from '@services/account.service';
import { NxDialogsService }     from '@dialogs/dialogs.service';
import { NxStorageService }     from '@services/storage.service';
import { WINDOW }               from '@services/window-provider';
import { NxLanguageProviderService } from '@services/nx-language-provider';

export type APIDocVersion = 'main' | 'legacy' | 'deprecated'
enum APIDocURL {
    main =  '/swagger-ui/openapi_v1.json',
    legacy = '/swagger-ui/openapi_legacy.json',
    deprecated = '/swagger-ui/openapi_deprecated.json'
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
export class NxSystemRestAPI extends NxSystemAPI {
    static readonly supportedVersion = 4.3;
    public readonly requiresPassword: boolean = false;
    private readonly cloudToken = 'cloudAccessToken';
    private readonly token = 'x-runtime-guid';
    private readonly refreshToken = 'refreshToken';
    private readonly oldSessionErrorId = 'sessionExpired';
    private injector: Injector;

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
            appState
        );
        this.injector = injector;
    }

    private get dialogService() {
        return this.injector.get(NxDialogsService);
    }

    private get storageService() {
        return this.injector.get(NxStorageService);
    }

    private get isSessionOauth() {
        return this.accessToken.includes('nxcdb');
    }

    private createSignature(message) {
        return this.post('/rest/v1/system/cloudSignature', { message });
    }

    private get cloudAccessTokenName() {
        return `${this.systemId ? this.systemId + '-' : ''}${this.token}`;
    }

    public get accessToken() {
        return this.cookieService.get(this.cloudAccessTokenName);
    }

    public set accessToken(token) {
        if (this.isSessionOauth) {
            this.deleteToken(this.accessToken).toPromise().catch(() => {});
        }
        this.cookieService.delete(this.cloudAccessTokenName);
        this.cookieService.set(this.cloudAccessTokenName, token, undefined, '/');
    }

    private handleOldToken(request, allSystems?: boolean) {
        return request.pipe(
            mergeMap(
                (
                    error: { error: any, status: number; resultCode: string, errorString: string },
                    attempt: number
                ) => {
                    if (attempt === 0) {
                        if (
                            (error.status === 401 ||
                            error.status === 403 ||
                            error.resultCode === 'forbidden') &&
                            error.error.errorId.includes(this.oldSessionErrorId)
                        ) {
                            return this.reauthenticate(allSystems);
                        } else if (error.status === 503) {
                            // Repeat the request once again for 503 error
                            return of('');
                        }
                    }
                    return throwError(error);
                }
            ));
    }

    private reauthenticate(allSystems?: boolean) {
        const dialogService = this.dialogService;
        const LANG = this.injector.get(NxLanguageProviderService).translations;
        const { action, message, title } = LANG.dialogs?.renewAuth;
        return from(
            this.dialogService.confirm(message?.(), title?.(), action?.()).then((res) => {
                if (!res) {
                    return Promise.resolve(false);
                }

                if (this.isSessionOauth) {
                    return this.logout().then(() => this.redirectOauth(allSystems));
                }

                const accountService: NxAccountService = this.injector.get(NxAccountService);
                return this.logout()
                    .then(() => dialogService.login(accountService, false, false, false, true));
            })
        );
    }

    protected proxy(method, protocol, serverAddress, requestUrl, data) {
        const url = `/proxy/${protocol}/${serverAddress}/${requestUrl}`;
        if (method === 'get') {
            return this.get(url, data);
        } else if (method === 'post') {
            return this.post(url, data);
        }
        throwError(new Error('Invalid http method type was passed.'));
    }

    private setupSystem(systemName: string, systemSettings: t.SystemConfigSettings, cloudSystemID = '', cloudAuthKey = '', owner = '', password = '') {
        const config = {
            name     : systemName,
            settings : Object.entries(systemSettings).map(([name, value]) => ({ name, value })),
            local    : {
                password: password
            },
            cloud: {
                systemId : cloudSystemID,
                authKey  : cloudAuthKey,
                owner    : owner
            }
        };
        return this.post('/rest/v1/system/setup', config).toPromise();
    }

    private refreshTokens(refreshToken: string, isSystem?: boolean, remoteSystemId?: string) {
        const params: any = {
            grant_type    : 'refresh_token',
            response_type : 'token',
            refresh_token : refreshToken
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
        return this.get(`/rest/v1/login/sessions/${this.accessToken}?setCookie=true`, {}, { withCredentials: 'true' }).toPromise();
    }

    public setTokens(tokens, isSystem) {
        const storageService = this.storageService;
        if (isSystem) {
            this.accessToken = tokens.access_token;
            this.setAccessTokenAsCookie().catch(() => {});
        } else {
            storageService.cloudAccessToken = tokens.access_token;
        }
        // eslint-disable-next-line camelcase
        if (tokens?.refresh_token) {
            storageService.refreshToken = tokens.refresh_token;
        }
    }

    private clearTokens() {
        const storageService = this.storageService;
        this.cookieService.delete(this.cloudAccessTokenName);
        storageService.clear = this.cloudToken;
        storageService.clear = this.refreshToken;
    }

    private deleteToken(token) {
        const host = environment.isLocal ? this.CONFIG.cloudHost : '';
        return this.http.post(`${host}/oauth/revoke/`, { token }, { headers: { Authorization: `Bearer ${token}` } });
    }

    protected retryHandler(request) {
        return request.pipe(
            mergeMap(
                (
                    error: { status: number; resultCode: string },
                    attempt: number
                ) => {
                    if (attempt === 0) {
                        const storageService = this.storageService;
                        const refreshToken = storageService.refreshToken;

                        if (!refreshToken && (
                            error.status === 401 ||
                            error.status === 403 ||
                            error.resultCode === 'forbidden')
                        ) {
                            return from(this.unauthorizedCallback(error));
                        } else if (error.status === 503) {
                            // Repeat the request once again for 503 error
                            return of('');
                        } else if (refreshToken) {
                            return this.refreshTokens(refreshToken, true).pipe(
                                catchError((error) => {
                                    this.clearTokens();
                                    return throwError(error);
                                }),
                                switchMap((res) => {
                                    this.setTokens(res, true);
                                    return of('');
                                })
                            );
                        }
                    }
                    return throwError(error);
                }
            )
        );
    }

    generateHeaders (): any {
        let headers = new HttpHeaders();
        // if (!environment.isLocal && this.authGet) {
        //     params.auth = this.authGet;
        // }
        headers = headers.set('Authorization', `Bearer ${this.accessToken}`);
        if (this.serverId) {
            headers = headers.set('X-Server-Guid', this.serverId);
        }

        return headers;
    }

    protected delete<ResponseType = any>(url: string, params?: any, customHttpHeaders: IParams<string> = {}, requestTimeout = 8000) {
        let headers = new HttpHeaders();
        params = params || {};

        headers = headers.set('Authorization', `Bearer ${this.accessToken}`);

        if (this.serverId) {
            headers = headers.set('X-Server-Guid', this.serverId);
        }

        Object.entries(customHttpHeaders).forEach((entry) => {
            headers = headers.set(...entry);
        });
        const fullUrl = `${this.urlBase}${url}`;
        return this.http.delete<ResponseType>(fullUrl, { headers, params }).pipe(
            retryWhen((request) => this.retryHandler(request)),
            timeout(requestTimeout),
            tap(undefined, (error) => {
                if (environment.isLocal && error.name === 'TimeoutError') {
                    this.appState.systemAvailable$.next(false);
                }
            })
        );
    }

    protected get<ResponseType = any>(url: string, params?: any, customHttpHeaders: IParams<string> = {}, requestTimeout = 8000) {
        let headers = new HttpHeaders();
        params = params || {};

        headers = headers.set('Authorization', `Bearer ${this.accessToken}`);

        if (this.serverId) {
            headers = headers.set('X-Server-Guid', this.serverId);
        }

        Object.entries(customHttpHeaders).forEach((entry) => {
            headers = headers.set(...entry);
        });
        const fullUrl = `${this.urlBase}${url}`;
        return this.http.get<ResponseType>(fullUrl, { headers, params }).pipe(
            retryWhen((request) => this.retryHandler(request)),
            timeout(requestTimeout),
            tap(undefined, (error) => {
                if (environment.isLocal && error.name === 'TimeoutError') {
                    this.appState.systemAvailable$.next(false);
                }
            })
        );
    }

    protected post<ResponseType = any>(url: string, data?: any, paramsToAdd = {}, customTimeout = 8000) {
        let headers = new HttpHeaders();
        let params = new HttpParams();
        const fullUrl = `${this.urlBase}${url}`;
        data = data || {};

        Object.keys(paramsToAdd).forEach((key) => {
            params = params.append(key, paramsToAdd[key]);
        });

        if (this.serverId) {
            headers = headers.set(`${this.systemId ?? ''}-${this.token}`, this.serverId);
        }

        headers = headers.set('Authorization', `Bearer ${this.accessToken}`);

        return this.http
            .post<ResponseType>(fullUrl, data, { params, headers })
            .pipe(
                retryWhen((request) => this.retryHandler(request)),
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
        } else if (environment.isLocal) { // Local system mode ???
            const endpoint = `/rest/v1/login/sessions/${this.accessToken}`;
            this.userRequest = this.get<t.NormalResponse<t.User>>(endpoint, {}, customHeaders).toPromise()
                .then((result :any) => {
                    return this.get<t.NormalResponse<t.User[]>>('/rest/v1/users', { name: result.username }).toPromise();
                })
                .then((result) => {
                    // Todo: convert result to match getCurrentUser result.
                    this.currentUser = result[0];
                    return this.currentUser;
                });
        } else {
            this.userRequest = Promise.resolve(undefined);
        }
        this.userRequest.finally(() => {
            this.userRequest = undefined; // Clear cache in case of errors
        });
        return this.userRequest;
    }

    public ensureFreshSession() {
        return this.get(`/rest/v1/login/sessions/${this.accessToken}`).pipe(
            switchMap((res) => {
                if (res.ageS >= this.CONFIG.sessionFreshnessSec) {
                    return this.reauthenticate();
                }
                return of(res);
            }));
    }

    loginToken(username: string, password: string, remember: boolean) {
        return this.post('/rest/v1/login/sessions', { username, password, setCookie: remember })
            .pipe(tap((res) => {
                if (remember) {
                    this.accessToken = res.token;
                }
            }));
    }

    loginOauth(code: string) {
        const params = {
            code,
            grant_type    : 'authorization_code',
            response_type : 'token'
        };
        return this.http.get(`${this.CONFIG.cloudHost}/oauth/token/`, { params })
            .pipe(
                switchMap((tokens) => {
                    this.setTokens(tokens, false);
                    // @ts-ignore
                    return this.refreshTokens(tokens.refresh_token, true);
                }),
                tap((systemTokens) => {
                    this.setTokens(systemTokens, true);
                })
            );
    }

    async redirectOauth(allSystems?: boolean) {
        const window = this.injector.get(WINDOW);
        const { href } = window.location;
        const params = new URLSearchParams({
            client_type   : 'loginWebadmin',
            view_type     : 'web',
            redirect_url  : href,
            client_id     : 'webadmin',
            response_type : 'code',
            grant_type    : 'password',
            scope         : `${this.CONFIG.cloudHost.replace(/http?s:\/\//, '')}/cdb/oauth2/token cloudSystemId=${allSystems ? '*' : this.CONFIG.cloudSystemId}`
        });
        if (!allSystems) {
            const { signature } = await this.createSignature(href).toPromise();
            params.append('signature', signature);
        }
        window.location.href = `${this.CONFIG.cloudHost}/authorize?${params.toString()}`;
    }

    logout() {
        const { accessToken, cloudAccessToken, refreshToken } = this.getTokens();
        if (this.CONFIG.cloudSystemId && refreshToken) {
            return this.http.post(`${this.CONFIG.cloudHost}/oauth/logout/`, { accessToken, cloudAccessToken, refreshToken }).pipe(
                tap(() => {
                    this.clearTokens();
                })
            ).toPromise();
        }
        this.clearTokens();
        return this.delete(`/rest/v1/login/sessions/${accessToken}`).toPromise();
    }

    getApiDoc(type: APIDocVersion = 'main') {
        return this.get(APIDocURL[type]).toPromise();
    }

    backupControl(action?: 'start' | 'stop') {
        const backupEndpoint = `/rest/v1/servers/${this.serverId}/backupSettings`;
        return this.post(backupEndpoint, {
            caption          : action,
            backupNewCameras : true,
            quality          : 'CameraBackupBoth'
        }).toPromise();
    }

    renameSystem(_, systemName: string) {
        return this.post('/api/systemSettings', { systemName }).toPromise().catch();
    }

    detachFromSystem(currentPassword?: string, serverId?: string) {
        return this.post(`/rest/v1/servers/${serverId || 'this'}/detach`).pipe(
            retryWhen((request) => this.handleOldToken(request))
        );
    }

    disconnectFromCloud() {
        return this.post('/rest/v1/system/cloudUnbind', { password: '' }).pipe(
            retryWhen((request) => this.handleOldToken(request))
        ).toPromise();
    }

    checkMergeStatus(forceReload = true) {
        return this.get<t.MergeStatus>(
            '/rest/v1/system/merge',
            {},
            { [forceReload ? 'reset-cache' : 'cache-request']: 'true' }
        );
    }

    mergeSystems(remoteEndpoint: string, remoteServerId: string, dryRun: boolean, password = '', takeRemoteSettings = true) {
        remoteEndpoint = remoteEndpoint.replace(/https?s:\/\/(?:.*@)?/, '');
        const request = remoteServerId ? of({ id: remoteServerId, cloudId: '' }) : this.proxy('get', 'https', remoteEndpoint, 'rest/v1/servers/this/info', {});
        return request.pipe(
            // Gets the remoteServerID and checks if the remote system is connected to cloud.
            switchMap((data : any) => {
                if (!remoteServerId) {
                    remoteServerId = data.id.replace(/{|}/g, '');
                }
                return of({ token: '', cloudId: data.cloudId ?? '' });
            }),
            // Adds the remoteToken to the merge request.
            switchMap((info: any) => {
                if (!dryRun || (password && !this.isSessionOauth)) {
                    const refreshToken = this.storageService.refreshToken;
                    // Using oauth and target system is connected to cloud.
                    if (info.cloudId && refreshToken) {
                        // Request for a cloud token that has the targetSystem scope.
                        return this.refreshTokens(refreshToken, true, info.cloudId)
                            .pipe(map((res: any) => ({ token: res.access_token })));
                    } else if (password) {
                        const data = { username: 'admin', password, remember: false };
                        return this.proxy('post', 'https', remoteEndpoint, 'rest/v1/login/sessions', data);
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
                    mergeOneServer                : false,
                    ignoreIncompatible            : false,
                    ignoreOfflineServerDuplicates : true
                };
                return this.post<t.MergeSystems>('/rest/v1/system/merge', data);
            }),
            retryWhen((request) => this.handleOldToken(request, this.isSessionOauth))
        );
    }

    restartServer(serverId?: string) {
        return this.post<t.RestartServer>(`/rest/v1/servers/${serverId || 'this'}/restart `)
            .pipe(retryWhen((request) => this.handleOldToken(request)))
            .toPromise()
            .catch((err) => Promise.reject(err));
    }

    restoreFactorySettings(password?: string, serverId?: string) {
        return this.post(`/rest/v1/servers/${serverId || 'this'}/reset`).pipe(
            retryWhen((request) => this.handleOldToken(request))
        );
    }

    saveCloudSystemCredentials(cloudSystemID: string, cloudAuthKey: string, cloudAccountName: string) {
        return this.post('/rest/v1/system/cloudBind',
            {
                systemId : cloudSystemID,
                authKey  : cloudAuthKey,
                owner    : cloudAccountName
            })
            .pipe(retryWhen((request) => this.handleOldToken(request)));
    }

    setupCloudSystem(systemName: string, cloudSystemID: string, cloudAuthKey: string, cloudAccountName: string, systemSettings: t.SystemConfigSettings) {
        return this.setupSystem(systemName, systemSettings, cloudSystemID, cloudAuthKey, cloudAccountName);
    }

    setupLocalSystem(systemName: string, password: string, systemSettings: t.SystemConfigSettings) {
        return this.setupSystem(systemName, systemSettings, undefined, undefined, undefined, password);
    }

    getBookmarks(params = {
        order        : 'desc',
        column       : 'creationTime',
        deviceId     : '*',
        _keepDefault : 'true',
        _orderBy     : 'creationTimeMs'
    }) {
        return this.get('/rest/v1/devices/*/bookmarks', params);
    }

    previewUrl(
        cameraId: string,
        time?: number,
        width?: number,
        height?: number,
        rotate?: number
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

        if (rotate !== null) {
            data.rotate = rotate;
        }

        return this.generateGetUrl(endpoint, data);
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
        return `${url}${url.indexOf('?') > -1 ? '&' : '?'}${params}`;
    }
}
