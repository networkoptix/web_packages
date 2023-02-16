import { Inject, Injectable, LOCALE_ID } from '@angular/core';
import { Router } from '@angular/router';

import { NxRibbonService } from '@components/ribbon/ribbon.service';
import { NxToastService } from '@dialogs/toast.service';
import { environment } from '@environments/environment';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxSystemRestAPI2 } from '@services/system-rest-api-v2.service';
import { NxSystemRestAPI } from '@services/system-rest-api.service';
import { memoizeAsyncPersistent } from '@utils/memoize';

import { NxCloudApiService } from '../nx-cloud-api';
import { NxPollService } from '../poll.service';
import { NxSystemAPIService } from '../system-api.service';
import { NxSystemsService } from '../systems.service';

import { NxSystem } from './system';

@Injectable({
    providedIn: 'root'
})
export class NxSystemService {
    CONFIG: IConfig;
    private system: NxSystem;
    private systemsCache: { [systemId: string]: NxSystem } = {};

    constructor(
        configService: NxConfigService,
        private cloudApi: NxCloudApiService,
        private systemApiService: NxSystemAPIService,
        private pollService: NxPollService,
        private systemsService: NxSystemsService,
        private router: Router,
        private ribbonService: NxRibbonService,
        private toastService: NxToastService,
        @Inject(LOCALE_ID) private locale: string,
    ) {
        this.CONFIG = configService.getConfig();
    }

    getCurrentSystem(): NxSystem {
        return this.system;
    }

    @memoizeAsyncPersistent
    createSystem(
        currentUserEmail: string,
        systemId: string,
        serverId: string = null,
        skipPoll = false,
        skipSettingSystem = false
    ): NxSystem {
        const id = systemId || serverId;
        const cloudSystemInfo =
            (this.systemsService.systems || []).find(system => system.id === id);
        let system: NxSystem;
        if (id in this.systemsCache) {
            system = this.systemsCache[id];
        } else {
            system = new NxSystem(
                this.CONFIG,
                this.cloudApi,
                this.systemApiService,
                this.pollService,
                this.systemsService,
                this.ribbonService,
                this.toastService,
                this.router,
                this.locale,
                currentUserEmail,
                systemId,
                serverId,
                undefined,
                cloudSystemInfo?.version
            );
            if (cloudSystemInfo?.version) {
                this.systemsCache[id] = system;
            }
        }

        // This is done to set the auth keys for video. Local doesn't need auth keys
        // because cookies are same site and will be attached to all requests.
        if (!environment.isLocal) {
            system.updateSystemAuth(true).catch(() => {});
        }

        if (environment.isLocal || skipSettingSystem) {
            return system;
        }

        if (cloudSystemInfo?.useRest) {
            (system.mediaserver as NxSystemRestAPI)
                .setAccessTokenAsCookie()
                .subscribe(() => {});
        }

        this.system = system;
        this.system.lostConnection = false;
        // if (!skipPoll) {
        //     this.system.startPoll(systemId);
        // }
        return this.system;
    }

    @memoizeAsyncPersistent
    createLocalSystem(mediaServer: NxSystemRestAPI | NxSystemRestAPI2, userId: string, userEmail = ''): NxSystem {
        if (this.system === undefined) {
            this.system = new NxSystem(
                this.CONFIG,
                this.cloudApi,
                this.systemApiService,
                this.pollService,
                this.systemsService,
                this.ribbonService,
                this.toastService,
                this.router,
                this.locale,
                userEmail,
                '',
                '',
                userId,
                5.1, // TODO: Add a way to get the version from the server.
            );
            this.system.mediaserver = mediaServer;
            this.system.canMerge = true;
        }

        if (this.system.subscriberCount === 0) {
            this.system.startPoll();
        }

        if (!this.systemsService.systems) {
            // @ts-expect-error: [NxSystem] when local, should be fine for now
            // since systems service is used a lot more on cloud-only pages
            // but this might need fixing in the future
            this.systemsService.systems = [this.system];
        }
        return this.system;
    }
}
