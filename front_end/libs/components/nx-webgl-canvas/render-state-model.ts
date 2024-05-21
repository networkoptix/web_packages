import { ElementRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { chartCartesian } from '@d3fc/d3fc-chart';
import * as d3 from 'd3';
import { D3ZoomEvent, ScaleTime } from 'd3';
import * as fc from 'd3fc';
import {
    animationFrameScheduler,
    filter,
    interval,
    map,
    NEVER,
    shareReplay,
    Subject,
    switchMap,
} from 'rxjs';

import { TimelineButtonAction } from '@components/nx-webgl-canvas/button/button.component.types';
import {
    CONSTANT_SCROLL_FACTOR_PX,
    SCROLL_DIRECTION,
    SCROLL_FACTOR_PX,
} from '@components/nx-webgl-canvas/scroll/scroll.types';
import { NxWebGLService } from '@components/nx-webgl-canvas/services/webgl.service';
import { CHUNK_TYPE, DATA } from '@components/nx-webgl-canvas/webgl-canvas.types';
import { nxConfig } from '@services/nx-config/config';
import { NxSystemCamera } from '@services/system.service/camera-manager/camera-manager-types';

import { AddedNodesObservable } from './added-nodes-observable';
import { TimelineDataModel } from './timeline-data-model';
import {
    formatYear,
    formatMinorMonth,
    formatMonth,
    formatMinorDay,
    formatDay,
    formatMinorMinute,
    formatMinute,
    formatMinorSecond,
    formatSecond,
    formatMinorMillisecond,
    formatMinorHour,
    formatMinorWeek,
    formatMinorYear,
} from './timeline-datatime-format';

// const DAYS7_IN_MS = 604800000;

const ZOOM_WINDOW_TO_ANIMATE_MS = 30 * 60 * 1000;
const LAST_MINUTE_LENGTH = 1.5 * 60 * 1000; // 1.5 minutes

export type CheckIfAdded = (selector: string) => false | HTMLElement;

/**
 * Timeline rendering specific logic.
 */
export class RenderStateModel {
    private webglService = inject(NxWebGLService);
    protected elementRef = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

    // Public API: Properties

    public scrollPlaybackPosition: number | undefined;

    public canvasVirtualWidth: number;
    public lastMinuteWidth: number;

    public scrollBarWidth$$ = signal<number>(0);
    public scrollBarPos$$ = signal<number>(0);

    public zoomInProcess: boolean = false;

    public timeFrameInS: number;
    public start: number;
    public nowMs: number;
    public end: number;

    public xPos: number;

    // Public API: Action Handlers

    public onActions(actionParam: Record<string, unknown>): void {
        const { action, param } = actionParam;
        switch (action) {
            case TimelineButtonAction.actionJumpTo:
                let intervalZoomK: number;

                if (param === 0) {
                    intervalZoomK = 1;
                } else {
                    intervalZoomK = this.overallDays / (actionParam.param as number);
                }
                const virtualWidth = Math.trunc(
                    this.webglService.canvasWidth$.value * intervalZoomK,
                );

                this.canvas
                    .transition()
                    .duration(1000)
                    .call(
                        this.zoom.transform,
                        d3.zoomIdentity
                            .translate(this.webglService.canvasWidth$.value - virtualWidth, 0)
                            .scale(intervalZoomK),
                    );
        }
    }

    public singleScroll(direction: SCROLL_DIRECTION): void {
        if (this.canvas) {
            this.canvas.transition().call(this.zoom.transform, this.transform(direction));
        }
        if (this.canvasAll) {
            this.canvasAll.transition().call(this.zoom.transform, this.transform(direction));
        }
    }

    public scrollToPos(params: { direction: SCROLL_DIRECTION; position: number }): void {
        const doTransform = (): void => {
            const t = d3.zoomIdentity
                .translate(this.xPos, 0)
                .scale(this.webglService.levelZoom$.value);

            this.canvas.call(this.zoom.transform, t);
            this.canvasAll?.call(this.zoom.transform, t);
        };

        this.scrollInProcess = true;

        if (this.xPos <= 0) {
            this.xPos = -params.position * this.webglService.levelZoom$.value;
        } else {
            this.xPos = 0;
        }

        doTransform();
    }

    public scrollEnd(): void {
        this.scrollInProcess = false;
        this.zoomInProcess = false;

        this.scrollBarPos$$.update(pos => {
            return Math.trunc(-this.xPos / this.webglService.levelZoom$.value);
        });
    }

    public constantScroll(params: { direction: SCROLL_DIRECTION; action: string }): void {
        this.constantScroll$$.set(params);
    }

    public mouseMoveHandler(event: MouseEvent): void {
        if (event.offsetY > 5) {
            // avoid triggering at bottom scroll area
            this.timeLabelPosition = event.offsetX;
        }
    }

    public mouseLeaveHandler(): void {
        this.timeLabelPosition = undefined;
    }

    /**
     * Private properties exposed for debugging purposes. Do not depend on these in application code.
     */
    public readonly debugInfo = ((renderStateModel: RenderStateModel) =>
        ({
            get overallDays(): number {
                return renderStateModel.overallDays;
            },
            get timeLabelPosition(): number | undefined {
                return renderStateModel.timeLabelPosition;
            },
            get playbackLabelPosition(): number | undefined {
                return renderStateModel.playbackLabelPosition;
            },
            get xScale() {
                return renderStateModel.xScale;
            },
            get lastDataDateEnd() {
                return renderStateModel.lastDataDateEnd;
            },
            get lastDataDateStart() {
                return renderStateModel.lastDataDateStart;
            },
            get playbackPointer() {
                return renderStateModel.playbackPointer;
            },
        }) as const)(this);

    // INTERNAL

    private overallDays: number;
    private chart: ReturnType<
        typeof chartCartesian<
            d3.ScaleTime<number, number, never>,
            d3.ScaleLinear<number, number, never>
        >
    >;
    private chartAll: ReturnType<
        typeof chartCartesian<
            d3.ScaleTime<number, number, never>,
            d3.ScaleLinear<number, number, never>
        >
    >;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private zoom: d3.ZoomBehavior<any, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private canvas: d3.Selection<d3.BaseType, DATA[], HTMLElement, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private canvasAll: d3.Selection<d3.BaseType, DATA[], HTMLElement, any>;

    private container: HTMLDivElement | null;

    protected timeLabelPosition: number | undefined;
    protected playbackLabelPosition: number | undefined;

    private zoomEvent: D3ZoomEvent<never, never>;
    private xScaleOriginal: ScaleTime<number, number>;
    private xScale: ScaleTime<number, number>;
    private scrollInProcess: boolean = false;
    private xAxisMajor: typeof fc.axisBottom;
    private nxXAxisMajor: typeof fc.axisBottom;
    private xAxisMinor: typeof fc.axisTop;
    private nxXAxisMinor: typeof fc.axisTop;

    // Test data *********************
    // nowDate: Date;
    // nowDateDomain: Date;
    // nowDateOrigDomain: Date;
    // newDataDateStart: Date;
    private lastDataDateStart: Date;
    private lastDataDateEnd: Date;
    // *******************************

    // tickBreakpointMajor: number = TICK_BREAKPOINTS.lowMAJOR;
    // tickBreakpointMinor: number = TICK_BREAKPOINTS.lowMINOR;

    private periodModifier: d3.CountableTimeInterval;
    private periodMinorModifier: d3.TimeInterval | null;
    private formatTime: (Date) => string;
    protected formatMinorTime: (Date) => string;

    private playbackPointer: Date;

    private animationFrame$ = interval(0, animationFrameScheduler).pipe(
        shareReplay({ refCount: false, bufferSize: 1 }),
    );

    // Dom node added notifiers

    addedNodes$ = new AddedNodesObservable(this.elementRef);

    private chartVisibleNotifier$$ = this.addedNodes$.getNotifierSignal('#chart', element => {
        this.container = element as HTMLDivElement;
        this.initContainer();
    });
    // private chartAllVisibleNotifier$$ = this.addedNodes$.getNotifierSignal('#chartAll');
    private axisMajorVisibleNotifier$$ = this.addedNodes$.getNotifierSignal('#nx-x-axis-major');
    private axisMinorVisibleNotifier$$ = this.addedNodes$.getNotifierSignal('#nx-x-axis-minor');

    private initChart$: Subject<number> = new Subject();

    protected canvasInitEffect = effect(
        () => {
            if (!this.chartVisibleNotifier$$()) {
                return;
            }

            const { cameras, mainCameraData, allCamerasData } = this.modelState$$();

            untracked(() => {
                this.initXscale();
                this.initZoom();
                // ****************************
                this.webglService.updateTimelineRange();
                this.initMainCameraChart(mainCameraData);
                this.initAllCamerasChart(cameras, allCamerasData);
                this.redraw(mainCameraData, allCamerasData);
            });
        },
        { allowSignalWrites: true },
    );

    // Initialization
    private initChart(): void {
        this.initStartEndTime();
        this.initChart$.next(Date.now());
    }

    private initContainer(): void {
        this.webglService.canvasWidth$.next(this.container.clientWidth);
        this.webglService.canvasHeight$.next(this.container.clientHeight);
        this.webglService.canvasRect$.next(this.container.getBoundingClientRect());

        this.scrollBarWidth$$.update(width => this.container.clientWidth);
    }

    private initBars(
        data: Array<DATA>,
        xScale: d3.ScaleTime<number, number, never>,
        yScale: d3.ScaleLinear<number, number, never>,
    ): never {
        return fc
            .seriesWebglBar(data)
            .equals((previousData, currentData) => previousData === currentData)
            .xScale(xScale)
            .yScale(yScale)
            .crossValue(d => d.x + (xScale(d.x + d.width) - xScale(d.x)) / 2)
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
                                return [1, 0, 0, 0.5];
                            case CHUNK_TYPE.ANALYTICS:
                                return [0, 0, 1, 0.5];
                            case CHUNK_TYPE.IN_PROGRESS:
                                if (nxConfig.isDarkTheme) {
                                    return [41 / 255, 130 / 255, 23 / 255, 1]; // setting green_d2 here
                                }
                                return [76 / 255, 188 / 255, 40 / 255, 1];
                            default:
                                // [r / 255, g / 255, b / 255, opacity]
                                if (nxConfig.isDarkTheme) {
                                    return [41 / 255, 130 / 255, 23 / 255, 1]; // setting green_d2 here
                                }
                                return [76 / 255, 188 / 255, 40 / 255, 1]; // setting green_l2 here
                        }
                    })(context);
            }) as never;
    }

    private initXscale(): void {
        this.xScale = d3
            .scaleTime()
            .domain([this.start, this.nowMs])
            .range([0, this.container.clientWidth]);

        // TODO: test var  *********************** REMOVE
        this.overallDays = d3.timeDays(this.xScale.domain()[0], this.xScale.domain()[1]).length;
        // ***************************************
        this.xScaleOriginal = this.xScale.copy();
        this.webglService.xScale$.next(this.xScale);
    }

    private initStartEndTime(): void {
        const [_mainCameraData, allCamerasData] = this.getRedrawParams();
        this.end = Date.now();
        this.start = allCamerasData[0]?.x || 0;
        this.nowMs = Date.now();
        this.timeFrameInS = Math.ceil((this.nowMs - this.start) / 1000);
    }

    private initAllCamerasChart = (cameras: NxSystemCamera[], allCamerasData: DATA[]): void => {
        if (cameras.length > 1) {
            const barSeriesAll = this.initBars(allCamerasData, this.xScale, d3.scaleLinear());
            this.chartAll = chartCartesian(this.xScale, d3.scaleLinear())
                .webglPlotArea(barSeriesAll)
                .xDomain(this.xScale.domain())
                .decorate(context =>
                    context.enter().select('d3fc-canvas.webgl-plot-area').call(this.zoom),
                );
        }
    };

    private initMainCameraChart = (mainCameraData: DATA[]): void => {
        const barSeries = this.initBars(mainCameraData, this.xScale, d3.scaleLinear());

        this.chart = chartCartesian(this.xScale, d3.scaleLinear())
            .webglPlotArea(barSeries)
            .xDomain(this.xScale.domain())
            .decorate(context =>
                context
                    .enter()
                    .select('d3fc-canvas.webgl-plot-area')
                    .on('measure', event => {
                        if (
                            this.webglService.canvasWidth$.value ===
                            event.detail.width / event.detail.pixelRatio
                        ) {
                            return;
                        }

                        this.webglService.canvasWidth$.next(
                            event.detail.width / event.detail.pixelRatio,
                        );
                        this.webglService.canvasHeight$.next(
                            event.detail.height / event.detail.pixelRatio,
                        );
                        this.webglService.canvasRect$.next(event.target.getBoundingClientRect());

                        this.scrollBarWidth$$.update(
                            width => event.detail.width / event.detail.pixelRatio,
                        );
                        this.xScaleOriginal.range([0, this.webglService.canvasWidth$.value]);
                        this.initXscale();
                        this.initZoom();
                    })
                    .on('click', event => {
                        if (!this.zoomInProcess) {
                            const currentTime = this.webglService.currentPointer$.value.getTime();

                            const currentChuck = this.webglService.chunkSearch(
                                mainCameraData,
                                currentTime,
                            );

                            if (typeof currentChuck === 'boolean') {
                                // on chunk
                                this.playbackPointer = this.webglService.currentPointer$.value;
                                this.playbackLabelPosition = event.offsetX;
                                this.scrollPlaybackPosition = this.xScaleOriginal(
                                    this.webglService.currentPointer$.value,
                                );
                                return true;
                            } else if (typeof currentChuck === 'number') {
                                // next chunk
                                this.playbackPointer = new Date(currentChuck);
                                this.playbackLabelPosition = this.xScale(currentChuck);
                                this.scrollPlaybackPosition = this.xScaleOriginal(currentChuck);
                                return true;
                            } else {
                                this.playbackLabelPosition = undefined;
                                this.scrollPlaybackPosition = undefined;
                                return false;
                            }
                        }
                    })
                    .call(this.zoom),
            );
    };

    private redraw(currentCameraData: DATA[], allCamerasData: DATA[]): void {
        this.chart.xDomain(this.xScale.domain());
        this.chartAll.xDomain(this.xScale.domain());

        this.canvas = d3
            .select('#chart')
            .datum(currentCameraData) // sampleData as datum kills chunks width
            .call(this.chart);

        this.canvasAll = d3
            .select('#chartAll')
            .datum(allCamerasData) // sampleData as datum kills chunks width
            .call(this.chartAll);
    }

    private initAxisFormat(): void {
        const periodYears = d3.timeYears(this.xScale.domain()[0], this.xScale.domain()[1]).length;
        const periodMonths = d3.timeMonths(this.xScale.domain()[0], this.xScale.domain()[1]).length;
        const periodDays = d3.timeDays(this.xScale.domain()[0], this.xScale.domain()[1]).length;

        if (periodYears > 0 && periodMonths > 3) {
            this.periodModifier = d3.timeYear;
            this.formatTime = formatYear;
            this.periodMinorModifier = d3.timeMonth;
            this.formatMinorTime = formatMinorMonth;
        } else {
            if (periodMonths < 7 && periodMonths > 0) {
                this.periodModifier = d3.timeMonth;
                this.formatTime = formatMonth;
                this.periodMinorModifier = d3.timeDay.every(6);
                this.formatMinorTime = formatMinorDay;
            } else if (periodMonths === 0) {
                if (periodDays < 7 && periodDays > 0) {
                    this.periodModifier = d3.timeDay;
                    this.formatTime = formatDay;
                    this.periodMinorModifier = d3.timeMinute;
                    this.formatMinorTime = formatMinorMinute;
                } else if (this.overallDays === 0) {
                    const periodMinutes = d3.timeMinutes(
                        this.xScale.domain()[0],
                        this.xScale.domain()[1],
                    ).length;
                    if (periodMinutes < 7 && periodMinutes > 0) {
                        this.periodModifier = d3.timeMinute;
                        this.formatTime = formatMinute;
                        this.periodMinorModifier = d3.timeSecond;
                        this.formatMinorTime = formatMinorSecond;
                    } else if (periodMinutes === 0) {
                        const periodSeconds = d3.timeSeconds(
                            this.xScale.domain()[0],
                            this.xScale.domain()[1],
                        ).length;
                        if (periodSeconds < 7) {
                            this.periodModifier = d3.timeSecond;
                            this.formatTime = formatSecond;
                            this.periodMinorModifier = d3.timeMillisecond;
                            this.formatMinorTime = formatMinorMillisecond;
                        } else {
                            this.periodModifier = d3.timeMinute;
                            this.formatTime = formatMinute;
                            this.periodMinorModifier = d3.timeSecond;
                            this.formatMinorTime = formatMinorSecond;
                        }
                    } else {
                        this.periodModifier = d3.timeDay;
                        this.formatTime = formatDay;
                        this.periodMinorModifier = d3.timeMinute;
                        this.formatMinorTime = formatMinorMinute;
                    }
                } else {
                    this.periodModifier = d3.timeMonth;
                    this.formatTime = formatMonth;
                    this.periodMinorModifier = d3.timeDay;
                    this.formatMinorTime = formatMinorDay;
                }
            } else {
                this.periodModifier = d3.timeYear;
                this.formatTime = formatYear;
                this.periodMinorModifier = d3.timeMonth;
                this.formatMinorTime = formatMinorMonth;
            }
        }

        if (this.xAxisMajor) {
            this.xAxisMajor.tickFormat(this.formatTime);
            this.nxXAxisMajor.call(this.xAxisMajor.ticks(this.periodModifier));
            // this.addMissingLabel();
        }

        if (this.nxXAxisMinor) {
            // this.xAxisCustomTicksFontSize();
        }
    }

    initAxisMajorEffect = effect(() => {
        this.axisMajorVisibleNotifier$$();
        this.xAxisMajor = fc.axisBottom(this.xScale).tickSize(26);

        this.nxXAxisMajor = d3
            .select('#nx-x-axis-major')
            .append('d3fc-svg')
            .attr('class', 'x-axis nx-x-axis-major')
            .select('svg')
            .append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0, 0)')
            .call(this.xAxisMajor.ticks(this.periodMinorModifier));

        this.initAxisFormat();
    });

    initAxisMinorEffect = effect(() => {
        this.axisMinorVisibleNotifier$$();
        const initAxisMinorFormat = (date: Date): string => {
            // Define filter conditions
            return (
                d3.timeSecond(date) < date
                    ? formatMinorMillisecond
                    : d3.timeMinute(date) < date
                      ? formatMinorSecond
                      : d3.timeHour(date) < date
                        ? formatMinorMinute
                        : d3.timeDay(date) < date
                          ? formatMinorHour
                          : d3.timeMonth(date) < date
                            ? d3.timeWeek(date) < date
                                ? formatMinorDay
                                : formatMinorWeek
                            : d3.timeYear(date) < date
                              ? formatMinorMonth
                              : formatMinorYear
            )(date);
        };
        this.xAxisMinor = fc
            .axisOrdinalBottom(this.xScale)
            .ticks(15)
            .tickSize(26)
            // .decorate(s => s.enter().select('text').style('transform', 'translate(25px, 10px)'));
            .tickFormat(d => initAxisMinorFormat(d)); // xAxisMinorTicks(d));

        this.nxXAxisMinor = d3
            .select('#nx-x-axis-minor')
            .append('d3fc-svg')
            .attr('class', 'x-axis nx-x-axis-minor')
            .select('svg')
            .append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0, 0)')
            .call(this.xAxisMinor);
    });

    private initZoom(): void {
        // const removeMissingLabel = (): void => {
        //     this.nxXAxisMajor.select('g.missing-year').remove();
        // };
        const checkVisibleArea = (zoom: number): void => {
            this.webglService.canScroll$.next({
                left:
                    zoom > 1 &&
                    this.xScaleOriginal.domain()[0].getTime() < this.xScale.domain()[0].getTime(),
                right:
                    zoom > 1 &&
                    this.xScaleOriginal.domain()[1].getTime() > this.xScale.domain()[1].getTime(),
            });
        };

        const checkZoomLevel = (zoom: number): void => {
            this.webglService.levelZoom$.next(zoom);
            this.webglService.canZoom$.next({
                in: zoom >= 1,
                out: zoom > 1,
            });
        };

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
                this.timeLabelPosition = undefined;

                if (event.sourceEvent?.type === 'mousedown') {
                    checkVisibleArea(0); // disable during mouse drag
                }
            })
            .on('zoom', event => {
                // if (
                //     this.zoomEvent &&
                //     event.sourceEvent === null &&
                //     this.zoomEvent.transform.k !== event.transform.k
                // ) {
                //     // short circuit first event (weird data)
                //     return;
                // }
                if (
                    !['mousemove', 'wheel'].includes(event.sourceEvent?.type) &&
                    Math.abs(event.transform.x - this.xPos) > 300
                ) {
                    return;
                }

                this.xPos = Math.trunc(event.transform.x);
                this.zoomEvent = event;

                // if (!this.scrollInProcess) {
                checkZoomLevel(event.transform.k);
                this.scrollBarWidth$$.update(width => {
                    return Math.max(
                        Math.trunc(
                            this.webglService.canvasWidth$.value /
                                this.webglService.levelZoom$.value,
                        ),
                        50,
                    );
                });
                this.scrollBarPos$$.update(pos => {
                    return Math.trunc(-this.xPos / this.webglService.levelZoom$.value);
                });

                if (
                    this.scrollBarPos$$() >
                    this.webglService.canvasWidth$.value - this.scrollBarWidth$$()
                ) {
                    this.scrollBarPos$$.update(pos => {
                        return this.webglService.canvasWidth$.value - this.scrollBarWidth$$();
                    });
                }
                // }
            })
            .on('end', event => {
                if (this.scrollInProcess) {
                    return;
                }
                this.zoomInProcess = false;
                checkVisibleArea(this.zoomEvent.transform.k);
            });
    }

    // Action Handlers Helpers
    private transform(direction: SCROLL_DIRECTION): d3.ZoomTransform {
        let position: number;
        switch (direction) {
            case SCROLL_DIRECTION.left:
                position = this.xPos + SCROLL_FACTOR_PX;
                break;
            case SCROLL_DIRECTION.constantLeft:
                position = this.xPos + CONSTANT_SCROLL_FACTOR_PX;
                break;
            case SCROLL_DIRECTION.right:
                position = this.xPos - SCROLL_FACTOR_PX;
                break;
            case SCROLL_DIRECTION.beginning:
                position = this.xScaleOriginal.range()[0];
                break;
            case SCROLL_DIRECTION.end:
                position = this.xScaleOriginal.range()[1];
                break;
            default:
                position = 0;
        }

        this.xPos = position;

        return d3.zoomIdentity.translate(position, 0).scale(this.webglService.levelZoom$.value);
    }

    protected constantScrollEffect = effect(() => {
        const params = this.constantScrollNotifier$$();
        if (params && params.action === 'start') {
            this.constantScroll(this.constantScroll$$());
            this.canvas.call(this.zoom.transform, this.transform(params.direction));
        }
    });

    private constantScroll$$ = signal<{ direction: SCROLL_DIRECTION; action: string }>({
        direction: SCROLL_DIRECTION.left,
        action: 'stop',
    });

    private constantScrollNotifier$$ = toSignal(
        toObservable(this.constantScroll$$).pipe(
            filter(params => params.action === 'start'),
            switchMap(params =>
                params.action === 'start'
                    ? this.animationFrame$.pipe(
                          filter(() => !!this.canvas && !!this.zoom),
                          map(time => ({ ...params, time })),
                      )
                    : NEVER,
            ),
        ),
    );

    private zoomRenderNotifier$$ = toSignal(
        this.animationFrame$.pipe(
            map(count => (!this.xScaleOriginal || !this.zoomEvent || !count ? 0 : count)),
            shareReplay({ refCount: false, bufferSize: 1 }),
        ),
    );

    protected zoomRenderEffect = effect(() => {
        if (this.zoomRenderNotifier$$()) {
            this.updateZoom(...this.getRedrawParams());
        }
    });

    protected redrawEffect = effect(
        () => {
            this.getRedrawParams();
            this.initChart();
        },
        { allowSignalWrites: true },
    );

    private cameraIds$$ = computed(() => this.modelState$$().cameras.map(({ id }) => id));

    protected resetChartEffect = effect(() => {
        this.cameraIds$$();
        this.end = 0;
    });

    private updateZoom(...params: Parameters<RenderStateModel['redraw']>): void {
        this.xScaleOriginal.domain([this.start, this.nowMs]);
        const newScale: ScaleTime<number, number> = this.zoomEvent.transform.rescaleX(
            this.xScaleOriginal,
        );
        this.xScale.domain(newScale.domain());

        this.webglService.xScaleOriginal$.next(this.xScaleOriginal);
        this.webglService.xScale$.next(this.xScale);
        // Test data ************************
        // this.nowDate = new Date();
        this.nowMs = Date.now();
        this.timeFrameInS = Math.ceil((this.nowMs - this.start) / 1000);
        // this.nowDateDomain = this.xScale.domain()[1];
        // this.nowDateOrigDomain = this.xScaleOriginal.domain()[1];
        // **********************************

        const periodMinutes = this.xScale.domain()[1].getTime() - this.xScale.domain()[0].getTime();
        const last10minutes =
            this.xScale?.domain()[1].getTime() >= this.nowMs - LAST_MINUTE_LENGTH &&
            periodMinutes < ZOOM_WINDOW_TO_ANIMATE_MS;

        if (this.zoomEvent && (this.zoomInProcess || last10minutes)) {
            const calcHelpers = (): void => {
                this.canvasVirtualWidth = Math.trunc(
                    this.webglService.canvasWidth$.value * this.webglService.levelZoom$.value,
                );

                this.lastMinuteWidth = Math.trunc(
                    (this.canvasVirtualWidth / this.timeFrameInS) * 60,
                );
            };
            calcHelpers();

            // this.removeMissingLabel();
            this.nxXAxisMajor.call(this.xAxisMajor.scale(newScale));
            // this.nxXAxisMajor.call(this.xAxisMajor.ticks(this.periodModifier));
            this.nxXAxisMinor.call(this.xAxisMinor.scale(newScale));
            this.nxXAxisMinor.call(this.xAxisMinor);
            this.initAxisFormat();
            this.redraw(...params);
        }
    }

    private getRedrawParams = (): Parameters<RenderStateModel['redraw']> => {
        const { mainCameraData, allCamerasData } = this.modelState$$();
        return [mainCameraData, allCamerasData];
    };

    constructor(private modelState$$: TimelineDataModel['state$$']) {}
}
