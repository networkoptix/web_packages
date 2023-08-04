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
import type { UnauthorizedCallback } from './system-api.types';
import { NxSystemAPI } from './system-legacy-api.service';
import { NxSystemRestAPI3 } from './system-rest-api-v3.service';
import { NxSystemRestAPI } from './system-rest-api.service';
import { NxUriCacheService } from './uri-cache.service';

@Injectable({
    providedIn: 'root',
})
export class NxSystemAPIService {
    CONFIG: IConfig = nxConfig;
    localApi: NxSystemRestAPI | NxSystemRestAPI2 | NxSystemRestAPI3;

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
    }: {
        user?: string;
        systemId?: string;
        serverId?: string;
        unauthorizedCallback?: UnauthorizedCallback;
        version?: number;
    } = {}): NxSystemAPI | NxSystemRestAPI | NxSystemRestAPI2 | NxSystemRestAPI3 {
        if (environment.isLocal && this.localApi && !(user || systemId || serverId)) {
            return this.localApi;
        }
        const useRest = Math.floor(version) > 4;
        let serverApi: NxSystemAPI | NxSystemRestAPI | NxSystemRestAPI2 | NxSystemRestAPI3;

        const args = [
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
        ] as const;

        if (useRest || environment.isLocal) {
            let restApi: NxSystemRestAPI | NxSystemRestAPI2 | NxSystemRestAPI3;
            if (version >= 5.2 && this.CONFIG.featureFlags.usersWithGroups) {
                restApi = new NxSystemRestAPI3(...args);
            } else if (version > 5.0) {
                restApi = new NxSystemRestAPI2(...args);
            } else {
                restApi = new NxSystemRestAPI(...args);
            }
            if (environment.isLocal) {
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
