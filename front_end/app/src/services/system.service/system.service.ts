import { Injectable } from '@angular/core';

import { NxConfigService, IConfig }        from '../nx-config';
import { NxLanguageProviderService }       from '../nx-language-provider';
import { NxCloudApiService }               from '../nx-cloud-api';
import { NxSystemsService }                from '../systems.service';
import { NxSystemAPIService }              from '../system-api.service';
import { NxPollService }                   from '../poll.service';
import { NxAppStateService }               from '../nx-app-state.service';
import { LanguageI18NStaticTypes }         from '@app/language_i18n_static_types';
import { NxRibbonService }                 from '@components/ribbon';
import { NxSystem }                        from './system/system';
import { NxSystemRestAPI }                 from '@services/system-rest-api.service';
import { Router }                          from '@angular/router';

@Injectable({
    providedIn: 'root'
})
export class NxSystemService {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    private localSystem: NxSystem;
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

    getLocalSystem() {
        return this.localSystem;
    }

    /**
        * Factory that creates NxSystem instances
    */
    async createSystem(currentUserEmail: string, systemId: string, serverId?: string, skipPoll?: boolean) {
        const id = systemId || serverId;
        const { reply: { version } } = await this.systemApiService.createConnection(currentUserEmail, systemId, serverId, Promise.resolve)
            .getModuleInfo().toPromise()
            .catch(() => { return { reply: { version: 0 } }; });
        if (id in this.systemsCache) {
            this.system = this.systemsCache[id];
        } else {
            this.system = new NxSystem(
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
                serverId
            );
            this.systemsCache[id] = this.system;
        }
        this.system.lostConnection = false;
        this.system.setApiVersion(version);
        if (!skipPoll) {
            this.system.startPoll(systemId);
        }
        return this.system;
    }

    createLocalSystem(mediaServer: NxSystemRestAPI, userId: string, userEmail = '') {
        if (this.localSystem === undefined) {
            this.localSystem = new NxSystem(
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
                this.appState
            );
            this.localSystem.mediaserver = mediaServer;
            this.localSystem.canMerge = true;
            this.localSystem.setApiVersion(NxSystemRestAPI.supportedVersion);
            this.localSystem.update();
        }

        if (this.localSystem.subscriberCount === 0) {
            this.localSystem.startPoll();
        }

        if (!this.systemsService.systems) {
            this.systemsService.systems = [<any> this.localSystem];
        }
        return this.localSystem;
    }
}
