import { Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';

import { environment } from '@environments/environment';
import { NxCurrentRelayInterceptor } from '@interceptors/current-relay-interceptor';
import { NxHealthService } from '@pages/health/health.service';
import { NxSystemRestAPI2 } from '@services/system-rest-api-v2.service';
import { memoizeAsyncPersistent } from '@utils/memoize';

import { NxAppStateService } from './nx-app-state.service';
import { nxConfig } from './nx-config/config';
import type { IConfig } from './nx-config/config-types';
import { NxSystemAPI } from './system-legacy-api.service';
import { NxSystemRestAPI3 } from './system-rest-api-v3.service';
import { NxSystemRestAPI } from './system-rest-api.service';
import { NxUriCacheService } from './uri-cache.service';

@Injectable({
    providedIn: 'root',
})
export class NxSystemAPIService {
    CONFIG: IConfig = nxConfig;
    localApi: NxSystemAPI;
    // systemConnections: { [serverId: string]: NxSystemAPI };

    constructor(
        protected location: Location,
        protected http: HttpClient,
        protected cacheService: NxUriCacheService,
        protected cookieService: CookieService,
        protected healthService: NxHealthService,
        protected appState: NxAppStateService,
        protected injector: Injector,
    ) {
        // this.systemConnections = {};
    }

    @memoizeAsyncPersistent
    createConnection<
        S extends NxSystemAPI | NxSystemRestAPI | NxSystemRestAPI2 | NxSystemRestAPI3 =
            | NxSystemAPI
            | NxSystemRestAPI
            | NxSystemRestAPI2
            | NxSystemRestAPI3,
    >(
        user: string,
        systemId: string,
        serverId: string,
        unauthorizedCallback: (...params: any) => any,
        version = 0,
    ): S {
        // const sysServe = `${systemId}+${serverId}`;
        // if (systemId && serverId && sysServe in this.systemConnections) {
        //     return this.systemConnections[sysServe];
        // } else if (systemId in this.systemConnections) {
        //     return this.systemConnections[systemId];
        // } else if (serverId in this.systemConnections) {
        //     return this.systemConnections[serverId];
        // } else {
        //     const mediaserverConnection = new NxSystemAPI(
        //         this.http, this.CONFIG, this.location, user, systemId, serverId, unauthorizedCallback
        //     );
        //     this.systemConnections[sysServe]
        // }
        if (environment.isLocal && this.localApi && !(user || systemId || serverId)) {
            return this.localApi as S;
        }
        const useRest = Math.floor(version) > 4;
        let serverApi;
        if (useRest || environment.isLocal) {
            if (version >= 5.2 && this.CONFIG.featureFlags.usersWithGroups) {
                serverApi = new NxSystemRestAPI3(
                    this.http,
                    this.CONFIG,
                    this.location,
                    user,
                    systemId,
                    serverId,
                    unauthorizedCallback,
                    this.cacheService,
                    this.cookieService,
                    this.healthService,
                    this.appState,
                    this.injector,
                ) as S;
            } else if (version > 5.0) {
                serverApi = new NxSystemRestAPI2(
                    this.http,
                    this.CONFIG,
                    this.location,
                    user,
                    systemId,
                    serverId,
                    unauthorizedCallback,
                    this.cacheService,
                    this.cookieService,
                    this.healthService,
                    this.appState,
                    this.injector,
                ) as S;
            } else {
                serverApi = new NxSystemRestAPI(
                    this.http,
                    this.CONFIG,
                    this.location,
                    user,
                    systemId,
                    serverId,
                    unauthorizedCallback,
                    this.cacheService,
                    this.cookieService,
                    this.healthService,
                    this.appState,
                    this.injector,
                ) as S;
            }
            if (environment.isLocal) {
                if (!this.localApi) {
                    this.localApi = serverApi;
                } else {
                    (serverApi as NxSystemRestAPI)?.setVmsToken(
                        (this.localApi as NxSystemRestAPI)?.vmsToken,
                    );
                }
            }
        } else {
            serverApi = new NxSystemAPI(
                this.http,
                this.CONFIG,
                this.location,
                user,
                systemId,
                serverId,
                unauthorizedCallback,
                this.cacheService,
                this.cookieService,
                this.healthService,
                this.appState,
                this.injector,
            ) as S;
        }
        NxCurrentRelayInterceptor.currentRelays[serverApi.currentRelayHost] = serverApi;
        return serverApi;
    }
}
