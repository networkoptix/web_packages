import {
    Component,
    EventEmitter,
    OnDestroy,
    OnInit,
    Output
} from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Subscription, timer } from 'rxjs';
import { startWith } from 'rxjs/operators';

import { NxRibbonService } from '@components/ribbon/ribbon.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';

import { NxHealthService } from '../health.service';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-health-update',
    templateUrl: './update-info.component.html',
    styleUrls: ['update-info.component.scss']
})
export class NxUpdateInfoComponent implements OnInit, OnDestroy {
    @Output() updateHealth = new EventEmitter<boolean>();

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
        this.LANG = languageService.translations;
        this.CONFIG = configService.getConfig();
    }

    ngOnDestroy(): void { }

    ngOnInit(): void {
        this.initUpdateTime();
        this.updateHealth.subscribe(() => {
            this.initUpdateTime();
        });
    }

    refreshHealth = (): void => {
        // arrow function because "this"
        this.updateHealth.emit(true);
        this.ribbonService.hide();
    };

    initUpdateTime(): void {
        if (this.timerSubscription) {
            this.timerSubscription.unsubscribe();
        }

        this.lastUpdate = '0 min ago';

        const minute = 60 * 1000;
        const currentHmAge =
            (Date.now() - this.healthService.lastUpdate) / minute | 0;
        this.timerSubscription = timer(0, minute)
            .pipe(startWith(currentHmAge))
            .subscribe(minutes => {
                if (minutes >= this.CONFIG.healthMonitoring.staleReportTimeout) {
                    this.ribbonService.show(
                        this.LANG.common.viewingOutdatedReport(),
                        [{ type: 'link', text: 'Refresh', value: '' }],
                        'alert',
                        this.refreshHealth
                    );
                } else {
                    this.ribbonService.hide();
                }
                if (minutes) {
                    const time = this.healthService.secondsToTime(
                        minutes * 60, 'updateTime'
                    );
                    this.lastUpdate = `${time.replace(/m/, ' min')} ago`;
                }
            });
    }
}
