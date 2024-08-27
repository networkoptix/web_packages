import { ElementRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { chartCartesian } from '@d3fc/d3fc-chart';
import * as d3 from 'd3';
import { D3ZoomEvent, ScaleTime } from 'd3';
import * as fc from 'd3fc';
import { animationFrameScheduler, interval, map, shareReplay } from 'rxjs';

import { TimelineButtonAction } from '@components/nx-webgl-canvas/button/button.component.types';
import { SCROLL_DIRECTION } from '@components/nx-webgl-canvas/scroll/scroll.types';
import { NxWebGLService } from '@components/nx-webgl-canvas/services/webgl.service';
import { CHUNK_TYPE, DATA } from '@components/nx-webgl-canvas/webgl-canvas.types';
import { nxConfig } from '@services/nx-config/config';
import { NxSystemCamera } from '@services/system.service/camera-manager/camera-manager-types';

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

/**
 * Timeline rendering specific logic.
 */
export class RenderStateModel {
    protected elementRef = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

    // Public API: Properties
    public canvasVirtualWidth: number;
    public lastMinuteWidth: number;
    public timelineUpdateEnabled = true;

    public timelineActionsEnabled$$ = signal<boolean>(false);
    public timelineAxisEnabled$$ = signal<boolean>(true);
    public scrollBarWidth$$ = signal<number>(0);
    public scrollBarPos$$ = signal<number>(0);

    public scaleUpdateInProcess: boolean = false;

    public timeFrameInS: number;
    public start: number;
    public nowMs: number;
    public end: number;

    public xPos: number = 0;

    // Public API: Action Handlers
    public toggleTimelineActionsEnabled(enabled: boolean): void {
        this.timelineActionsEnabled$$.set(enabled);
    }

    public toggleTimelineAxisEnabled(enabled: boolean): void {
        this.timelineAxisEnabled$$.set(enabled);
    }

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

    // public singleScroll(direction: SCROLL_DIRECTION): void {
    //     if (this.canvas) {
    //         this.canvas.transition().call(this.zoom.transform, this.transform(direction));
    //     }
    //     if (this.canvasAll) {
    //         this.canvasAll.transition().call(this.zoom.transform, this.transform(direction));
    //     }
    // }

    public scrollByBarToPos(params: { direction: SCROLL_DIRECTION; position: number }): void {
        const doTransform = (): void => {
            const t = d3.zoomIdentity
                .translate(this.xPos, 0)
                .scale(this.webglService.levelZoom$$());

            this.canvas.call(this.zoom.transform, t);
            this.canvasAll?.call(this.zoom.transform, t);
        };

        this.scrollInProcessByBar = true;

        if (this.xPos <= 0) {
            this.xPos = -params.position * this.webglService.levelZoom$$();
        } else {
            this.xPos = 0;
        }

        doTransform();
    }

    public scrollByBarEnd(): void {
        this.scrollInProcessByBar = false;
        this.scaleUpdateInProcess = false;

        this.scrollBarPos$$.update(pos => {
            return Math.trunc(-this.xPos / this.webglService.levelZoom$$());
        });
    }

    // public constantScroll(params: { direction: SCROLL_DIRECTION; action: string }): void {
    //     this.constantScroll$$.set(params);
    // }

    /**
     * Private properties exposed for debugging purposes. Do not depend on these in application code.
     */
    public readonly debugInfo = ((renderStateModel: RenderStateModel) =>
        ({
            get overallDays(): number {
                return renderStateModel.overallDays;
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
            get playbackTime() {
                return renderStateModel.playbackTime;
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

    private container: HTMLDivElement | undefined;

    protected playbackTime: number | undefined;

    private zoomEvent: D3ZoomEvent<never, never>;
    private xScaleOriginal: ScaleTime<number, number>;
    private xScale: ScaleTime<number, number>;
    private xAxisMajor: typeof fc.axisBottom;
    private nxXAxisMajor: typeof fc.axisBottom;
    private xAxisMinor: typeof fc.axisTop;
    private nxXAxisMinor: typeof fc.axisTop;

    private scrollInProcessByBar: boolean = false;
    private scrollInProcessByDrag: boolean = false;

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

    private animationFrame$ = interval(0, animationFrameScheduler).pipe(
        shareReplay({ refCount: false, bufferSize: 1 }),
    );

    private updateOnAnimationNotifier$$ = toSignal(
        this.animationFrame$.pipe(
            map(count => (!this.xScaleOriginal || !this.zoomEvent || !count ? 0 : count)),
            shareReplay({ refCount: false, bufferSize: 1 }),
        ),
    );

    protected renderEffect = effect(() => {
        if (this.updateOnAnimationNotifier$$()) {
            untracked(() => this.update());
        }
    });

    chartVisible$$ = signal(undefined);
    axisMajorVisible$$ = signal(undefined);
    axisMinorVisible$$ = signal(undefined);

    protected canvasInitEffect = effect(() => {
        if (this.chartVisible$$() && this.cameraIds$$().length) {
            untracked(() => {
                this.container = this.chartVisible$$() as unknown as HTMLDivElement;
                this.initContainer();
                this.initStartEndTime();
                this.initXscale();
                this.initZoom();
                // ****************************
                this.webglService.updateTimelineRange();
                this.render();
                // this.redraw(mainCameraData, allCamerasData);
            });
        }
    });

    // protected currentTimeSyncEffect = effect(
    //     () => {
    //         const { value: timestamp } = this.webglService.playbackTimeMs$$();
    //         if (timestamp) {
    //             this.playbackTime = timestamp;
    //             this.updatePlaybackPosition();
    //         }
    //     },
    //     { allowSignalWrites: true },
    // );

    // Initialization

    private initContainer(): void {
        if (this.container) {
            this.webglService.canvasWidth$.next(this.container.clientWidth);
            this.webglService.canvasHeight$.next(this.container.clientHeight);
            this.webglService.canvasRect$.next(this.container.getBoundingClientRect());

            this.scrollBarWidth$$.update(width => this.container?.clientWidth || 0);
        }
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
                // console.log('=>', Math.max(1, xScale(d.x + d.width) - xScale(d.x)));
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
                            // case CHUNK_TYPE.IN_PROGRESS:
                            //     if (nxConfig.isDarkTheme) {
                            //         return [41 / 255, 130 / 255, 23 / 255, 1]; // setting green_d2 here
                            //     }
                            //     return [76 / 255, 188 / 255, 40 / 255, 1];
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
        this.webglService.levelZoom$$.set(1);
        this.xScale = d3
            .scaleTime()
            .domain([this.start, this.nowMs])
            .range([0, this.container?.clientWidth || 0]);

        // TODO: test var  *********************** REMOVE
        this.overallDays = d3.timeDays(this.xScale.domain()[0], this.xScale.domain()[1]).length;
        // ***************************************
        this.xScaleOriginal = this.xScale.copy();
        this.webglService.xScale$$.set(this.xScale);
    }

    private initStartEndTime(): void {
        this.end = Date.now();
        this.start = this.modelState$$().allCamerasData[0]?.realTimeMs || 0;
        this.nowMs = Date.now();
        this.timeFrameInS = Math.ceil((this.nowMs - this.start) / 1000 / 60);
    }

    private render = (): void => {
        const { cameras, mainCameraData, allCamerasData } = this.modelState$$();

        if (!mainCameraData) {
            return;
        }

        if (!mainCameraData.length) {
            this.webglService.playbackTimeMs$$.set(undefined);
            this.webglService.playbackPosition$$.set(undefined);
        }

        const lastTimestamp = this.webglService.lastTimestamp$$();

        if (this.webglService.persistCurrentTimeStamp$$() && lastTimestamp && lastTimestamp > 0) {
            const lastTimestampMs = lastTimestamp / 1000;
            const chunkFoundAt = this.webglService.chunkSearch(mainCameraData, lastTimestampMs);

            if (chunkFoundAt) {
                const position = this.xScale(new Date(lastTimestampMs));
                this.webglService.playbackTimeMs$$.set(lastTimestampMs);
                this.webglService.playbackPosition$$.set(position);
            } else {
                this.webglService.playbackTimeMs$$.set(undefined);
                this.webglService.playbackPosition$$.set(undefined);
            }
        } else {
            this.webglService.playbackTimeMs$$.set(undefined);
            this.webglService.playbackPosition$$.set(undefined);
        }

        if (cameras.length > 1) {
            const barSeriesAll = this.initBars(allCamerasData, this.xScale, d3.scaleLinear());
            this.chartAll = chartCartesian(this.xScale, d3.scaleLinear())
                .webglPlotArea(barSeriesAll)
                .xDomain(this.xScale.domain())
                .decorate(context =>
                    context.enter().select('d3fc-canvas.webgl-plot-area').call(this.zoom),
                );
        }

        const barSeries = this.initBars(mainCameraData, this.xScale, d3.scaleLinear());
        this.webglService.currentPointer$$.set(undefined);
        // this.webglService.playbackPosition$$.set(undefined);
        // this.webglService.playbackTimeMs$$.set(undefined);

        this.chart = chartCartesian(this.xScale, d3.scaleLinear())
            .webglPlotArea(barSeries)
            .xDomain(this.xScale.domain())
            .decorate(context =>
                context
                    .enter()
                    .select('d3fc-canvas.webgl-plot-area')
                    // .on('mouseup', () => {
                    //     doe not trigger
                    // })
                    .on('mousedown', () => {
                        // debugger;
                    })
                    .on('mousemove', (event: MouseEvent) => {
                        this.webglService.currentPointer$$.update(() => event.offsetX);
                    })
                    .on('mouseleave', () => {
                        this.webglService.currentPointer$$.update(() => undefined);
                    })
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
                        const { mainCameraData } = this.modelState$$();
                        if (!mainCameraData?.length) {
                            this.webglService.playbackTimeMs$$.set(undefined);
                            this.webglService.playbackPosition$$.set(undefined);
                        } else if (!this.scaleUpdateInProcess && this.timelineUpdateEnabled) {
                            const desiredTimeMs = this.webglService
                                .xScale$$()
                                .invert(event.offsetX)
                                .getTime();

                            const chunkFoundAt = this.webglService.chunkSearch(
                                mainCameraData,
                                desiredTimeMs,
                            );

                            this.webglService.playbackTimeMs$$.set(chunkFoundAt);
                            this.webglService.playbackPosition$$.set(
                                chunkFoundAt && this.xScale(chunkFoundAt),
                            );

                            return !!chunkFoundAt;
                        }
                    })
                    .call(this.zoom),
            );
        this.redraw(mainCameraData, cameras, allCamerasData);
    };

    private redraw(
        mainCameraData: DATA[],
        cameras: NxSystemCamera[],
        allCamerasData: DATA[],
    ): void {
        // some failsafe code
        if (!mainCameraData || !this.xScale) {
            return;
        } else if (!this.chart) {
            this.render();
            return;
        }

        // TODO: add functionality to filter out bookmarks, analytics and records
        // i.e. d.type === CHUNK_TYPE.BOOKMARK && this.showBookmarks$$()
        // const displayMainData = mainCameraData.filter(
        //     d =>
        //             d.type === CHUNK_TYPE.BOOKMARK ||
        //             d.type === CHUNK_TYPE.ANALYTICS ||
        //             d.type === CHUNK_TYPE.RECORDS
        // );
        //
        // const displayAllData = allCamerasData.filter(
        //     d =>
        //         !(
        //             d.type === CHUNK_TYPE.BOOKMARK ||
        //             d.type === CHUNK_TYPE.ANALYTICS ||
        //             d.type === CHUNK_TYPE.RECORDS
        //         ),
        // );
        //
        // if DATA was filtered by type, we need to re-render
        // if (CONDITION) {
        //     this.render();
        //     return;
        // }

        this.chart.xDomain(this.xScale.domain());
        this.canvas = d3.select('#chart').datum(mainCameraData).call(this.chart);

        if (cameras.length > 1) {
            this.chartAll.xDomain(this.xScale.domain());
            this.canvasAll = d3.select('#chartAll').datum(allCamerasData).call(this.chartAll);
        }
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
        if (this.axisMajorVisible$$()) {
            if (!this.xScale) {
                return;
            }
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
        }
    });

    initAxisMinorEffect = effect(() => {
        if (this.axisMinorVisible$$()) {
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
        }
    });

    private initZoom(): void {
        // const removeMissingLabel = (): void => {
        //     this.nxXAxisMajor.select('g.missing-year').remove();
        // };

        this.canvasVirtualWidth = this.webglService.canvasWidth$.value;
        this.lastMinuteWidth = 0;

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

        // const checkZoomLevel = (zoom: number): void => {
        //     this.webglService.levelZoom$$.update(()=> zoom);
        //     this.webglService.canZoom$.next({
        //         in: zoom >= 1,
        //         out: zoom > 1,
        //     });
        // };

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
                // eslint-disable-next-line no-console
                console.log('start =>', event.sourceEvent?.type);
                this.scaleUpdateInProcess = true;

                if (event.sourceEvent?.type === 'mousedown') {
                    this.scrollInProcessByDrag = true;
                    checkVisibleArea(0); // disable during mouse drag
                }

                if (this.webglService.playbackPosition$$()) {
                    this.playbackTime = this.xScale
                        .invert(this.webglService.playbackPosition$$() || 0)
                        .getTime();
                }
            })
            .on('zoom', event => {
                // if (
                //     this.zoomEvent &&
                //     event.sourceEvent === null &&
                //     this.zoomEvent.transform.k !== event.transform.k
                // ) {
                //     console.log('on ... shortcut');
                //     // short circuit first event (weird data)
                //     return;
                // }
                if (
                    !['mousemove', 'wheel'].includes(event.sourceEvent?.type) &&
                    Math.abs(event.transform.x - this.xPos) > 300
                ) {
                    return;
                }

                // eslint-disable-next-line no-console
                console.log('on ... ', event.sourceEvent?.type, this.scrollInProcessByDrag);

                this.webglService.currentPointer$$.update(() => undefined);

                this.xPos = Math.trunc(event.transform.x);
                this.zoomEvent = event;

                if (this.webglService.playbackPosition$$()) {
                    this.updatePlaybackPosition();
                }

                if (!this.scrollInProcessByBar) {
                    this.webglService.levelZoom$$.update(() => event.transform.k);
                    this.scrollBarWidth$$.update(width => {
                        return Math.max(
                            Math.trunc(
                                this.webglService.canvasWidth$.value /
                                    this.webglService.levelZoom$$(),
                            ),
                            50,
                        );
                    });
                    this.scrollBarPos$$.update(pos => {
                        return Math.trunc(-this.xPos / this.webglService.levelZoom$$());
                    });

                    if (
                        this.scrollBarPos$$() >
                        this.webglService.canvasWidth$.value - this.scrollBarWidth$$()
                    ) {
                        this.scrollBarPos$$.update(pos => {
                            return this.webglService.canvasWidth$.value - this.scrollBarWidth$$();
                        });
                    }
                }
            })
            .on('end', event => {
                // eslint-disable-next-line no-console
                console.log('end ... ', event.sourceEvent?.type, this.scrollInProcessByDrag);
                if (this.scrollInProcessByBar) {
                    return;
                }

                this.webglService.currentPointer$$.update(() => event.sourceEvent?.offsetX);
                this.scrollInProcessByDrag = false;
                this.scaleUpdateInProcess = false;

                checkVisibleArea(this.zoomEvent?.transform.k || 1);
            });
    }

    private cameraIds$$ = computed(() => this.modelState$$().cameras.map(({ id }) => id));

    protected resetChartEffect = effect(() => {
        this.cameraIds$$();
        this.end = 0;
    });

    private updatePlaybackPosition(): void {
        this.webglService.playbackPosition$$.update(() => this.xScale(this.playbackTime || 0));
    }

    private update(): void {
        this.xScaleOriginal.domain([this.start, this.nowMs]);
        const newScale: ScaleTime<number, number> = this.zoomEvent.transform.rescaleX(
            this.xScaleOriginal,
        );
        this.xScale.domain(newScale.domain());

        this.webglService.xScaleOriginal$.next(this.xScaleOriginal);
        this.webglService.xScale$$.set(this.xScale);
        // Test data ************************
        // this.nowDate = new Date();
        this.nowMs = Date.now();
        this.timeFrameInS = Math.ceil((this.nowMs - this.start) / 1000 / 60);
        // this.nowDateDomain = this.xScale.domain()[1];
        // this.nowDateOrigDomain = this.xScaleOriginal.domain()[1];
        // **********************************

        const periodMinutes = this.xScale.domain()[1].getTime() - this.xScale.domain()[0].getTime();
        const last10minutes =
            this.xScale?.domain()[1].getTime() >= this.nowMs - LAST_MINUTE_LENGTH &&
            periodMinutes < ZOOM_WINDOW_TO_ANIMATE_MS;

        if (this.zoomEvent && (this.scaleUpdateInProcess || last10minutes)) {
            const calcHelpers = (): void => {
                this.canvasVirtualWidth = Math.trunc(
                    this.webglService.canvasWidth$.value * this.webglService.levelZoom$$(),
                );

                this.lastMinuteWidth = Math.trunc(this.canvasVirtualWidth / this.timeFrameInS);
            };
            calcHelpers();

            // this.removeMissingLabel();
            this.nxXAxisMajor.call(this.xAxisMajor.scale(newScale));
            // this.nxXAxisMajor.call(this.xAxisMajor.ticks(this.periodModifier));
            this.nxXAxisMinor.call(this.xAxisMinor.scale(newScale));
            this.nxXAxisMinor.call(this.xAxisMinor);
            this.initAxisFormat();
            this.render();
        }
    }

    constructor(
        private modelState$$: TimelineDataModel['state$$'],
        private webglService: NxWebGLService,
    ) {}

    // Action Handlers Helpers

    // Manual scroll by [scroll] buttons
    // private transform(direction: SCROLL_DIRECTION): d3.ZoomTransform {
    //     let position: number;
    //     switch (direction) {
    //         case SCROLL_DIRECTION.left:
    //             position = this.xPos + SCROLL_FACTOR_PX;
    //             break;
    //         case SCROLL_DIRECTION.constantLeft:
    //             position = this.xPos + CONSTANT_SCROLL_FACTOR_PX;
    //             break;
    //         case SCROLL_DIRECTION.right:
    //             position = this.xPos - SCROLL_FACTOR_PX;
    //             break;
    //         case SCROLL_DIRECTION.beginning:
    //             position = this.xScaleOriginal.range()[0];
    //             break;
    //         case SCROLL_DIRECTION.end:
    //             position = this.xScaleOriginal.range()[1];
    //             break;
    //         default:
    //             position = 0;
    //     }
    //
    //     this.xPos = position;
    //
    //     return d3.zoomIdentity.translate(position, 0).scale(this.webglService.levelZoom$.value);
    // }

    // protected constantScrollEffect = effect(() => {
    //     const params = this.constantScrollNotifier$$();
    //     if (params && params.action === 'start') {
    //         this.constantScroll(this.constantScroll$$());
    //         this.canvas.call(this.zoom.transform, this.transform(params.direction));
    //     }
    // });
    //
    // private constantScroll$$ = signal<{ direction: SCROLL_DIRECTION; action: string }>({
    //     direction: SCROLL_DIRECTION.left,
    //     action: 'stop',
    // });
    //
    // private constantScrollNotifier$$ = toSignal(
    //     toObservable(this.constantScroll$$).pipe(
    //         filter(params => params.action === 'start'),
    //         switchMap(params =>
    //             params.action === 'start'
    //                 ? this.animationFrame$.pipe(
    //                       filter(() => !!this.canvas && !!this.zoom),
    //                       map(time => ({ ...params, time })),
    //                   )
    //                 : NEVER,
    //         ),
    //     ),
    // );
}
