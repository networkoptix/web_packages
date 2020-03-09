import { Component, OnDestroy, OnInit } from '@angular/core';
import { NxSettingsService } from '../settings.service';
import { NxConfigService, IConfig } from '../../../../services/nx-config';
import { NxLanguageProviderService } from '../../../../services/nx-language-provider';
import { NxSystemsService } from '../../../../services/systems.service';
import { Subscription } from 'rxjs';
import { AutoUnsubscribe } from 'ngx-auto-unsubscribe';
import { filter } from 'rxjs/operators';
import { LanguageI18NStaticTypes } from '../../../../../language_i18n_static_types';

@AutoUnsubscribe()
@Component({
    selector   : 'nx-system-merge',
    templateUrl: 'merge-status.component.html',
    styleUrls  : ['merge-status.component.scss']
})

export class NxSystemMergeStatusComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    currentlyMerging: boolean;
    isMaster: boolean;
    LANG: LanguageI18NStaticTypes;
    mergeTargetSystem: any;
    system: any;

    private infoSubscription: Subscription;
    private systemSubscription: Subscription;

    constructor(configService: NxConfigService,
                private language: NxLanguageProviderService,
                private settingsService: NxSettingsService,
                private systemsService: NxSystemsService) {
        this.CONFIG = configService.getConfig();
    }

    ngOnDestroy() {}

    ngOnInit(): void {
        this.LANG = this.language.getTranslations();
        this.systemSubscription = this.settingsService.systemSubject
            .pipe(filter(system => system !== undefined))
            .subscribe((system) => {
                this.system = system;
                this.infoSubscription = this.system.infoSubject.subscribe(_ => {
                   if (this.system.mergeInfo) {
                       this.setMergeStatus(this.system.mergeInfo);
                   } else {
                       this.currentlyMerging = false;
                   }
                });
            });
    }

    getMergeTarget(targetSystemId) {
        return this.systemsService.systems.find((system) => targetSystemId === system.id);
    }

    setMergeStatus(mergeInfo) {
        if (!mergeInfo || Object.keys(mergeInfo).length === 0) {
            return;
        }
        this.currentlyMerging = true;
        this.isMaster = mergeInfo.role ? mergeInfo.role !== this.CONFIG.system.status.slave : mergeInfo.masterSystemId === this.system.id;
        this.mergeTargetSystem = this.getMergeTarget(mergeInfo.anotherSystemId) || this.LANG.system.mergeUnknownName;
        if (!this.isMaster) {
            this.settingsService.mergeTarget = this.mergeTargetSystem.id;
        }
    }
}
