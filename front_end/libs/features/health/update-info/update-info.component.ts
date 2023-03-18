import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Subscription, timer } from 'rxjs';
import { startWith } from 'rxjs/operators';

import staticLang from '@common/language/language_i18n_static.json';
import { NxRibbonService } from '@components/ribbon/ribbon.service';
import { healthMonitoring, icons } from '@lib/variables/static-variables';

import { NxHealthService } from '../health.service';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-health-update',
    templateUrl: './update-info.component.html',
    styleUrls: ['update-info.component.scss'],
})
export class NxUpdateInfoComponent implements OnInit, OnDestroy {
    @Output() updateHealth = new EventEmitter<boolean>();

    LANG = staticLang;

    lastUpdate: string;
    timerSubscription: Subscription;
    icons = icons;

    constructor(private healthService: NxHealthService, private ribbonService: NxRibbonService) {}

    ngOnDestroy(): void {}

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
        const currentHmAge = ((Date.now() - this.healthService.lastUpdate) / minute) | 0;
        this.timerSubscription = timer(0, minute)
            .pipe(startWith(currentHmAge))
            .subscribe(minutes => {
                if (minutes >= healthMonitoring.staleReportTimeout) {
                    this.ribbonService.show(
                        this.LANG.common.viewingOutdatedReport,
                        [{ type: 'link', text: 'Refresh', value: '' }],
                        'alert',
                        this.refreshHealth,
                    );
                } else {
                    this.ribbonService.hide();
                }
                if (minutes) {
                    const time = this.healthService.secondsToTime(minutes * 60, 'updateTime');
                    this.lastUpdate = `${time.replace(/m/, ' min')} ago`;
                }
            });
    }
}
