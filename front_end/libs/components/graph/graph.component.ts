import {
    Component,
    ElementRef,
    Inject,
    Input,
    OnChanges,
    TemplateRef,
    booleanAttribute,
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';
import { LegendPosition, NgxChartsModule } from '@swimlane/ngx-charts';
import { curveBasis } from 'd3-shape';
import { of, Subject } from 'rxjs';
import { catchError, delay, mergeMap, repeat, retry, takeUntil, tap } from 'rxjs/operators';

import staticLang from '@common/language/language_i18n_static.json';
import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSectionPlaceholderComponent } from '@components/placeholders/section/section-placeholder.component';
import { NxAccountService } from '@services/account.service';
import { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';
import { NxSystemsService } from '@services/systems.service';
import { WINDOW } from '@services/window-provider';
import { NgChanges } from '@utils/ng-changes';

/* USAGE
 <nx-monitoring-graph [system]="system" [selectedServerId]="selectedServerId"></monitoring-graph>
*/

@UntilDestroy()
@Component({
    selector: 'nx-monitoring-graph',
    templateUrl: 'graph.component.html',
    styleUrls: ['graph.component.scss'],
    standalone: true,
    imports: [
        TranslateModule,
        NxContentBlockComponent,
        NxContentBlockSectionComponent,
        NxPreLoaderComponent,
        NxSectionPlaceholderComponent,
        NgxChartsModule,
    ],
})
export class NxMonitoringGraphComponent implements OnChanges {
    @Input() system: NxSystem;
    @Input() systemId: string;
    @Input() selectedServerId: string;
    @Input({ transform: booleanAttribute }) noFrame: boolean;
    @Input() refreshInterval: number = 1000;
    @Input({ transform: booleanAttribute }) showFullscreen: boolean;
    @Input() lostConnectionPlaceholder: TemplateRef<unknown>;

    LANG = staticLang;

    private destroy$ = new Subject<true>();

    view: [number, number]; // fitContainer
    multi: {
        name: string;
        series: { name: number; value: number }[]; // name type is number as we use position or uptimeMs to define data points
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
    offline: boolean = false;

    private setupDefaults(): void {
        // leave "view" undefined to "fitContent"
        // this.view = [700, 500];
    }

    constructor(
        private systemsService: NxSystemsService,
        private systemService: NxSystemService,
        private accountService: NxAccountService,
        @Inject(WINDOW) public window: Window,
        private elRef: ElementRef,
    ) {
        this.setupDefaults();

        this.multi = [];
    }

    toggleFullScreen(): void {
        if (this.window.document.fullscreenElement) {
            this.window.document.exitFullscreen();
        } else {
            this.elRef.nativeElement.requestFullscreen({ navigationUI: 'hide' });
        }
    }

    async ngOnChanges(changes: NgChanges<NxMonitoringGraphComponent>): Promise<void> {
        if (
            changes.system?.currentValue ||
            changes.selectedServerId?.currentValue ||
            changes.systemId?.currentValue
        ) {
            this.destroy$.next(true);

            if (this.systemId && !this.system) {
                await this.systemsService.getSystemAsPromise(this.systemId);
                this.system = this.systemService.createSystem(
                    this.accountService.account.email,
                    this.systemId,
                );
                await this.system.update();
                // await this.system.serverManager.initSystemMediaServers();
            }

            if (this.system && this.selectedServerId) {
                this.multi = [];
                this.getStats();
            }
        }
    }

    private getStats(): void {
        of({})
            .pipe(
                mergeMap(() => this.system.serverManager.getStatistics(this.selectedServerId)),
                // Delay is required in case Server Manager is not initialized yet
                retry({ delay: 10, count: 2 }),
                tap(response => {
                    response.reply?.statistics.forEach(data => {
                        const seriesData = this.multi.find(
                            series => series.name === data.description,
                        );
                        if (!seriesData) {
                            const series = Array.from({ length: 50 }, (_, i) => {
                                return { name: i + 1, value: 0 };
                            });
                            this.multi.push({
                                name: data.description,
                                series,
                            });
                            this.multi[this.multi.length - 1].series.push({
                                name: response.reply.uptimeMs,
                                value: Math.round(data.value * 100),
                            });
                            this.multi[this.multi.length - 1].series.shift();
                        } else {
                            seriesData.series.push({
                                name: response.reply.uptimeMs,
                                value: Math.round(data.value * 100),
                            });
                            seriesData.series.shift();
                        }
                    });
                    this.offline = false;
                    this.multi = [...this.multi];
                }),
                catchError(() => {
                    this.offline = true;
                    return Promise.resolve();
                }),
                delay(this.refreshInterval),
                repeat(),
                untilDestroyed(this),
                takeUntil(this.destroy$),
            )
            .subscribe();
    }
}
