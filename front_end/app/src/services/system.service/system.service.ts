import { Injectable } from '@angular/core';
import { Subject }    from 'rxjs';

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

@Injectable({
    providedIn: 'root'
})
export class NxSystemService {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    private system: NxSystem;
    private systemsCache: { [systemId: string]: NxSystem };
    private cancelPoll$ = new Subject<string>();

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private cloudApi: NxCloudApiService,
        private systemApiService: NxSystemAPIService,
        private pollService: NxPollService,
        private systemsService: NxSystemsService,
        private appState: NxAppStateService,
        private ribbonService: NxRibbonService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
        this.systemsCache = {};
    }

    createSystem(currentUserEmail: string, systemId: string, serverId?: string, skipPoll?: boolean) {
        if (!skipPoll) {
            this.cancelPoll$.next('cancel system polling');
        }
        let system: NxSystem;
        const id = systemId || serverId;
        if (id in this.systemsCache) {
            system = this.systemsCache[id];
        } else {
            system = new NxSystem(
                this.CONFIG,
                this.LANG,
                this.cancelPoll$,
                this.cloudApi,
                this.systemApiService,
                this.pollService,
                this.systemsService,
                this.ribbonService,
                currentUserEmail,
                systemId,
                serverId
            );
            this.systemsCache[id] = system;
        }
        system.lostConnection = false;
        system.serverManager.getModuleInfo().toPromise().then(({ reply: { version } }) => {
            system.setApiVersion(version || NxSystemRestAPI.supportedVersion);
        });
        if (!skipPoll) {
            system.startPoll();
        }
        return system;
    }

    createLocalSystem(mediaServer: NxSystemRestAPI, userId: string, userEmail = '') {
        if (this.system !== undefined) {
            return this.system;
        }
        this.cancelPoll$.next('cancel system polling');
        this.system = new NxSystem(
            this.CONFIG,
            this.LANG,
            this.cancelPoll$,
            this.cloudApi,
            this.systemApiService,
            this.pollService,
            this.systemsService,
            this.ribbonService,
            userEmail,
            '',
            '',
            userId,
            this.appState
        );
        this.system.mediaserver = mediaServer;
        this.system.canMerge = true;
        this.system.setApiVersion(NxSystemRestAPI.supportedVersion);
        this.system.update();
        this.system.startPoll();
        if (!this.systemsService.systems) {
            this.systemsService.systems = [<any> this.system];
        }
        return this.system;
    }
}
