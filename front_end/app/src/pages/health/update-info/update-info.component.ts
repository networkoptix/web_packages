import { Component, EventEmitter, OnDestroy, OnInit, Output, ViewEncapsulation } from '@angular/core';
import { Subscription, timer } from 'rxjs';
import { NxUtilsService } from '../../../services/utils.service';
import { NxConfigService, IConfig } from '../../../services/nx-config';
import { NxHealthService } from '../health.service';
import { AutoUnsubscribe } from 'ngx-auto-unsubscribe';
import { NxRibbonService } from '../../../components/ribbon/ribbon.service';
import { NxLanguageProviderService } from '../../../services/nx-language-provider';
import { LanguageI18NStaticTypes } from '../../../../language_i18n_static_types';

@AutoUnsubscribe()
@Component({
    selector : 'nx-health-update',
    templateUrl : './update-info.component.html',
    styleUrls : ['update-info.component.scss']
})
export class NxUpdateInfoComponent implements OnInit, OnDestroy {
    @Output() updateHealth = new EventEmitter();

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    lastUpdate: string;
    timerSubscription: Subscription;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private healthService: NxHealthService,
        private ribbonService: NxRibbonService
    ) {
        this.LANG = languageService.getTranslations();
        this.CONFIG = configService.getConfig();
    }

    ngOnDestroy() {}

    ngOnInit() {
        this.initUpdateTime();
        this.updateHealth.subscribe(() => {
            this.initUpdateTime();
        });
    }

    refreshHealth = () => {
        // arrow function because "this"
        this.updateHealth.emit();
        this.ribbonService.hide();
    }

    initUpdateTime() {
        if (this.timerSubscription) {
            this.timerSubscription.unsubscribe();
        }

        this.lastUpdate = '0 min ago';

        const minute = 60 * 1000;
        this.timerSubscription = timer(0, minute).subscribe((minutes) => {
            if (minutes >= this.CONFIG.healthMonitoring.staleReportTimeout) {
                this.ribbonService.show(this.LANG.common.viewingOutdatedReport, 'Refresh', '', 'alert', this.refreshHealth);
            }
            if (minutes) {
                const time = this.healthService.secondsToTime(minutes * 60, 'updateTime');
                this.lastUpdate = `${time.replace(/m/, ' min')} ago`;
            }
        });
    }
}
