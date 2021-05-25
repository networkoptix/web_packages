import { environment } from '@environments/environment';
import { Injector } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Location }             from '@angular/common';
import { CookieService }        from 'ngx-cookie-service';
import { from, of, throwError } from 'rxjs';
import { mergeMap, retryWhen, switchMap, tap, timeout } from 'rxjs/operators';

import { NxHealthService }      from '../pages/health/health.service';
import { NxAppStateService }    from './nx-app-state.service';
import { IConfig }              from './nx-config';
import { NxSystemAPI }          from './system-legacy-api.service';
import { IParams }              from './system.service';
import { NxUriCacheService }    from './uri-cache.service';
import * as t                   from './system-api.types';
import { NxAccountService }     from '@services/account.service';
import { NxDialogsService }       from '@dialogs/dialogs.service';

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
    private readonly token = 'X-Runtime-Guid';
    private readonly oldToken = 'Unable to process owner\'s REST API request: session should not be older than 10m';
    private injector: Injector;

    constructor(
        http: HttpClient,
        configService: IConfig,
        location: Location,
        userEmail: string,
        systemId: string,
        serverId: string,
        unauthorizedCallback: (params: IParams<any>) => any,
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

    private handleOldToken(request) {
        return request.pipe(
            mergeMap(
                (
                    error: { status: number; resultCode: string, errorString: string },
                    attempt: number
                ) => {
                    if (attempt === 0) {
                        if (
                            error.status === 401 ||
                            error.status === 403 ||
                            error.resultCode === 'forbidden' ||
                            error.errorString === this.oldToken
                        ) {
                            return this.loginAsCurrentUser();
                        } else if (error.status === 503) {
                            // Repeat the request once again for 503 error
                            return of('');
                        }
                    }
                    return throwError(error);
                }
            ));
    }

    private loginAsCurrentUser(password?: string) {
        const remember = !!this.cookieService.get(this.token);
        if (!password) {
            const accountService: NxAccountService = this.injector.get(NxAccountService);
            return from(
                this.injector.get(NxDialogsService)
                    .login(accountService, false, false, false, true)
            );
        }
        return from(this.getCurrentUser())
            .pipe(switchMap((res) => {
                const username = res?.username || res?.name;
                return this.loginToken(username, password, remember);
            }));
    }

    protected postProxy(protocol, serverId, requestUrl, data) {
        return this.post(`/proxy/${protocol}/${serverId}/${requestUrl}`, data);
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

    private resetServer(password?: string) {
        return this.loginAsCurrentUser(password)
            .pipe(switchMap(() => this.post('/rest/v1/system/reset')));
    }

    protected get<ResponseType = any>(url: string, params?: any, customHttpHeaders: IParams<string> = {}, requestTimeout = 8000) {
        let headers = new HttpHeaders();
        params = params || {};

        if (!environment.isLocal && this.authGet) {
            params.auth = this.authGet;
        }

        if (environment.isLocal) {
            headers = headers.set('Authorization', `Bearer ${this.cookieService.get(this.token)}`);
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
            timeout(requestTimeout),
            tap(undefined, (error) => {
                if (this.CONFIG.isLocal && error.name === 'TimeoutError') {
                    this.appState.systemAvailable$.next(false);
                }
            })
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
            const endpoint = `/rest/v1/login/sessions/${this.cookieService.get(this.token)}`;
            this.cacheService.addToCache(endpoint);
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

    loginToken(username: string, password: string, remember: boolean) {
        return this.post('/rest/v1/login/sessions', { username, password, setCookie: remember })
            .pipe(tap((res) => {
                if (remember) {
                    this.cookieService.set(this.token, res.token);
                }
            }));
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

    detachFromSystem(currentPassword?: string) {
        return this.resetServer(currentPassword);
    }

    disconnectFromCloud(currentPassword: string, newAdminLogin: string = 'admin', newAdminPassword?: string) {
        return this.loginAsCurrentUser(currentPassword)
            .pipe(switchMap(() => this.post('/rest/v1/system/cloudUnbind', { password: currentPassword })))
            .toPromise();
    }

    mergeSystems(remoteEndpoint: string, remoteServerId: string, dryRun: boolean, password = '', takeRemoteSettings = true) {
        return from(this.getCurrentUser(true)).pipe(
            switchMap((user) => {
                const currentUserName = user?.username || user?.name;
                let login = of({ token: '' });
                if (dryRun && password) {
                    const data = { userName: currentUserName, password, remember: false };
                    login = this.postProxy('http', remoteServerId, 'rest/v1/login/sessions', data);
                } else if (password) {
                    login = this.loginToken(currentUserName, password, false);
                }
                return login;
            }),
            switchMap((res: any) => {
                remoteEndpoint = remoteEndpoint.replace(/https?s:\/\/(?:.*@)?/, '');
                const remoteSessionToken = dryRun ? '' : res.token;
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
            retryWhen((request) => this.handleOldToken(request))
        );
    }

    restoreFactorySettings(password?: string) {
        return this.resetServer(password);
    }

    saveCloudSystemCredentials(cloudSystemID: string, cloudAuthKey: string, cloudAccountName: string) {
        return this.post('/rest/v1/system/cloudBind',
            {
                systemId : cloudSystemID,
                authKey  : cloudAuthKey,
                owner    : cloudAccountName
            })
            .pipe(retryWhen((request) => this.handleOldToken(request)))
            .toPromise();
    }

    setupCloudSystem(systemName: string, cloudSystemID: string, cloudAuthKey: string, cloudAccountName: string, systemSettings: t.SystemConfigSettings) {
        return this.setupSystem(systemName, systemSettings, cloudSystemID, cloudAuthKey, cloudAccountName);
    }

    setupLocalSystem(systemName: string, password: string, systemSettings: t.SystemConfigSettings) {
        return this.setupSystem(systemName, systemSettings, undefined, undefined, undefined, password);
    }
}
