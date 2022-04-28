import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxRibbonService } from '@components/ribbon';
import { environment } from '@environments/environment';
import { NxSystemRestAPI } from '@services/system-rest-api.service';

import { NxAppStateService } from '../nx-app-state.service';
import { NxCloudApiService } from '../nx-cloud-api';
import { NxConfigService, IConfig } from '../nx-config';
import { NxLanguageProviderService } from '../nx-language-provider';
import { NxPollService } from '../poll.service';
import { NxSystemAPIService } from '../system-api.service';
import { NxSystemsService } from '../systems.service';

import { NxSystem } from './system/system';

@Injectable({
    providedIn: 'root'
})
export class NxSystemService {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    private system: NxSystem;
    private systemsCache: { [systemId: string]: NxSystem };

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private cloudApi: NxCloudApiService,
        private systemApiService: NxSystemAPIService,
        private pollService: NxPollService,
        private systemsService: NxSystemsService,
        private appState: NxAppStateService,
        private router: Router,
        private ribbonService: NxRibbonService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
        this.systemsCache = {};
    }

    getCurrentSystem() {
        return this.system;
    }

    createSystem(
        currentUserEmail: string,
        systemId: string,
        serverId?: string,
        skipPoll?: boolean,
        skipSettingSystem?: boolean
    ): NxSystem {
        const id = systemId || serverId;
        const cloudSystemInfo: any =
            (this.systemsService.systems || []).find((system) => system.id === id);
        let system;
        if (id in this.systemsCache) {
            system = this.systemsCache[id];
        } else {
            system = new NxSystem(
                this.CONFIG,
                this.LANG,
                this.cloudApi,
                this.systemApiService,
                this.pollService,
                this.systemsService,
                this.ribbonService,
                this.router,
                currentUserEmail,
                systemId,
                serverId,
                undefined,
                cloudSystemInfo?.useRest
            );
            this.systemsCache[id] = system;
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
        if (!skipPoll) {
            this.system.startPoll(systemId);
        }
        return this.system;
    }

    createLocalSystem(mediaServer: NxSystemRestAPI, userId: string, userEmail = ''): NxSystem {
        if (this.system === undefined) {
            this.system = new NxSystem(
                this.CONFIG,
                this.LANG,
                this.cloudApi,
                this.systemApiService,
                this.pollService,
                this.systemsService,
                this.ribbonService,
                this.router,
                userEmail,
                '',
                '',
                userId,
                true,
                this.appState
            );
            this.system.mediaserver = mediaServer;
            this.system.canMerge = true;
            this.system.update().catch(() => {});
        }

        if (this.system.subscriberCount === 0) {
            this.system.startPoll();
        }

        if (!this.systemsService.systems) {
            this.systemsService.systems = [<any> this.system];
        }
        return this.system;
    }
}
