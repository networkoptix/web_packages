import {Component, Inject, Input, OnInit} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { NxSettingsService } from '../settings.service';
import {NxConfigService} from '../../../../services/nx-config';
import {NxLanguageProviderService} from '../../../../services/nx-language-provider';


@Component({
    selector   : 'nx-system-merge',
    templateUrl: 'merge-status.component.html',
    styleUrls  : ['merge-status.component.scss']
})

export class NxSystemMergeStatusComponent implements OnInit {
    config: any;
    currentlyMerging: boolean;
    isMaster: boolean;
    LANG: any;
    mergeTargetSystem: any;
    system: any;

    constructor(@Inject('systemsProvider') private systemsProvider: any,
                private _config: NxConfigService,
                private language: NxLanguageProviderService,
                private settingsService: NxSettingsService,
                private translate: TranslateService) {
        this.config = this._config.getConfig();
    }

    ngOnInit(): void {
        this.LANG = this.language.getTranslations();
        this.settingsService.systemSubject.subscribe((system) => {
            if (system === undefined) {
                return;
            }
            this.system = system;
            this.system.mergeInfo = {
                anotherSystemId: '196cea71-0bb5-43dd-a8d1-06f6b9484e9a'
            };
            this.setMergeStatus(this.system.mergeInfo);
        });
    }

    getMergeTarget(targetSystemId) {
        return this.systemsProvider.systems.find((system) => targetSystemId === system.id);
    }

    setMergeStatus(mergeInfo) {
        if (!mergeInfo || Object.keys(mergeInfo).length === 0) {
            return;
        }
        this.currentlyMerging = true;
        this.isMaster = mergeInfo.role ? mergeInfo.role !== this.config.systemStatuses.slave : mergeInfo.masterSystemId === this.system.id;
        this.mergeTargetSystem = this.getMergeTarget(mergeInfo.anotherSystemId) || this.LANG.system.unknownName;
    }
}
