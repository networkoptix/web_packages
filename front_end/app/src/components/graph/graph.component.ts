import {
    Component,
    Input,
    OnChanges,
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { LegendPosition } from '@swimlane/ngx-charts';
import { curveBasis } from 'd3-shape';
import { Subject, timer } from 'rxjs';
import { concatMap, takeUntil } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxSystem } from '@services/system.service/system';
import { NgChanges } from '@utils/ng-changes';

/* USAGE
 <monitoring-graph [system]="system" [selectedServerId]="selectedServerId"></monitoring-graph>
*/

@UntilDestroy()
@Component({
    selector: 'monitoring-graph',
    templateUrl: 'graph.component.html',
    styleUrls: ['graph.component.scss']
})

export class NxMonitoringGraphComponent implements OnChanges {
    @Input() system: NxSystem;
    @Input() selectedServerId: string;
    @Input() noFrame = false;
    @Input() refreshInterval = 1000;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    private destroy$ = new Subject();

    view = undefined; // fitContainer
    multi: {
        name: string;
        series: { name: number; value: number; }[]; // name type is number as we use position or uptimeMs to define data points
    }[];

    // options
    legend: boolean = true;
    legendTitle = '';
    legendPosition = LegendPosition.Right;
    showLabels: boolean = true;
    animations: boolean = false;
    xAxis: boolean = false;
    yAxis: boolean = true;
    showYAxisLabel: boolean = false;
    showXAxisLabel: boolean = false;
    xAxisLabel: string = '';
    yAxisLabel: string = '';
    timeline: boolean = false;
    curve = curveBasis;

    private setupDefaults(): void {
        // leave "view" undefined to "fitContent"
        // this.view = [700, 500];
    }

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;

        this.setupDefaults();

        this.multi = [];
    }

    ngOnChanges(changes: NgChanges<NxMonitoringGraphComponent>): void {
        if (changes.system?.currentValue || changes.selectedServerId?.currentValue) {
            this.destroy$.next(true);

            if (this.system && this.selectedServerId) {
                this.multi = [];
                this.getStats();
            }
        }
    }

    private getStats() {
        timer(0, this.refreshInterval)
            .pipe(
                concatMap(() => this.system.serverManager.getStatistics(this.selectedServerId)),
                untilDestroyed(this),
                takeUntil(this.destroy$),
            ).subscribe(response => {
                response.reply && response.reply.statistics.forEach(data => {
                    const seriesData = this.multi.find(series => series.name === data.description);
                    if (!seriesData) {
                        const series = Array.from({ length: 50 }, (_, i) => { return { name: i + 1, value: 0 }; });
                        this.multi.push({
                            name: data.description,
                            series
                        });
                        this.multi[this.multi.length - 1].series.push({
                            name: response.reply.uptimeMs,
                            value: Math.round(data.value * 100)
                        });
                        this.multi[this.multi.length - 1].series.shift();
                    } else {
                        seriesData.series.push({
                            name: response.reply.uptimeMs,
                            value: Math.round(data.value * 100)
                        });
                        seriesData.series.shift();
                    }
                });

                this.multi = [...this.multi];
            });
    }
}
