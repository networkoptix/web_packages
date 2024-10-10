import { Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';

import { environment } from '@environments/environment';
import { NxCurrentRelayInterceptor } from '@interceptors/current-relay-interceptor';
import { NxHealthService } from '@pages/health/health.service';
import { memoizeAsyncPersistent } from '@utils/memoize';

import { NxAppStateService } from './nx-app-state.service';
import type { UnauthorizedCallback } from './system-api.types';
import { NxSystemAPI } from './system-legacy-api.service';
import { NxSystemRestAPI2 } from './system-rest-api-v2.service';
import { NxSystemRestAPI3 } from './system-rest-api-v3.service';
import { NxSystemRestAPI4 } from './system-rest-api-v4.service';
import { NxSystemRestAPI } from './system-rest-api.service';
import { NxUriCacheService } from './uri-cache.service';

@Injectable({
    providedIn: 'root',
})
export class NxSystemAPIService {
    localApi: NxSystemRestAPI | NxSystemRestAPI2 | NxSystemRestAPI3 | NxSystemRestAPI4;

    constructor(
        protected location: Location,
        protected http: HttpClient,
        protected cacheService: NxUriCacheService,
        protected cookieService: CookieService,
        protected healthService: NxHealthService,
        protected appState: NxAppStateService,
        protected injector: Injector,
    ) {}

    @memoizeAsyncPersistent
    createConnection({
        user,
        systemId,
        serverId,
        unauthorizedCallback = () => Promise.resolve(),
        version = 0,
        skipSettingSystem = false,
    }: {
        user?: string;
        systemId?: string;
        serverId?: string;
        unauthorizedCallback?: UnauthorizedCallback;
        version?: number;
        skipSettingSystem?: boolean;
    } = {}):
        | NxSystemAPI
        | NxSystemRestAPI
        | NxSystemRestAPI2
        | NxSystemRestAPI3
        | NxSystemRestAPI4 {
        if (environment.isWebadmin && this.localApi && !(user || systemId || serverId)) {
            return this.localApi;
        }
        const useRest = Math.floor(version) > 4;
        let serverApi:
            | NxSystemAPI
            | NxSystemRestAPI
            | NxSystemRestAPI2
            | NxSystemRestAPI3
            | NxSystemRestAPI4;

        const args = [
            this.http,
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
            skipSettingSystem,
        ] as const;

        if (useRest || environment.isWebadmin) {
            let restApi: NxSystemRestAPI | NxSystemRestAPI2 | NxSystemRestAPI3 | NxSystemRestAPI4;
            if (version > 6.0) {
                restApi = new NxSystemRestAPI4(...args);
            } else if (version > 5.1) {
                restApi = new NxSystemRestAPI3(...args);
            } else if (version > 5.0) {
                restApi = new NxSystemRestAPI2(...args);
            } else {
                restApi = new NxSystemRestAPI(...args);
            }
            if (environment.isWebadmin) {
                if (!this.localApi) {
                    this.localApi = restApi;
                } else {
                    restApi.setVmsToken(this.localApi.vmsToken);
                }
            }
            serverApi = restApi;
        } else {
            serverApi = new NxSystemAPI(...args);
        }
        NxCurrentRelayInterceptor.currentRelays[serverApi.currentRelayHost] = serverApi;
        return serverApi;
    }
}
