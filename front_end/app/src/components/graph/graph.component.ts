import {
    Component,
    Input,
    OnChanges,
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { curveBasis } from 'd3-shape';
import { Subject, timer } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';

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
    legendPosition = 'right';
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

    colorScheme = {
        domain: [
            '#a8385d',
            '#7aa3e5',
            '#a27ea8',
            '#aae3f5',
            '#adcded',
            '#a95963',
            '#8796c0',
            '#7ed3ed',
            '#50abcc',
            '#ad6886',
            '#bf9d76',
            '#e99450',
            '#d89f59',
            '#f2dfa7',
            '#a5d7c6',
            '#7794b1',
            '#afafaf',
            '#707160',
            '#ba9383',
            '#d9d5c3'
        ]
    };

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
            this.destroy$.next();
            this.multi = [];
            this.getStats();
        }
    }

    private getStats() {
        timer(0, 1000)
            .pipe(
                untilDestroyed(this),
                takeUntil(this.destroy$),
                switchMap(() => this.system.serverManager.getStatistics(this.selectedServerId)),
            ).subscribe(response => {
                response.reply && response.reply.statistics.forEach(data => {
                    const seriesData = this.multi.find(series => series.name === data.description);
                    if (!seriesData) {
                        const series = Array.from({ length: 50 }, (_, i) => { return { name: i + 1, value: 0 }; });
                        this.multi.push({
                            name: data.description,
                            series: series
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
