import { Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injector } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import {
    combineLatest,
    defer,
    filter,
    finalize,
    first,
    firstValueFrom,
    identity,
    map,
    Observable,
    of,
    repeat,
    retry,
    scan,
    shareReplay,
    switchMap,
} from 'rxjs';
import { webSocket } from 'rxjs/webSocket';
import { v4 as uuid } from 'uuid';

import { NxHealthService } from '@pages/health/health.service';
import { RequestOpts } from '@services/mediaserver-apis/connections/adapters/adapter-target-types';
import { addUserRestV3 } from '@services/mediaserver-apis/endpoints/add-user';
import { getUsersRestV3 } from '@services/mediaserver-apis/endpoints/get-users';
import type {
    AddUser,
    BaseNewUser,
    RestV3User,
    SystemUser,
    UserGroup,
} from '@services/system-user.types';
import { servers } from '@static-variables';
import { cleanId } from '@utils/general';
import { defaultHashFunction, memoizeAsync } from '@utils/memoize';

import { JsonRpcMessage } from './mediaserver-apis/connections/methods/json-rpc/types';
import { generateJsonRpcPayload } from './mediaserver-apis/utils/use-json-rpc';
import { NxAppStateService } from './nx-app-state.service';
import { NxStorageService } from './storage.service';
import type { AggregatedUsers } from './system-api.aggregated-types';
import type { ChangedIdReturned, UnauthorizedCallback } from './system-api.types';
import {
    CloudBindData,
    CloudRemoteToken,
    CloudSaasState,
    MergeSystems,
    RemoteSystem,
    RemoteToken,
} from './system-api.types/system.types';
import { UserSessionV3 } from './system-api.types/users.types';
import { NxSystemRestAPI2 } from './system-rest-api-v2.service';
import { NxUriCacheService } from './uri-cache.service';

export class NxSystemRestAPI3 extends NxSystemRestAPI2 {
    override readonly version: number;

    jsonRpcConnection$ = defer(() =>
        this.createTicket().pipe(
            map(({ token }) =>
                webSocket<JsonRpcMessage>(
                    `${window.location.protocol === 'http' ? 'ws' : 'wss'}://${(
                        this.urlBase || window.location.origin
                    )
                        .split('://')
                        .pop()}/jsonrpc?_ticket=${token}`,
                ),
            ),
            retry({ delay: 250 }),
        ),
    ).pipe(shareReplay({ refCount: false, bufferSize: 1 }));

    subscribeNotImplemented = [
        () => true,
        endpoint => /^\/rest\/v[1-3]\/servers\/[^\/]+\/events$/.test(endpoint),
    ];

    public override get subscribeTo(): typeof this {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const target = this;
        type Target = typeof target;

        return new Proxy<Target>(target as Target, {
            get: (target: Target, prop, receiver) => {
                if (prop === 'get') {
                    return (url, opts) => {
                        if (this.subscribeNotImplemented.some(check => check(url))) {
                            // Need to find out why this only gets called once
                            return defer(() =>
                                target.jsonRpcHandler.apply(this, [url, opts, 'get']).pipe(first()),
                            ).pipe(repeat({ delay: 10_000 }));
                        }
                        return target.jsonRpcHandler.apply(this, [url, opts, 'subscribe']);
                    };
                }
                return Reflect.get(target, prop, receiver);
            },
        });
    }
    protected jsonRpcSubscriptions: string[] = [];

    protected override jsonRpcHandler<T>(
        url: string,
        opts?: Parameters<NxSystemRestAPI3['get']>[1],
        method: Parameters<typeof generateJsonRpcPayload>[2] = 'subscribe',
    ): Observable<T> {
        return this.jsonRpcConnection$.pipe(
            switchMap(connection => {
                const id = uuid();
                const payload = generateJsonRpcPayload(url, opts?.params || {}, method);
                connection.next({ id, jsonrpc: '2.0', ...payload });
                if (method === 'subscribe') {
                    this.jsonRpcSubscriptions.push(payload.method);
                }
                return connection.asObservable().pipe(
                    filter(({ id: responseId, method: responseMethod }) => {
                        const isResponse = responseId === id;
                        const isSubscriptionUpdate =
                            method === 'subscribe' &&
                            responseMethod?.replace('.delete', '.update') ===
                                payload.method.replace('.subscribe', '.update');
                        return isResponse || isSubscriptionUpdate;
                    }),
                    scan((acc, response) => {
                        const notSubscription =
                            method !== 'subscribe' && 'result' in response && response.result;
                        const initialResult = 'result' in response && response.result;

                        if (notSubscription || initialResult) {
                            return response.result as T;
                        }

                        if ('params' in response && response.params) {
                            const params = response.params as { id: string };
                            if (Array.isArray(acc)) {
                                if ('method' in response && response.method.endsWith('.delete')) {
                                    return acc.filter(
                                        item => 'id' in item && item.id !== params.id,
                                    ) as T;
                                } else if (
                                    acc.some(item => 'id' in item && item.id === params.id)
                                ) {
                                    return acc.map(item => {
                                        if ('id' in item && item.id === params.id) {
                                            return { ...item, ...params } as T;
                                        }

                                        return item;
                                    }) as T;
                                } else {
                                    return [...acc, params] as T;
                                }
                            } else {
                                return response.params as T;
                            }
                        }

                        return acc;
                    }, null as T),
                    // Need to figure out why this isn't working
                    method === 'subscribe'
                        ? finalize(() => {
                              this.jsonRpcSubscriptions.splice(
                                  this.jsonRpcSubscriptions.indexOf(payload.method),
                                  1,
                              );

                              if (this.jsonRpcSubscriptions.includes(payload.method)) {
                                  return;
                              }
                              connection.next({
                                  id,
                                  jsonrpc: '2.0',
                                  method: payload.method.replace('.subscribe', '.unsubscribe'),
                              } as JsonRpcMessage);
                          })
                        : identity,
                );
            }),
        );
    }

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
        skipSettingSystem = false,
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
            skipSettingSystem,
        );
        this.version = 6.0;
    }

    saveCloudSystemCredentials(data: CloudBindData): Observable<unknown> {
        return this.post('/rest/v3/system/cloud/bind', { ...data });
    }

    @memoizeAsync(defaultHashFunction, forceReload => !!forceReload, 10 * 1000)
    /**
     * For some reason /rest/v1/login/sessions could potentially take a really long time to respond.
     *
     * On PermissionManager.permissionsInitialized we fallback to getting the user to cloud if this
     * request doesn't return after 3 seconds.
     *
     * Normally the response only takes a few hundred milliseconds but in cases where it takes a
     * a long time it's unclear what the upper bound is but was seeing cases where it took over
     * 20 seconds which is too long to block the UI.
     */
    public override getCurrentUser(forceReload?: boolean): Promise<SystemUser> {
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
            let userId = '';
            this.userRequest = firstValueFrom(this.get<UserSessionV3>(endpoint, { headers }))
                .then(result => {
                    userId = result.id;
                    if (!this.accessToken) {
                        this._vmsToken = result.token;
                    }
                    return firstValueFrom(
                        this.get<RestV3User>(`/rest/v3/users/${result.id}`, {
                            params: { _keepDefault: true },
                        }),
                    );
                })
                .then(result => {
                    this.currentUser = result;
                    return this.currentUser;
                })
                .catch(err => {
                    // Unknown session token
                    if (
                        err.errorId === 'cantProcessRequest' ||
                        err.errorId === servers.errors.cloudSessionTruncated
                    ) {
                        this.accessToken = '';
                    } else if (err.error?.errorString === `Resource '${userId}' is not found`) {
                        // Set the error string here to avoid making another API call for userId at Login
                        err.error.errorString = 'user is disabled';
                        return Promise.reject(err.error);
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

    // getUsers
    override getUsers = getUsersRestV3;

    override getAggregatedUsersData(): Observable<AggregatedUsers> {
        return combineLatest([this.getUsers(), this.getUserRoles()]).pipe(
            map(([users, roles]) => ({
                reply: {
                    '/ec2/getUsers': users.map(user => ({
                        ...user,
                        isCloud: user.type === 'cloud',
                        isLdap: user.type === 'ldap',
                    })),
                    '/ec2/getUserRoles': roles.filter(({ name }) => name !== 'Owner'), // hide the owner role
                },
            })),
        );
    }

    // getUser
    // getUser(id: string) {
    //     return this.get<t.NormalResponse<t.UserWithGroups>>('/rest/v3/user', { id }).toPromise();
    // }
    private _addUserV3 = addUserRestV3;

    override addUser(user: BaseNewUser | AddUser): Observable<ChangedIdReturned> {
        return this._addUserV3(user as AddUser);
    }

    // saveUser
    modifyUser(user: RestV3User, id: string): Observable<RestV3User | ChangedIdReturned> {
        return this.patch(`/rest/v3/users/${id}`, { ...user });
    }

    // getUserGroups
    getUserGroups(): Observable<UserGroup[]> {
        return this.get('/rest/v3/userGroups');
    }

    getCurrentUserPermissions(): Observable<{
        groupIds: string[];
        permissions: string;
        resourceAccessRights: { [key: string]: string };
    }> {
        return this.get('/rest/v3/users/-/permissions');
    }

    // getUserGroup
    // getUserGroup(id: string) {
    //     return this.get<.t.NormalResponse<t.UserGroup>>(`/rest/v3/userGroups/${id}`).toPromise();
    // }

    // private responseWrapper = (data): t.NormalResponse<any> => ({
    //     error: '0',
    //     errorString: 'ok',
    //     reply: data
    // });

    userWithGroupsObject(
        fullName: string,
        email: string,
        type: 'local' | 'cloud' = 'cloud',
    ): Partial<RestV3User> {
        return {
            name: '',
            email,
            type,
            fullName,
            permissions: 'NoGlobalPermissions',
            isEnabled: true,
            groupIds: [],
        };
    }

    temporaryUserTokenExchange(token: string): Observable<{
        id: string;
        username: string;
        token: string;
        ageS: number;
        expiresInS: number;
    }> {
        return this.post('/rest/v3/login/temporaryToken', { token, setCookie: true });
    }

    powerUserCanEditSecuritySettings(): Observable<boolean> {
        return this.get('/rest/v3/system/settings/securityForPowerUsers');
    }

    createTicket(): Observable<{
        id: string;
        username: string;
        token: string;
        ageS: number;
        expiresInS: number;
    }> {
        return this.post('/rest/v3/login/tickets');
    }

    override renameServer(serverId: string, name: string): Promise<ChangedIdReturned> {
        return firstValueFrom(
            this.patch(`/rest/v3/servers/${serverId || 'this'}`, {
                name,
            }),
        ).then(() => ({ id: serverId }));
    }

    buildRpcUrl(): Observable<string> {
        return this.createTicket().pipe(map(({ token }) => this.generateRpcSocketUrl(token)));
    }

    private generateRpcSocketUrl(token: string): string {
        return `${this.getUrlBase('wss:')}/jsonrpc?_ticket=${token}`;
    }

    override mergeSystems(
        remoteEndpoint: string,
        remoteServerId: string,
        dryRun: boolean,
        password = '',
        takeRemoteSettings: boolean,
    ): Observable<MergeSystems> {
        const [basicCredentials, _] = remoteEndpoint.includes('@') ? remoteEndpoint.split('@') : [];
        remoteEndpoint = remoteEndpoint.replace(/https?:\/\/(?:.*@)?/, '').replace(/\/$/, '');
        const request = remoteServerId
            ? of({ id: remoteServerId, cloudSystemId: '' })
            : this.proxy('get', 'https', remoteEndpoint, 'rest/v3/servers/this/info', {});
        return request.pipe(
            // Gets the remoteServerID and checks if the remote system is connected to cloud.
            switchMap((data: RemoteSystem) => {
                if (!remoteServerId) {
                    remoteServerId = data.id.replace(/{|}/g, '');
                }
                return of({ token: '', cloudSystemId: data.cloudSystemId || '' });
            }),
            // Adds the remoteToken to the merge request.
            switchMap((info: RemoteToken) => {
                if (!dryRun || (password && !this.isSessionOauth)) {
                    const refreshToken = this.injector.get(NxStorageService).refreshToken;
                    // Using oauth and target system is connected to cloud.
                    if (info.cloudSystemId && refreshToken) {
                        // Request for a cloud token that has the targetSystem scope.
                        return this.refreshTokens(refreshToken, true, info.cloudSystemId).pipe(
                            map((res: CloudRemoteToken) => ({ token: res.access_token })),
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
                            'rest/v3/login/sessions',
                            data,
                            true,
                        );
                    }
                }
                return of(info);
            }),
            // Executes the merge request
            switchMap((res: RemoteToken) => {
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
                return this.post<MergeSystems>('/rest/v3/system/merge', data, {
                    headers: {
                        'Accept-Language': 'en-US',
                    },
                });
            }),
        );
    }

    getCloudSaasState(): Observable<CloudSaasState> {
        return this.get('/rest/v3/system/cloud/saas');
    }

    override getExportUrl({
        transport,
        cameraId,
        pos,
        endPos,
        duration,
    }: {
        transport: string;
        cameraId: string;
        pos: number;
        endPos: number;
        duration: number;
    }): string {
        if (!['mp4', 'mkv'].includes(transport)) {
            transport = 'mkv';
        }
        cameraId = cleanId(cameraId);
        const url = `/rest/v3/devices/${cameraId}/media.${transport}`;
        const params = {
            positionMs: pos,
            endPositionMs: endPos,
            durationMs: duration * 1000,
            download: true,
            export: true,
        };
        return this.generateGetUrl(url, params);
    }

    override getPlaybackUrl(
        cameraId: string,
        transport = 'webm',
        resolution = 'low',
        position = 0,
        resolvedRelay = '',
    ): string {
        let url: string;
        function hlsResolutionOrEmpty(res: string): string {
            switch (res) {
                case 'hi':
                case 'lo':
                    return res;
                default:
                    return '';
            }
        }

        cameraId = cleanId(cameraId);

        switch (transport) {
            case 'webRtc':
                url = `${
                    resolvedRelay ? `wss://${resolvedRelay}` : this.getUrlBase('wss:')
                }/webrtc-tracker/?camera_id=${cameraId}&x-server-guid=${cleanId(this.serverId)}&`;
                break;
            case 'webRtc2':
                url = `${
                    resolvedRelay ? `wss://${resolvedRelay}` : this.getUrlBase('wss:')
                }/rest/v3/devices/${cameraId}/webrtc?x-server-guid=${cleanId(this.serverId)}&`;
                break;
            case 'hls':
                url = `${this.getUrlBase()}/web/hls/${cameraId}.m3u8?stream=${hlsResolutionOrEmpty(resolution)}&`;
                if (position) {
                    url += `pos=${position}&`;
                }
                return url;
            case 'rtsp':
                let urlBase = this.getUrlBase();
                // If we are in webadmin we need to have the origin or else https is not replaced with rtsp.
                if (!urlBase) {
                    urlBase = window.location.origin;
                }
                url = `${urlBase}/${cameraId}?stream=${resolution}&`.replace(
                    /https?:\/\//,
                    'rtsp://',
                );
                break;
            default:
                // Rtsp plays as webm but does not support transcoding.
                if (transport === 'mjpeg') {
                    transport = 'webm';
                }
                url = `${this.getUrlBase()}/rest/v3/devices/${cameraId}/media.${transport}?resolution=${resolution || ''}`;
        }

        if (position) {
            url += `${transport === 'webRtc' ? 'position' : 'positionMs'}=${position}&`;
        }
        return url;
    }
}
