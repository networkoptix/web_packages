import {
    AfterViewInit,
    Component,
    inject,
    Input,
    OnChanges,
    signal,
    ViewEncapsulation,
} from '@angular/core';
import { chartCartesian } from '@d3fc/d3fc-chart';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import * as d3 from 'd3';
import { D3ZoomEvent, ScaleTime } from 'd3';
import * as fc from 'd3fc';
import { animationFrameScheduler, interval, Subject, takeUntil, timer } from 'rxjs';

import { nxConfig } from '@services/nx-config/config';
import { Layout } from '@services/system-api.types/layouts.types';
import {
    NxSystemCamera,
    TimeDetail,
} from '@services/system.service/camera-manager/camera-manager-types';
import { NxSystem } from '@services/system.service/system';
import { cleanId } from '@utils/general';
import { NgChanges } from '@utils/ng-changes';
import {
    ACTIONS,
    MODE,
} from '@vms-client/submodules/timeline/components/nx-webgl-canvas/actions/timeline-actions.types';
import {
    CONSTANT_SCROLL_FACTOR_PX,
    SCROLL_DIRECTION,
    SCROLL_FACTOR_PX,
} from '@vms-client/submodules/timeline/components/nx-webgl-canvas/scroll/scroll.types';
import { NxWebGLService } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/services/webgl.service';
import {
    CHUNK_TYPE,
    DATA,
    RECORD_DATA,
    TICK_BREAKPOINTS,
} from '@vms-client/submodules/timeline/components/nx-webgl-canvas/webgl-canvas.types';
// import {
//     CONSTANT_ZOOM_FACTOR,
//     FORCE_ZOOM_FACTOR,
//     ZOOM_DIRECTION,
//     ZOOM_DURATION,
//     ZOOM_FACTOR,
// } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/zoom/zoom.types';

const ZOOM_WINDOW_TO_ANIMATE_MS = 30 * 60 * 1000;
const LAST_MINUTE_LENGTH = 1.5 * 60 * 1000; // 1.5 minutes
const TEN_SEC_IN_MS = 10 * 1000;

@UntilDestroy()
@Component({
    selector: 'nx-webgl-canvas',
    templateUrl: 'webgl-canvas.component.html',
    styleUrls: ['webgl-canvas.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class NxWebGLCanvasComponent implements AfterViewInit, OnChanges {
    @Input() selectedCameraId: string;
    @Input() system: NxSystem;
    @Input() cameras: string[];
    @Input() selectedLayout: Layout;

    @Input() showData: Record<string, boolean> = {
        records: true,
        bookmarks: true,
        analytics: true,
    };

    protected readonly Math = Math;

    destroy$ = new Subject<boolean>();
    canvasRendered$ = new Subject<boolean>();
    selectedCamera: NxSystemCamera | undefined;

    initialData: Array<Record<string, string>>;
    pushData: Array<Record<string, string>>;
    bookmarksData: Array<Record<string, string>>;
    analyticsData: Array<Record<string, string>>;
    end: number;

    // eslint-disable-next-line nx/no-untyped-init
    chart;
    // eslint-disable-next-line nx/no-untyped-init
    chartAll;
    // eslint-disable-next-line nx/no-untyped-init
    zoom;
    data$$ = signal<DATA[]>([]);
    dataAllCameras$$ = signal<DATA[]>([]);
    dataSet: number;
    dataAllSet: number;
    // eslint-disable-next-line nx/no-untyped-init
    canvas;
    // eslint-disable-next-line nx/no-untyped-init
    canvasAll;

    wrapperScroll: d3.Selection<never, never, HTMLElement, never>;
    container: HTMLDivElement;
    barSeries: never;
    barSeriesAll: never;
    timeFrameInS: number;
    start: number;
    nowMs: number;

    zoomEvent: D3ZoomEvent<never, never>;
    zoomEventOriginal: D3ZoomEvent<never, never>;

    playbackPointer: Date;

    xScaleOriginal: ScaleTime<number, number>;
    xScale: ScaleTime<number, number>;
    chunk: boolean;
    zoomInProcess: boolean = false;
    scrollInProcess: boolean = false;
    xAxisMajor: typeof fc.axisBottom;
    nxXAxisMajor: typeof fc.axisBottom;
    xAxisMinor: typeof fc.axisTop;
    nxXAxisMinor: typeof fc.axisTop;

    tickBreakpointMajor: number = TICK_BREAKPOINTS.lowMAJOR;
    tickBreakpointMinor: number = TICK_BREAKPOINTS.lowMINOR;

    periodModifier: d3.CountableTimeInterval;
    periodMinorModifier: d3.TimeInterval | null;
    formatTime: (Date) => string;
    formatMinorTime: (Date) => string;
    periodWidth: number = 0;

    xPos: number;

    scrollBarWidth$$ = signal<number>(0);
    scrollBarPos$$ = signal<number>(0);
    cancelScroll$ = new Subject<boolean>();
    cancelZoom$ = new Subject<boolean>();

    timeLabelPosition: number | undefined;
    playbackLabelPosition: number | undefined;
    scrollPlaybackPosition: number | undefined;

    // xAxisMinor labels format?
    // Establish the desired formatting options using locale.format():
    // https://github.com/d3/d3-time-format/blob/master/README.md#locale_format
    formatMinorMillisecond = d3.timeFormat('%Lms');
    formatMinorSecond = d3.timeFormat('%Ss');
    formatMinorMinute = d3.timeFormat('%I:%M');
    formatMinorHour = d3.timeFormat('%I %p');
    formatMinorDay = d3.timeFormat('%a %d');
    formatMinorWeek = d3.timeFormat('%b %d');
    formatMinorMonth = d3.timeFormat('%b');
    formatMinorYear = d3.timeFormat('%Y');

    formatYear = d3.timeFormat('%Y');
    formatMonth = d3.timeFormat('%B %Y');
    formatDay = d3.timeFormat('%d %B %Y');
    formatMinute = d3.timeFormat('%d %B %Y %I:%M');
    formatSecond = d3.timeFormat('%d %B %Y %I:%M:%S');

    canvasVirtualWidth: number;
    lastMinuteWidth: number;

    // default actions if timeline actions component is not used -- TT
    timelineActions: ACTIONS = {
        mode: MODE.DRAG,
    };

    // Test data *********************
    nowDate: Date;
    nowDateDomain: Date;
    nowDateOrigDomain: Date;
    newDataDateStart: Date;
    lastDataDateStart: Date;
    lastDataDateEnd: Date;
    // *******************************

    public webglService = inject(NxWebGLService);

    // check if new chunk starting time is within previous chunk duration
    private checkChunkInProgress(newChunk: DATA): DATA {
        if (newChunk.type === CHUNK_TYPE.IN_PROGRESS) {
            this.newDataDateStart = new Date(newChunk.x);

            let lastData: DATA | undefined;
            this.data$$.update(data => {
                lastData = data.pop();
                return data;
            });

            // test data ***********************
            if (lastData) {
                this.lastDataDateStart = new Date(lastData.realTimeMs);
                this.lastDataDateEnd = new Date(lastData.realTimeMs + lastData.width);
            } else {
                this.lastDataDateStart = new Date(newChunk.realTimeMs);
                this.lastDataDateEnd = new Date(newChunk.realTimeMs + newChunk.width);
            }
            // *********************************

            if (lastData && lastData.x + lastData.width > newChunk.x) {
                return {
                    x: lastData.x,
                    y: 30,
                    width: Date.now() - lastData.realTimeMs,
                    realTimeMs: lastData.realTimeMs,
                    type: CHUNK_TYPE.IN_PROGRESS,
                };
            } else {
                // return last record
                if (lastData) {
                    this.data$$.update(data => [
                        ...(data || []),
                        {
                            x: lastData?.x || 0,
                            y: 30,
                            realTimeMs: lastData?.realTimeMs || 0,
                            width: lastData?.width || 0,
                            type: CHUNK_TYPE.RECORDS,
                        },
                    ]);
                }
                // add new chunk in progress
                return newChunk;
            }
        }
        // Throws error if not in progress
        return newChunk;
    }

    private periodToChunk(period: RECORD_DATA, skipChunkInProgres = false): DATA {
        const realTimeMs = +period.startTimeMs;
        const duration = +period.durationMs;
        const durationMs = duration > 1 ? duration : Date.now() - realTimeMs;
        const type = duration > 1 ? CHUNK_TYPE.RECORDS : CHUNK_TYPE.IN_PROGRESS;

        // align bar to start time (otherwise centered)
        const startTimeMs = realTimeMs + Math.trunc(durationMs / 2);

        const newChunk = {
            x: startTimeMs,
            y: 30,
            realTimeMs,
            width: durationMs,
            type,
        };

        if (!skipChunkInProgres && type === CHUNK_TYPE.IN_PROGRESS) {
            return this.checkChunkInProgress(newChunk);
        }

        return newChunk;
    }

    private resetChart(): void {
        this.destroy$.next(true);
        this.data$$.set([]);
        this.dataAllCameras$$.set([]);
        this.end = 0;
    }

    ngOnChanges(changes: NgChanges<NxWebGLCanvasComponent>): void {
        // if (changes.selectedCameraId?.currentValue) {
        //     this.selectedCameraId = changes.selectedCameraId.currentValue;
        //     this.selectedCamera = this.system.cameraManager.cameras.find(
        //         camera => camera.id === this.selectedCameraId,
        //     );
        // }

        if (changes.cameras?.currentValue) {
            this.resetChart();

            if (changes.cameras.currentValue.length) {
                // test data
                this.selectedCameraId = this.cameras[0];
                this.selectedCamera = this.system.cameraManager.cameras.find(
                    camera => camera.id === cleanId(this.selectedCameraId),
                );
                // ****************************

                const camerasInLayout = changes.cameras.currentValue;

                this.getRecords(camerasInLayout);
            }
        }
        // DATA will be fetched here not outside
        // if (changes.pushData?.currentValue?.length) {
        //     this.addData(this.pushData, CHUNK.RECORDS);
        // }
        //
        // if (changes.bookmarksData?.currentValue?.length) {
        //     this.addData(this.bookmarksData, CHUNK.BOOKMARK);
        // }
        //
        // if (changes.analyticsData?.currentValue?.length) {
        //     this.addData(this.analyticsData, CHUNK.ANALYTICS);
        // }

        if (changes.showData?.currentValue) {
            this.redraw();
        }
    }

    ngAfterViewInit(): void {
        interval(0, animationFrameScheduler)
            .pipe(untilDestroyed(this))
            .subscribe(() => {
                if (!this.xScaleOriginal || !this.zoomEvent) {
                    return;
                }

                this.xScaleOriginal.domain([this.start, this.nowMs]);
                const newScale: ScaleTime<number, number> = this.zoomEvent.transform.rescaleX(
                    this.xScaleOriginal,
                );
                this.xScale.domain(newScale.domain());

                this.webglService.xScaleOriginal$.next(this.xScaleOriginal);
                this.webglService.xScale$.next(this.xScale);
                // Test data ************************
                this.nowDate = new Date();
                this.nowMs = Date.now();
                this.timeFrameInS = Math.ceil((this.nowMs - this.start) / 1000);
                this.nowDateDomain = this.xScale.domain()[1];
                this.nowDateOrigDomain = this.xScaleOriginal.domain()[1];
                // **********************************

                const periodMinutes =
                    this.xScale.domain()[1].getTime() - this.xScale.domain()[0].getTime();
                const last10minutes =
                    this.xScale?.domain()[1].getTime() >= this.nowMs - LAST_MINUTE_LENGTH &&
                    periodMinutes < ZOOM_WINDOW_TO_ANIMATE_MS;

                if (this.zoomEvent && (this.zoomInProcess || last10minutes)) {
                    this.calcHelpers();

                    // this.removeMissingLabel();
                    this.nxXAxisMajor.call(this.xAxisMajor.scale(newScale));
                    // this.nxXAxisMajor.call(this.xAxisMajor.ticks(this.periodModifier));
                    this.nxXAxisMinor.call(this.xAxisMinor.scale(newScale));
                    this.nxXAxisMinor.call(this.xAxisMinor);
                    this.initAxisFormat();

                    this.redraw();
                }
            });
    }

    calcHelpers(): void {
        this.canvasVirtualWidth = Math.trunc(
            this.webglService.canvasWidth$.value * this.webglService.levelZoom$.value,
        );

        this.lastMinuteWidth = Math.trunc((this.canvasVirtualWidth / this.timeFrameInS) * 60);
    }

    initChart(): void {
        timer(0, 100)
            .pipe(takeUntil(this.canvasRendered$), untilDestroyed(this))
            .subscribe(fps => {
                this.container = document.querySelector('#chart');
                if (!this.container) {
                    return;
                }
                this.canvasRendered$.next(true);
                this.initContainer();
                this.initXscale();
                this.initAxisMajor();
                this.initAxisMinor();
                this.initZoom();
                // Test data for Bookmarks, Events ... etc.
                this.mockBookmarksData();
                // ****************************
                this.webglService.updateTimelineRange();
                this.render(this.data$$());
            });
    }

    mockBookmarksData(): void {
        // To avoid clash with data last chunk insert these at beginning
        this.analyticsData = [
            { startTimeMs: '1690700400000', durationMs: '3000000' },
            { startTimeMs: '1690706400000', durationMs: '3000000' },
            { startTimeMs: '1690712400000', durationMs: '300000' },
            { startTimeMs: '1690718400000', durationMs: '1000' },
        ];
        this.bookmarksData = [
            { startTimeMs: '1691800400000', durationMs: '3000000' },
            { startTimeMs: '1691806400000', durationMs: '3000' },
            { startTimeMs: '1691812400000', durationMs: '5000000' },
            { startTimeMs: '1691820400000', durationMs: '5000000' },
        ];
        // this.addData(this.bookmarksData, CHUNK_TYPE.ANALYTICS);
    }

    private getMainCameraRecords(records: TimeDetail[]): DATA[] {
        const mainCamera = records.find(item => item.guid === this.selectedCameraId);

        if (mainCamera) {
            const newChunks = mainCamera.periods.map((period): DATA => {
                return this.periodToChunk(period);
            });

            // this.data.push(
            //     ...mainCamera.periods.map((period): DATA => {
            //         return this.periodToChunk(period);
            //     }),
            // );
            return newChunks;
        }

        return [];
    }

    private getAllCamerasRecords(records: TimeDetail[]): boolean {
        const newMainCameraChunks = this.getMainCameraRecords(records);

        if (newMainCameraChunks.length) {
            this.data$$.update(oldData => [...oldData, ...newMainCameraChunks]);
        }

        let recordsAllCameras: RECORD_DATA[] = [];
        recordsAllCameras = records.flatMap((rec): RECORD_DATA[] => {
            return [...recordsAllCameras, ...rec.periods];
        });

        if (!this.dataAllCameras$$().length && recordsAllCameras.length) {
            recordsAllCameras = recordsAllCameras.sort((a, b) => {
                const ms1 = +a.startTimeMs;
                const ms2 = +b.startTimeMs;
                if (ms1 < ms2) {
                    return -1;
                }
                if (ms1 > ms2) {
                    return 1;
                }

                // names must be equal
                return 0;
            });
        }

        const newAllCameraChunks = recordsAllCameras.map((period): DATA => {
            return this.periodToChunk(period, true);
        });
        this.dataAllCameras$$.update(oldData => [...oldData, ...newAllCameraChunks]);

        this.initStartEndTime();

        return this.dataAllCameras$$().length === recordsAllCameras.length; // first data load?
    }

    getRecords(camerasInLayout: string[]): void {
        timer(0, TEN_SEC_IN_MS)
            .pipe(untilDestroyed(this), takeUntil(this.destroy$))
            .subscribe(() => {
                this.system.cameraManager
                    .getRecordedTimes(camerasInLayout, this.end)
                    .pipe(untilDestroyed(this), takeUntil(this.destroy$))
                    .subscribe((records: TimeDetail[]) => {
                        if (!records.length) {
                            return;
                        }

                        if (this.getAllCamerasRecords(records)) {
                            this.initChart();
                        } else {
                            this.redraw();
                        }
                    });
            });
    }

    initStartEndTime(): void {
        this.end = Date.now();
        this.start = this.dataAllCameras$$()[0].x;
        this.nowMs = Date.now();
        this.timeFrameInS = Math.ceil((this.nowMs - this.start) / 1000);
    }

    initContainer(): void {
        this.webglService.canvasWidth$.next(this.container.clientWidth);
        this.webglService.canvasHeight$.next(this.container.clientHeight);
        this.webglService.canvasRect$.next(this.container.getBoundingClientRect());

        this.scrollBarWidth$$.update(width => this.container.clientWidth);
    }

    initBars(
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
                                return [1.0, 0, 0, 0.5];
                            case CHUNK_TYPE.ANALYTICS:
                                return [0, 0, 1.0, 0.5];
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

    initXscale(): void {
        this.xScale = d3
            .scaleTime()
            .domain([this.start, this.nowMs])
            .range([0, this.container.clientWidth]);

        this.xScaleOriginal = this.xScale.copy();
        this.webglService.xScale$.next(this.xScale);
    }

    // addMissingLabel(): void {
    //     const second = this.nxXAxisMajor.select('g');
    //
    //     if (!second.empty()) {
    //         this.periodWidth =
    //             +second.attr('transform').split('(')[1].split(',')[0].substring(0, 5) / 2;
    //     } else {
    //         this.periodWidth = this.container.clientWidth / 2;
    //     }
    //
    //     if (this.periodWidth > 80) {
    //         this.nxXAxisMajor
    //             .insert('g', 'g:first-child')
    //             .attr('class', 'tick missing-year')
    //             .attr('transform', 'translate(0,0)')
    //             .append('path')
    //             .attr('stroke', '#000')
    //             .attr('d', 'M0,0L0,24');
    //
    //         this.nxXAxisMajor
    //             .select('.missing-year')
    //             .append('text')
    //             .attr('transform', 'translate(' + this.periodWidth + ',6)')
    //             .attr('fill', '#000')
    //             .attr('visibility', 'false')
    //             .attr('dy', '0.71em')
    //             .text(this.formatTime(this.xScale.domain()[0]));
    //     }
    // }

    // removeMissingLabel(): void {
    //     this.nxXAxisMajor.select('g.missing-year').remove();
    // }

    initAxisFormat(): void {
        const periodYears = d3.timeYears(this.xScale.domain()[0], this.xScale.domain()[1]).length;
        const periodMonths = d3.timeMonths(this.xScale.domain()[0], this.xScale.domain()[1]).length;
        const periodDays = d3.timeDays(this.xScale.domain()[0], this.xScale.domain()[1]).length;

        if (periodYears > 0 && periodMonths > 3) {
            this.periodModifier = d3.timeYear;
            this.formatTime = this.formatYear;
            this.periodMinorModifier = d3.timeMonth;
            this.formatMinorTime = this.formatMinorMonth;
        } else {
            if (periodMonths < 7 && periodMonths > 0) {
                this.periodModifier = d3.timeMonth;
                this.formatTime = this.formatMonth;
                this.periodMinorModifier = d3.timeDay.every(6);
                this.formatMinorTime = this.formatMinorDay;
            } else if (periodMonths === 0) {
                if (periodDays < 7 && periodDays > 0) {
                    this.periodModifier = d3.timeDay;
                    this.formatTime = this.formatDay;
                    this.periodMinorModifier = d3.timeMinute;
                    this.formatMinorTime = this.formatMinorMinute;
                } else if (periodDays === 0) {
                    const periodMinutes = d3.timeMinutes(
                        this.xScale.domain()[0],
                        this.xScale.domain()[1],
                    ).length;
                    if (periodMinutes < 7 && periodMinutes > 0) {
                        this.periodModifier = d3.timeMinute;
                        this.formatTime = this.formatMinute;
                        this.periodMinorModifier = d3.timeSecond;
                        this.formatMinorTime = this.formatMinorSecond;
                    } else if (periodMinutes === 0) {
                        const periodSeconds = d3.timeSeconds(
                            this.xScale.domain()[0],
                            this.xScale.domain()[1],
                        ).length;
                        if (periodSeconds < 7) {
                            this.periodModifier = d3.timeSecond;
                            this.formatTime = this.formatSecond;
                            this.periodMinorModifier = d3.timeMillisecond;
                            this.formatMinorTime = this.formatMinorMillisecond;
                        } else {
                            this.periodModifier = d3.timeMinute;
                            this.formatTime = this.formatMinute;
                            this.periodMinorModifier = d3.timeSecond;
                            this.formatMinorTime = this.formatMinorSecond;
                        }
                    } else {
                        this.periodModifier = d3.timeDay;
                        this.formatTime = this.formatDay;
                        this.periodMinorModifier = d3.timeMinute;
                        this.formatMinorTime = this.formatMinorMinute;
                    }
                } else {
                    this.periodModifier = d3.timeMonth;
                    this.formatTime = this.formatMonth;
                    this.periodMinorModifier = d3.timeDay;
                    this.formatMinorTime = this.formatMinorDay;
                }
            } else {
                this.periodModifier = d3.timeYear;
                this.formatTime = this.formatYear;
                this.periodMinorModifier = d3.timeMonth;
                this.formatMinorTime = this.formatMinorMonth;
            }
        }

        if (this.xAxisMajor) {
            this.xAxisMajor.tickFormat(this.formatTime);
            this.nxXAxisMajor.call(this.xAxisMajor.ticks(this.periodModifier));
            // this.addMissingLabel();
        }

        if (this.nxXAxisMinor) {
            this.xAxisCustomTicksFontSize();
        }
    }

    initAxisMajor(): void {
        this.xAxisMajor = fc.axisBottom(this.xScale).tickSize(26);
        // .tickCenterLabel(true);
        // .decorate(s => {
        //     s.enter()
        //         .select('.tick')
        //         .style('text-anchor', 'start')
        //         .select('text')
        //         .style('transform', `translate(5px, 8px)`);
        // });
        // .tickFormat(d => this.initAxisMinorFormat(d));

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
        // this.xAxisMajor.tickFormat(this.formatTime);
    }

    initAxisMinorFormat(date: Date): string {
        // Define filter conditions
        return (
            d3.timeSecond(date) < date
                ? this.formatMinorMillisecond
                : d3.timeMinute(date) < date
                ? this.formatMinorSecond
                : d3.timeHour(date) < date
                ? this.formatMinorMinute
                : d3.timeDay(date) < date
                ? this.formatMinorHour
                : d3.timeMonth(date) < date
                ? d3.timeWeek(date) < date
                    ? this.formatMinorDay
                    : this.formatMinorWeek
                : d3.timeYear(date) < date
                ? this.formatMinorMonth
                : this.formatMinorYear
        )(date);
    }

    initAxisMinor(): void {
        this.xAxisMinor = fc
            .axisOrdinalBottom(this.xScale)
            .ticks(15)
            .tickSize(26)
            // .decorate(s => s.enter().select('text').style('transform', 'translate(25px, 10px)'));
            .tickFormat(d => this.initAxisMinorFormat(d)); // xAxisMinorTicks(d));

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

    xAxisCustomTicksFontSize(): void {
        // const axis = this.nxXAxisMinor.selectAll('text');
        // // xScale.ticks().count is not reliable
        // const tickCount = axis.nodes().filter(t => t.innerHTML !== '').length;
        //
        // axis.style(
        //     'font-size',
        //     tickCount <= this.tickBreakpointMajor
        //         ? 12
        //         : tickCount <= this.tickBreakpointMinor
        //         ? 10
        //         : 8,
        // );
    }

    initZoom(): void {
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

        this.wrapperScroll = d3.select('#wrapperScroll');

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

    render = (data: DATA[]): void => {
        if (!data.length) {
            return;
        }

        // this.initAxisFormat();
        this.barSeries = this.initBars(data, this.xScale, d3.scaleLinear());

        if (this.cameras.length > 1) {
            this.barSeriesAll = this.initBars(
                this.dataAllCameras$$(),
                this.xScale,
                d3.scaleLinear(),
            );
        }

        // const pointer = fc.pointer().on('point', ([coord]) => {
        //     if (!coord) {
        //         return;
        //     }
        //
        //     this.webglService.currentPointer$.next(this.xScale.invert(coord.x));
        // });

        this.chartAll = chartCartesian(this.xScale, d3.scaleLinear())
            .webglPlotArea(this.barSeriesAll)
            .xDomain(this.xScale.domain())
            .decorate(context =>
                context.enter().select('d3fc-canvas.webgl-plot-area').call(this.zoom),
            );

        this.chart = chartCartesian(this.xScale, d3.scaleLinear())
            .webglPlotArea(this.barSeries)
            .xDomain(this.xScale.domain())
            .decorate(
                context =>
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
                            this.webglService.canvasRect$.next(
                                event.target.getBoundingClientRect(),
                            );

                            this.scrollBarWidth$$.update(
                                width => event.detail.width / event.detail.pixelRatio,
                            );
                            this.xScaleOriginal.range([0, this.webglService.canvasWidth$.value]);
                            this.initXscale();
                            this.initZoom();
                        })
                        .on('click', event => {
                            if (!this.zoomInProcess) {
                                const currentTime =
                                    this.webglService.currentPointer$.value.getTime();

                                const currentChuck = this.webglService.chunkSearch(
                                    this.data$$(),
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
                // .call(pointer),
            );

        this.redraw();
    };

    redraw(): void {
        if (!this.data$$().length || !this.xScale) {
            return;
        } else if (!this.chart) {
            this.render(this.data$$());
            return;
        }

        this.chart.xDomain(this.xScale.domain());
        this.chartAll.xDomain(this.xScale.domain());

        const displayData = this.data$$().filter(
            d =>
                !(
                    (d.type === CHUNK_TYPE.BOOKMARK && !this.showData.bookmarks) ||
                    (d.type === CHUNK_TYPE.ANALYTICS && !this.showData.analytics) ||
                    (d.type === CHUNK_TYPE.RECORDS && !this.showData.records)
                ),
        );

        const displayAllData = this.dataAllCameras$$().filter(
            d =>
                !(
                    (d.type === CHUNK_TYPE.BOOKMARK && !this.showData.bookmarks) ||
                    (d.type === CHUNK_TYPE.ANALYTICS && !this.showData.analytics) ||
                    (d.type === CHUNK_TYPE.RECORDS && !this.showData.records)
                ),
        );

        if (this.dataSet !== displayData.length || this.dataAllSet !== displayAllData.length) {
            this.dataSet = displayData.length;
            this.dataAllSet = displayAllData.length;
            this.render(displayData);
            return;
        }

        this.canvas = d3
            .select('#chart')
            .datum(displayData) // sampleData as datum kills chunks width
            .call(this.chart);

        this.canvasAll = d3
            .select('#chartAll')
            .datum(displayAllData) // sampleData as datum kills chunks width
            .call(this.chartAll);
    }

    transform(direction: SCROLL_DIRECTION): d3.ZoomTransform {
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

    singleScroll(direction: SCROLL_DIRECTION): void {
        if (this.canvas) {
            this.canvas.transition().call(this.zoom.transform, this.transform(direction));
        }
        if (this.canvasAll) {
            this.canvasAll.transition().call(this.zoom.transform, this.transform(direction));
        }
    }

    doTransform(): void {
        const t = d3.zoomIdentity.translate(this.xPos, 0).scale(this.webglService.levelZoom$.value);

        this.canvas.call(this.zoom.transform, t);
        this.canvasAll?.call(this.zoom.transform, t);
    }

    /*
        Used when selection reaches scrollable beginning / end of the chart
    */
    // scrollShift(params: { direction: SCROLL_DIRECTION; position: number }): void {
    //     this.scrollInProcess = true;
    //
    //     if (this.xPos <= 0) {
    //         this.xPos += params.position;
    //     } else {
    //         this.xPos = 0;
    //     }
    //
    //     this.doTransform();
    // }

    scrollToPos(params: { direction: SCROLL_DIRECTION; position: number }): void {
        this.scrollInProcess = true;

        if (this.xPos <= 0) {
            this.xPos = -params.position * this.webglService.levelZoom$.value;
        } else {
            this.xPos = 0;
        }

        this.doTransform();
    }

    scrollEnd(): void {
        this.scrollInProcess = false;
        this.zoomInProcess = false;

        this.scrollBarPos$$.update(pos => {
            return Math.trunc(-this.xPos / this.webglService.levelZoom$.value);
        });
    }

    constantScroll(params: { direction: SCROLL_DIRECTION; action: string }): void {
        if (this.canvas) {
            if (params.action === 'start') {
                interval(0, animationFrameScheduler)
                    .pipe(untilDestroyed(this), takeUntil(this.cancelScroll$))
                    .subscribe(() => {
                        this.canvas.call(this.zoom.transform, this.transform(params.direction));
                    });
            } else {
                this.cancelScroll$.next(true);
            }
        }
    }

    // doZoom(direction: ZOOM_DIRECTION): void {
    //     const currentK = Math.max(this.webglService.levelZoom$.value, 1);
    //     let zoomK: number;
    //
    //     switch (direction) {
    //         case ZOOM_DIRECTION.in:
    //             zoomK = currentK * ZOOM_FACTOR;
    //             break;
    //         case ZOOM_DIRECTION.forceZoomIn:
    //             zoomK = currentK * FORCE_ZOOM_FACTOR;
    //             break;
    //         case ZOOM_DIRECTION.out:
    //             zoomK = currentK * (1 / ZOOM_FACTOR);
    //             break;
    //         case ZOOM_DIRECTION.forceZoomOut:
    //             zoomK = 1; // k = 1
    //             break;
    //     }
    //
    //     this.canvas
    //         .transition()
    //         .duration(ZOOM_DURATION)
    //         .call(this.zoom.transform, d3.zoomIdentity.scale(zoomK));
    //     this.canvasAll
    //         .transition()
    //         .duration(ZOOM_DURATION)
    //         .call(this.zoom.transform, d3.zoomIdentity.scale(zoomK));
    // }

    // constantZoom(params: { direction: ZOOM_DIRECTION; action: string }): void {
    //     if (this.canvas) {
    //         if (params.action === 'start') {
    //             interval(0, animationFrameScheduler)
    //                 .pipe(untilDestroyed(this), takeUntil(this.cancelZoom$))
    //                 .subscribe(() => {
    //                     const currentK = this.webglService.levelZoom$.value || 1;
    //                     this.canvas.call(
    //                         this.zoom.transform,
    //                         d3.zoomIdentity.scale(currentK + CONSTANT_ZOOM_FACTOR),
    //                     );
    //                 });
    //         } else {
    //             this.cancelZoom$.next(true);
    //         }
    //     }
    // }

    // private addData(dataObj: Record<string, string>[], type?: CHUNK_TYPE): void {
    //     const newData = dataObj.map((chunk: Record<string, string>) => {
    //         const chunkStart = parseInt(chunk.startTimeMs);
    //         let chunkEnd = parseInt(chunk.durationMs);
    //         chunkEnd = chunkEnd < 0 ? Date.now() - chunkStart : chunkEnd;
    //
    //         return { x: chunkStart, y: 30, width: chunkEnd, type };
    //     });
    //
    //     this.data.push(...newData);
    //     this.redraw();
    // }

    mouseMoveHandler(event: MouseEvent): void {
        if (event.offsetY > 5) {
            // avoid triggering at bottom scroll area
            this.timeLabelPosition = event.offsetX;
        }
    }

    mouseLeaveHandler(): void {
        this.timeLabelPosition = undefined;
    }

    onActions(actions: ACTIONS): void {
        this.timelineActions = { ...actions };
    }

    protected readonly nxConfig = nxConfig;
}
