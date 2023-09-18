import { DOCUMENT } from '@angular/common';
import {
    AfterViewInit,
    Component,
    Inject,
    Input,
    OnChanges,
    OnInit,
    ViewEncapsulation,
} from '@angular/core';
import { chartCartesian } from '@d3fc/d3fc-chart';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import * as d3 from 'd3';
import { D3ZoomEvent } from 'd3';
import * as fc from 'd3fc';
import { animationFrameScheduler, interval } from 'rxjs';

import { NgChanges } from '@utils/ng-changes';
import { NxWebGLService } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/services/webgl.service';
import { CHUNK_TYPE } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/webgl-canvas.types';

interface DATA {
    width: number;
    x: number;
    y: number;
    type?: CHUNK_TYPE;
}

const ZOOM_WINDOW_TO_ANIMATE_MS = 30 * 60 * 1000;
const LAST_MINUTE_SIZE = 1.5 * 60 * 1000; // 1.5 minutes

@UntilDestroy()
@Component({
    selector: 'nx-simple-webgl-canvas',
    templateUrl: 'webgl-canvas.component.html',
    styleUrls: ['webgl-canvas.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class SimpleNxWebGLCanvasComponent implements OnInit, AfterViewInit, OnChanges {
    @Input() initialData: Array<Record<string, string>>;
    @Input() pushData: Array<Record<string, string>>;
    @Input() bookmarksData: Array<Record<string, string>>;
    @Input() analyticsData: Array<Record<string, string>>;

    @Input() showData: Record<string, boolean>;

    container: HTMLDivElement;
    barSeries: never | undefined;
    timeFrameInS: number;
    start: number;
    nowMs: number;
    currentPointer: Date;
    zoomEvent: D3ZoomEvent<never, never>;
    zoomEventOriginal: D3ZoomEvent<never, never>;

    // eslint-disable-next-line nx/no-untyped-init
    chart;
    // eslint-disable-next-line nx/no-untyped-init
    zoom;
    // eslint-disable-next-line nx/no-untyped-init
    canvas;
    // eslint-disable-next-line nx/no-untyped-init
    data = [];
    dataSet: number;

    xScaleOriginal: d3.ScaleTime<number, number>;
    xScale: d3.ScaleTime<number, number>;
    chunk: boolean;
    zoomInProcess: boolean = false;

    nowDate: Date;
    nowDateDomain: Date;
    nowDateOrigDomain: Date;

    constructor(
        private webglService: NxWebGLService,
        @Inject(DOCUMENT) private document: Document,
    ) {}

    ngOnInit(): void {
        this.data = [];
    }

    ngAfterViewInit(): void {
        interval(0, animationFrameScheduler)
            .pipe(untilDestroyed(this))
            .subscribe(() => {
                this.nowDate = new Date();
                this.nowMs = Date.now();
                this.timeFrameInS = Math.ceil((this.nowMs - this.start) / 1000);

                this.xScaleOriginal?.domain([this.start, this.nowMs]);

                if (this.zoomEvent) {
                    this.xScale.domain(
                        this.zoomEvent.transform.rescaleX(this.xScaleOriginal).domain(),
                    );

                    this.nowDateDomain = this.xScale.domain()[1];
                    this.nowDateOrigDomain = this.xScaleOriginal.domain()[1];
                }

                const periodMinutes =
                    this.xScale?.domain()[1].getTime() - this.xScale?.domain()[0].getTime();
                const last10minutes =
                    this.xScale?.domain()[1].getTime() >= this.nowMs - LAST_MINUTE_SIZE &&
                    periodMinutes < ZOOM_WINDOW_TO_ANIMATE_MS;

                if (this.zoomInProcess || last10minutes) {
                    this.redraw();
                }
            });
    }

    initBars(
        data: Array<DATA>,
        xScale: d3.ScaleTime<number, number, never>,
        yScale: d3.ScaleLinear<number, number, never>,
    ): void {
        this.barSeries = fc
            .seriesWebglBar(data)
            .equals((previousData, currentData) => previousData === currentData)
            .xScale(xScale)
            .yScale(yScale)
            .crossValue(d => d.x)
            .mainValue(d => d.y)
            .bandwidth(d => {
                return Math.max(1, xScale(d.x + d.width) - xScale(d.x));
            })
            .decorate(context => {
                fc
                    .webglFillColor()
                    .data(data)
                    .value(d => {
                        switch (d.type) {
                            case CHUNK_TYPE.BOOKMARK:
                                return [1.0, 0, 0, 0.5];
                            case CHUNK_TYPE.ANALYTICS:
                                return [0, 0, 1.0, 0.5];
                            case CHUNK_TYPE.IN_PROGRESS:
                                return [76 / 255, 188 / 255, 40 / 255, 1];
                            default:
                                // [r / 255, g / 255, b / 255, opacity] .. setting green_l2 here
                                return [76 / 255, 188 / 255, 40 / 255, 1];
                        }
                    })(context);
            }) as never;
    }

    initXscale(): void {
        this.xScale = d3
            .scaleTime()
            .domain([this.start, this.nowMs])
            .range([0, this.webglService.canvasWidth$.value]);

        this.xScaleOriginal = this.xScale.copy();
    }

    initZoom(): void {
        this.zoom = d3
            .zoom()
            .scaleExtent([1, this.timeFrameInS])
            .translateExtent([
                [0, 0],
                [this.webglService.canvasWidth$.value, this.webglService.canvasHeight$.value],
            ])
            .extent([
                [0, 0],
                [this.webglService.canvasWidth$.value, this.webglService.canvasHeight$.value],
            ])
            .on('start', event => {
                this.zoomInProcess = true;
            })
            .on('zoom', event => {
                this.zoomEvent = event;
            })
            .on('end', event => {
                this.zoomInProcess = false;
            });
    }

    render = (data: DATA[]): void => {
        if (!data.length) {
            return;
        }

        this.initBars(data, this.xScale, d3.scaleLinear());

        const pointer = fc.pointer().on('point', ([coord]) => {
            if (!coord) {
                return;
            }

            this.currentPointer = this.xScale.invert(coord.x);
        });

        this.chart = chartCartesian(this.xScale, d3.scaleLinear())
            .webglPlotArea(this.barSeries)
            .xDomain(this.xScale.domain())
            .yDomain([0, 30])
            .decorate(context =>
                context
                    .enter()
                    .select('d3fc-canvas.webgl-plot-area')
                    .on('measure', event => {
                        if (this.webglService.canvasWidth$.value === event.detail.width) {
                            return;
                        }

                        this.webglService.canvasWidth$.next(event.detail.width);
                        this.webglService.canvasHeight$.next(event.detail.height);
                        this.webglService.canvasRect$.next(event.target.getBoundingClientRect());

                        this.xScaleOriginal.range([0, this.webglService.canvasWidth$.value]);
                        this.initXscale();
                        this.initZoom();
                    })
                    .on('click', event => {
                        console.info(' => ', this.currentPointer);
                    })
                    .call(this.zoom)
                    .call(pointer),
            );

        this.redraw();
    };

    redraw = (): void => {
        if (!this.data.length || !this.xScale) {
            return;
        } else if (!this.chart) {
            this.render(this.data);
            return;
        }

        this.chart.xDomain(this.xScale.domain());

        const displayData = this.data.filter(
            d =>
                !(
                    (d.type === CHUNK_TYPE.BOOKMARK && !this.showData.bookmarks) ||
                    (d.type === CHUNK_TYPE.ANALYTICS && !this.showData.analytics) ||
                    (d.type === CHUNK_TYPE.RECORDS && !this.showData.records)
                ),
        );

        if (this.dataSet !== displayData.length) {
            this.dataSet = displayData.length;
            this.render(displayData);
            return;
        }

        d3.select('#chart').datum(displayData).call(this.chart);
    };

    private addData(dataObj: Record<string, string>[], type?: CHUNK_TYPE): void {
        const newData = dataObj.map((chunk: Record<string, string>) => {
            const chunkStart = parseInt(chunk.startTimeMs);
            let chunkEnd = parseInt(chunk.durationMs);
            type = chunkEnd < 0 ? CHUNK_TYPE.IN_PROGRESS : type;
            chunkEnd = chunkEnd < 0 ? Date.now() - chunkStart : chunkEnd;

            return { x: chunkStart, y: 30, width: chunkEnd, type };
        });

        this.data.push(...newData);
        this.redraw();
    }

    ngOnChanges(changes: NgChanges<SimpleNxWebGLCanvasComponent>): void {
        if (changes.initialData?.currentValue?.length) {
            this.data = this.initialData.map((chunk: Record<string, string>) => {
                const chunkStart = parseInt(chunk.startTimeMs);
                let chunkEnd = parseInt(chunk.durationMs);
                chunkEnd = chunkEnd > 0 ? chunkEnd : Date.now() - chunkStart;

                return { x: chunkStart, y: 30, width: chunkEnd, type: CHUNK_TYPE.RECORDS };
            });

            this.start = parseInt(this.initialData[0].startTimeMs);
            this.nowMs = Date.now();
            this.timeFrameInS = Math.ceil((this.nowMs - this.start) / 1000);

            this.container = this.document.querySelector('#chart');
            this.webglService.canvasWidth$.next(this.container.clientWidth);
            this.webglService.canvasHeight$.next(this.container.clientHeight);
            this.webglService.canvasRect$.next(this.container.getBoundingClientRect());

            this.initXscale();
            this.initZoom();
            this.render(this.data);
        }

        if (changes.pushData?.currentValue?.length) {
            this.addData(this.pushData, CHUNK_TYPE.RECORDS);
        }

        if (changes.bookmarksData?.currentValue?.length) {
            this.addData(this.bookmarksData, CHUNK_TYPE.BOOKMARK);
        }

        if (changes.analyticsData?.currentValue?.length) {
            this.addData(this.analyticsData, CHUNK_TYPE.ANALYTICS);
        }

        if (changes.showData?.currentValue) {
            this.redraw();
        }
    }
}
