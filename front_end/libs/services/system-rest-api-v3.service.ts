import { Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injector } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { Observable, combineLatest, map } from 'rxjs';

import { NxHealthService } from '@pages/health/health.service';
import { RequestOpts } from '@services/mediaserver-apis/connections/adapters/adapter-target-types';
import { addUserRestV3 } from '@services/mediaserver-apis/endpoints/add-user';
import { getUsersRestV3 } from '@services/mediaserver-apis/endpoints/get-users';
import { UserSessionV3 } from '@services/system-api.types';
import {
    AddUser,
    BaseNewUser,
    RestV3User,
    SystemUser,
    UserGroup,
} from '@services/system-user.types';
import { defaultHashFunction, memoizeAsync } from '@utils/memoize';

import { NxAppStateService } from './nx-app-state.service';
import { IConfig } from './nx-config/config-types';
import type { AggregatedUsers } from './system-api.aggregated-types';
import { ChangedIdReturned, UnauthorizedCallback } from './system-api.types';
import { NxSystemRestAPI2 } from './system-rest-api-v2.service';
import { NxUriCacheService } from './uri-cache.service';

export class NxSystemRestAPI3 extends NxSystemRestAPI2 {
    override readonly version: number;

    constructor(
        http: HttpClient,
        configService: IConfig,
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
        this.version = 6.0;
    }

    @memoizeAsync(defaultHashFunction, forceReload => !!forceReload, 10 * 1000)
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
            this.userRequest = this.get<UserSessionV3>(endpoint, { headers })
                .toPromise()
                .then(result => {
                    userId = result.id;
                    if (!this.accessToken) {
                        this._vmsToken = result.token;
                    }
                    return this.get<RestV3User>(`/rest/v3/users/${result.id}`, {
                        params: { _keepDefault: true },
                    }).toPromise();
                })
                .then(result => {
                    this.currentUser = result;
                    return this.currentUser;
                })
                .catch(err => {
                    // Unknown session token
                    if (err.errorId === 'cantProcessRequest') {
                        this.accessToken = '';
                    } else if (err.error.errorString === `Resource '${userId}' is not found`) {
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
                    '/ec2/getPredefinedRoles': [],
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

    buildRpcUrl(): Observable<string> {
        return this.createTicket().pipe(map(({ token }) => this.generateRpcSocketUrl(token)));
    }

    private generateRpcSocketUrl(token: string): string {
        return `${this.getUrlBase('wss:')}/jsonrpc?_ticket=${token}`;
    }
}
