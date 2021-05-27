import { Injectable }                          from '@angular/core';
import { HttpClient }                          from '@angular/common/http';
import { Location }                            from '@angular/common';
import { NxConfigService, IConfig }            from './nx-config';
import { NxUriCacheService }                   from './uri-cache.service';
import { NxAppStateService }                   from './nx-app-state.service';
import { NxSystemRestAPI }                     from './system-rest-api.service';
import { NxSystemAPI }                         from './system-legacy-api.service';
import { CookieService }                       from 'ngx-cookie-service';
import { NxHealthService }                     from '../pages/health/health.service';

export interface IParams<Value = any> {
    [key: string]: Value;
}

export interface User {
    canBeEdited: boolean;
    canBeDeleted: boolean;
    email: string;
    id: string;
    isCloud: boolean;
    isAdmin?: boolean;
    isEnabled: boolean;
    userRoleId: string;
    permissions: string;
    // TODO: Remove the trash below after #VMS-2968
    name: string;
    fullName: string;
}

export interface AddResponseTypeHere extends IParams {}

export { NxSystemAPI, NxSystemRestAPI };

@Injectable({
    providedIn: 'root'
})
export class NxSystemAPIService {
    CONFIG: IConfig;
    systemConnections: { [serverId: string]: NxSystemAPI };

    constructor(
        configService: NxConfigService,
        protected location: Location,
        protected http: HttpClient,
        protected cacheService: NxUriCacheService,
        protected cookieService: CookieService,
        protected healthService: NxHealthService,
        protected appState: NxAppStateService
    ) {
        this.CONFIG = configService.getConfig();
        this.systemConnections = {};
    }

    createConnection(user: string,
        systemId: string,
        serverId: string,
        unauthorizedCallback: (params?: IParams) => any,
        useRest = false
    ) {
        // const sysServe = `${systemId}+${serverId}`;
        // if (systemId && serverId && sysServe in this.systemConnections) {
        //     return this.systemConnections[sysServe];
        // } else if (systemId in this.systemConnections) {
        //     return this.systemConnections[systemId];
        // } else if (serverId in this.systemConnections) {
        //     return this.systemConnections[serverId];
        // } else {
        //     const mediaserverConnection = new NxSystemAPI(this.http, this.CONFIG, this.location, user, systemId, serverId, unauthorizedCallback);
        //     this.systemConnections[sysServe]
        // }
        return new (useRest || this.CONFIG.isLocal ? NxSystemRestAPI : NxSystemAPI)(this.http, this.CONFIG, this.location, user, systemId, serverId, unauthorizedCallback, this.cacheService, this.cookieService, this.healthService, this.appState);
    }
}

export interface ResourceParam {
    value: string;
    name: string;
    resourceId?: string;
}
