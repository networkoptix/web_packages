import { Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';

import { environment } from '@environments/environment';
import { NxHealthService } from '@pages/health/health.service';
import { NxSystemRestAPI2 } from '@services/system-rest-api-v2.service';

import { NxAppStateService } from './nx-app-state.service';
import type { IConfig } from './nx-config/config-types';
import { NxConfigService } from './nx-config/nx-config.service';
import { NxSystemAPI } from './system-legacy-api.service';
import { NxSystemRestAPI } from './system-rest-api.service';
import { NxUriCacheService } from './uri-cache.service';

@Injectable({
    providedIn: 'root'
})
export class NxSystemAPIService {
    CONFIG: IConfig;
    localApi: NxSystemAPI;
    // systemConnections: { [serverId: string]: NxSystemAPI };

    constructor(
        configService: NxConfigService,
        protected location: Location,
        protected http: HttpClient,
        protected cacheService: NxUriCacheService,
        protected cookieService: CookieService,
        protected healthService: NxHealthService,
        protected appState: NxAppStateService,
        protected injector: Injector
    ) {
        this.CONFIG = configService.getConfig();
        // this.systemConnections = {};
    }

    createConnection<S extends NxSystemAPI | NxSystemRestAPI | NxSystemRestAPI2 = NxSystemAPI | NxSystemRestAPI | NxSystemRestAPI2>(
        user: string,
        systemId: string,
        serverId: string,
        unauthorizedCallback: (...params: any) => any,
        version = 0
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
        if (useRest || environment.isLocal) {
            let serverApi;
            if (version > 5.0) {
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
                    this.injector
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
                    this.injector
                ) as S;
            }
            if (environment.isLocal) {
                if (!this.localApi) {
                    this.localApi = serverApi;
                } else {
                    (serverApi as NxSystemRestAPI)?.setVmsToken((this.localApi as NxSystemRestAPI)?.vmsToken);
                }
            }
            return serverApi;
        } else {
            return new NxSystemAPI(
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
            ) as S;
        }
    }
}
