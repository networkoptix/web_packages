import { Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injector } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { Observable, combineLatest, map } from 'rxjs';

import { NxHealthService } from '@pages/health/health.service';
import { getUsersRestV3 } from '@services/mediaserver-apis/endpoints/get-users';

import { NxAppStateService } from './nx-app-state.service';
import { IConfig } from './nx-config/config-types';
import * as t from './system-api-groups.types.bak';
import type { AggregatedUsers } from './system-api.aggregated-types';
import { ChangedIdReturned } from './system-api.types';
import { NxSystemRestAPI2 } from './system-rest-api-v2.service';
import { NxSystemUser } from './system.service/user-manager/user-manager-types.bak';
import { NxUriCacheService } from './uri-cache.service';

export class NxSystemRestAPI3 extends NxSystemRestAPI2 {
    readonly version: number;

    constructor(
        http: HttpClient,
        configService: IConfig,
        location: Location,
        userEmail: string,
        systemId: string,
        serverId: string,
        unauthorizedCallback: (params: Record<string, unknown>) => Promise<unknown>,
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
        this.version = 5.2;
    }

    // getUsers
    getUsers = getUsersRestV3;

    getAggregatedUsersData(): Observable<AggregatedUsers> {
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

    // createUser
    // createUser(user: User) {
    //     return this.post<t.NormalResponse<t.UserWithGroups>>('/rest/v3/user', user).toPromise();
    // }

    // saveUser
    modifyUser(
        user: Partial<NxSystemUser>,
        id: string,
    ): Observable<NxSystemUser | t.User | ChangedIdReturned> {
        return this.patch(`/rest/v3/users/${id}`, user);
    }

    // getUserGroups
    getUserGroups(): Observable<t.UserGroups[]> {
        return this.get('/rest/v3/userGroups');
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
    ): Partial<t.User> {
        return {
            name: '',
            email,
            type,
            fullName,
            isOwner: false,
            permissions: 'NoGlobalPermissions',
            isEnabled: true,
            groupIds: [],
        };
    }
}
