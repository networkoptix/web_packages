import { DOCUMENT } from '@angular/common';
import { AfterViewInit, Component, Inject, Input, ViewEncapsulation } from '@angular/core';
// import * as fcWebgl from '@d3fc/d3fc-webgl';
import { untilDestroyed, UntilDestroy } from '@ngneat/until-destroy';
import * as d3 from 'd3';
import * as fc from 'd3fc';
import { largestTriangleThreeBucket } from 'd3fc';
import { interval, animationFrameScheduler, Subject, takeUntil } from 'rxjs';

import {
    CONSTANT_SCROLL_FACTOR_PX,
    SCROLL_DIRECTION,
    SCROLL_FACTOR_PX,
} from '@vms-client/submodules/timeline/components/nx-webgl-canvas/scroll/scroll.types';
import { NxWebGLService } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/services/webgl.service';
import {
    CONSTANT_ZOOM_FACTOR,
    FORCE_ZOOM_FACTOR,
    ZOOM_DIRECTION, ZOOM_DURATION,
    ZOOM_FACTOR
} from '@vms-client/submodules/timeline/components/nx-webgl-canvas/zoom/zoom.types';

interface DATA {
    width: number;
    x: number;
    y: number;
}

enum TICK_BREAKPOINTS {
    lowMAJOR = 12,
    lowMINOR = 17,
    denseMAJOR = 20,
    denseMINOR = 25,
}

@UntilDestroy()
@Component({
    selector: 'nx-webgl-canvas',
    templateUrl: 'webgl-canvas.component.html',
    styleUrls: ['webgl-canvas.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class NxWebGLCanvasComponent implements AfterViewInit {
    @Input() initialData: Array<Record<string, string>>;

    // eslint-disable-next-line nx/no-untyped-init
    chart;
    // eslint-disable-next-line nx/no-untyped-init
    zoom;
    // eslint-disable-next-line nx/no-untyped-init
    data;
    // eslint-disable-next-line nx/no-untyped-init
    sampledData;
    // eslint-disable-next-line nx/no-untyped-init
    canvas;

    currentPointer: Date;
    playbackPointer: Date;

    container: HTMLDivElement;
    barSeries: never;

    xAxisMajor: typeof fc.axisBottom;
    xAxisMinor: typeof fc.axisTop;

    tickBreakpointMajor: number = TICK_BREAKPOINTS.lowMAJOR;
    tickBreakpointMinor: number = TICK_BREAKPOINTS.lowMINOR;

    periodModifier: d3.CountableTimeInterval;
    formatTime: (Date) => string;
    periodWidth: number = 0;

    xPos: number;

    timeFrameInS: number;
    start: number;
    end: number;

    cancelScroll$ = new Subject<boolean>();
    cancelZoom$ = new Subject<boolean>();

    timeLabelPosition: number | undefined;
    playbackLabelPosition: number | undefined;

    constructor(
        private webglService: NxWebGLService,
        @Inject(DOCUMENT) private document: Document,
    ) {}

    ngAfterViewInit(): void {
        this.container = this.document.querySelector('#chart');
        this.webglService.canvasWidth$.next(this.container.clientWidth);
        this.webglService.canvasHeight$.next(this.container.clientHeight);
        this.webglService.canvasRect$.next(this.container.getBoundingClientRect());

        if (this.initialData.length) {
            this.initData();
            this.initChart();
        }
    }

    initData(): void {
        // const startYear = new Date('2015-06-01');
        this.start = parseInt(this.initialData[0].startTimeMs);
        this.end = new Date().getTime();
        this.timeFrameInS = Math.ceil((this.end - this.start) / 1000);

        // eslint-disable-next-line array-callback-return
        this.data = this.initialData.map((chunk: Record<string, string>) => {
            const chunkStart = parseInt(chunk.startTimeMs);
            const chunkEnd = parseInt(chunk.durationMs);

            return { x: chunkStart, y: 30, width: chunkEnd };
        });

        // Create the sampler
        const sampler = largestTriangleThreeBucket();

        // Configure the x / y value accessors
        sampler
            .x(d => d.x)
            .y(d => d.y);

        // Configure the size of the buckets used to downsample the data.
        sampler.bucketSize(200);

        // Run the sampler
        this.sampledData = sampler(this.data);
    }

    initBars(
        data: Array<DATA>,
        xScale: d3.ScaleTime<number, number, never>,
        yScale: d3.ScaleLinear<number, number, never>
    ): void {
        this.barSeries = (fc.seriesWebglBar(data)
            // .equals((previousData, currentData) => previousData === currentData)
            .xScale(xScale)
            .yScale(yScale)
            .crossValue(d => d.x)
            .mainValue(d => d.y)

            .bandwidth(d => {
                return Math.max(1, xScale(d.x + d.width) - xScale(d.x));
            })
            .decorate(context => {
                // [r / 255, g / 255, b / 255, opacity] .. setting green_l2 here
                fc.webglFillColor([76 / 255, 188 / 255, 40 / 255, 1])(context);
            }) as never);
    }

    initChart(): void {
        this.periodModifier = d3.utcYear;

        const yScale = d3.scaleLinear();

        const xScale = d3.scaleUtc()
            .domain([this.start, this.end])
            // .domain(d3.extent(data, d => d.x))
            // .nice() // this will round domain to a whole year
            .range([0, this.webglService.canvasWidth$.value]);
        this.webglService.xScale$.next(xScale);

        const xScaleOriginal = xScale.copy();

        this.initBars(this.data, xScale, yScale);

        this.xAxisMajor = fc.axisBottom(xScale)
            .tickSize(24)
            .tickCenterLabel(true)
            .tickPadding(6);
        // .tickFormat(axisTimeFormat);

        const nxXAxisMajor = d3.select('#nx-x-axis-major')
            .append('d3fc-svg')
            .attr('class', 'x-axis nx-x-axis-major')
            .select('svg')
            .append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0, 0)')
            .call(this.xAxisMajor.ticks(this.periodModifier));

        // Establish the desired formatting options using locale.format():
        // https://github.com/d3/d3-time-format/blob/master/README.md#locale_format
        const formatMillisecond = d3.utcFormat('%Lms');
        const formatSecond = d3.utcFormat('%Ss');
        const formatMinute = d3.utcFormat('%I:%M');
        const formatHour = d3.utcFormat('%I %p');
        const formatDay = d3.utcFormat('%a %d');
        const formatWeek = d3.utcFormat('%b %d');
        const formatMonth = d3.utcFormat('%B');
        const formatYear = d3.utcFormat('%Y');

        // Define filter conditions
        const multiFormat = (date: Date): string => {
            return (d3.utcSecond(date) < date ? formatMillisecond
                : d3.utcMinute(date) < date ? formatSecond
                    : d3.utcHour(date) < date ? formatMinute
                        : d3.utcDay(date) < date ? formatHour
                            : d3.utcMonth(date) < date ? (d3.utcWeek(date) < date ? formatDay : formatWeek)
                                : d3.utcYear(date) < date ? formatMonth
                                    : formatYear)(date);
        };

        const xAxisMinorTicks = (d: Date): string => {
            return multiFormat(d);
        };

        this.xAxisMinor = fc.axisBottom(xScale)
            .ticks(15)
            .tickFormat(d => xAxisMinorTicks(d));

        const nxXAxisMinor = d3.select('#nx-x-axis-minor')
            .append('d3fc-svg')
            .attr('class', 'x-axis nx-x-axis-minor')
            .select('svg')
            .append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0, 0)')
            .call(this.xAxisMinor);

        const xAxisCustomTicksFontSize = (): void => {
            const axis = nxXAxisMinor.selectAll('text');
            // xScale.ticks().count is not reliable
            // @ts-expect-error blah
            const tickCount = axis.nodes().filter(t => t.innerHTML !== '').length;

            axis
                .style(
                    'font-size',
                    tickCount <= this.tickBreakpointMajor
                        ? 12
                        : tickCount <= this.tickBreakpointMinor
                            ? 10 : 8
                );
        };

        const xAxisMajorTicks = (): void => {
            const periodYears = d3.utcYears(xScale.domain()[0], xScale.domain()[1]).length;
            const periodMonths = d3.utcMonths(xScale.domain()[0], xScale.domain()[1]).length;
            const periodDays = d3.utcDays(xScale.domain()[0], xScale.domain()[1]).length;

            if (periodYears > 0 && periodMonths > 3) {
                this.periodModifier = d3.utcYear;
                this.formatTime = d3.utcFormat('%Y');
            } else {
                if (periodMonths < 5 && periodMonths > 0) {
                    this.periodModifier = d3.utcMonth;
                    this.formatTime = d3.utcFormat('%B %Y');
                } else if (periodMonths === 0) {
                    if (periodDays < 4 && periodDays > 0) {
                        this.periodModifier = d3.utcDay;
                        this.formatTime = d3.utcFormat('%d %B %Y');
                    } else if (periodDays === 0) {
                        const periodMinuses = d3.utcMinutes(xScale.domain()[0], xScale.domain()[1]).length;
                        if (periodMinuses < 4 && periodMinuses > 0) {
                            this.periodModifier = d3.utcMinute;
                            this.formatTime = d3.utcFormat('%d %B %Y %I:%M');
                        } else if (periodMinuses === 0) {
                            const periodSeconds = d3.utcSeconds(xScale.domain()[0], xScale.domain()[1]).length;
                            if (periodSeconds < 4) {
                                this.periodModifier = d3.utcSecond;
                                this.formatTime = d3.utcFormat('%d %B %Y %I:%M:%S');
                            } else {
                                this.periodModifier = d3.utcMinute;
                                this.formatTime = d3.utcFormat('%d %B %Y %I:%M');
                            }
                        } else {
                            this.periodModifier = d3.utcDay;
                            this.formatTime = d3.utcFormat('%d %B %Y');
                        }
                    } else {
                        this.periodModifier = d3.utcMonth;
                        this.formatTime = d3.utcFormat('%B %Y');
                    }
                } else {
                    this.periodModifier = d3.utcYear;
                    this.formatTime = d3.utcFormat('%Y');
                }
            }
            this.xAxisMajor.tickFormat(this.formatTime);

            xAxisCustomTicksFontSize();
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            addMissingLabel();
        };

        const addMissingLabel = (): void => {
            const second = nxXAxisMajor.select('g');

            if (!second.empty()) {
                this.periodWidth = +second
                    .attr('transform')
                    .split('(')[1]
                    .split(',')[0]
                    .substring(0, 5) / 2;
            } else {
                this.periodWidth = this.container.clientWidth / 2;
            }

            if (this.periodWidth > 80) {
                nxXAxisMajor
                    .insert('g', 'g:first-child')
                    .attr('class', 'tick missing-year')
                    .attr('transform', 'translate(0,0)')
                    .append('path')
                    .attr('stroke', '#000')
                    .attr('d', 'M0,0L0,24');

                nxXAxisMajor
                    .select('.missing-year')
                    .append('text')
                    .attr('transform', 'translate(' + this.periodWidth + ',6)')
                    .attr('fill', '#000')
                    .attr('visibility', 'false')
                    .attr('dy', '0.71em')
                    .text(this.formatTime(xScale.domain()[0]));
            }
        };

        const removeMissingLabel = (): void => {
            nxXAxisMajor.select('g.missing-year').remove();
        };

        const checkVisibleArea = (zoom: number): void => {
            this.webglService.canScroll$.next({
                left: zoom > 1 && xScaleOriginal.domain()[0].getTime() < xScale.domain()[0].getTime(),
                right: zoom > 1 && xScaleOriginal.domain()[1].getTime() > xScale.domain()[1].getTime()
            });
        };

        this.zoom = d3
            .zoom()
            .scaleExtent([1, this.timeFrameInS])
            .translateExtent([[0, 0], [this.webglService.canvasWidth$.value, this.webglService.canvasHeight$.value]])
            .on('zoom', event => {
                const newScale = event.transform.rescaleX(xScaleOriginal);
                xScale.domain(newScale.domain());

                checkVisibleArea(event.transform.k);
                removeMissingLabel();

                nxXAxisMajor.call(this.xAxisMajor.scale(newScale));
                nxXAxisMajor.call(this.xAxisMajor.ticks(this.periodModifier));

                nxXAxisMinor.call(this.xAxisMinor.scale(newScale));
                nxXAxisMinor.call(this.xAxisMinor);

                this.webglService.xScale$.next(xScale);
                this.webglService.levelZoom$.next(event.transform.k); // k, x and y

                this.webglService.canZoom$.next({
                    in: this.webglService.levelZoom$.value >= 1,
                    out: this.webglService.levelZoom$.value > 1
                });

                this.xPos = Math.trunc(event.transform.x);

                // eslint-disable-next-line @typescript-eslint/no-use-before-define
                this.redraw();
            });

        const pointer = fc.pointer()
            .on('point', ([coord]) => {
                if (!coord) {
                    return;
                }

                this.currentPointer = xScale.invert(coord.x);
            });

        this.chart = fc.chartCartesian({
            xScale,
            yScale,
        })
            .xOrient('top')
            .yOrient('left')
            .webglPlotArea(this.barSeries)
            .decorate(sel =>
                sel
                    .enter()
                    .select('d3fc-canvas.webgl-plot-area')
                    .on('measure', event => {
                        xAxisMajorTicks();

                        if (this.webglService.canvasWidth$.value === event.detail.width) {
                            return;
                        }

                        this.webglService.canvasWidth$.next(event.detail.width);
                        this.webglService.canvasHeight$.next(event.detail.height);
                        this.webglService.canvasRect$.next(event.target.getBoundingClientRect());

                        xScaleOriginal.range([0, this.webglService.canvasWidth$.value]);
                    })
                    .on('click', (event, data) => {
                        // console.log('1 =>', event);
                        console.log('clicked =>', this.currentPointer.getTime());
                        const found = this.sampledData.find(chunk => {
                            const currentTime = this.currentPointer.getTime();
                            if (chunk.x <= currentTime && chunk.x + chunk.width >= currentTime) {
                                console.log('In chunk => ');
                                this.playbackPointer = this.currentPointer;
                                this.playbackLabelPosition = event.offsetX;
                                return true;
                            } else if (chunk.x > currentTime) {
                                this.playbackPointer = this.currentPointer;
                                this.playbackLabelPosition = event.offsetX; // this will need tuning
                                console.log('Next chunk => ');
                                return true;
                            } else {
                                this.playbackLabelPosition = undefined;
                                return false;
                            }
                        });

                        console.log('found =>', found);
                    })
                    .call(this.zoom)
                    .call(pointer));

        setTimeout(() => {
            this.redraw();
        });
    }

    redraw(): void {
        // console.time();
        this.canvas = d3.select('#chart')
            .datum(this.data)// sampleData as datum kills chunks width
            .call(this.chart);
        // console.timeEnd();
    }

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    transform(direction: SCROLL_DIRECTION) {
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
                position = 0;
                break;
        }

        return d3.zoomIdentity
            .translate(position, 0)
            .scale(this.webglService.levelZoom$.value);
    }

    singleScroll(direction: SCROLL_DIRECTION): void {
        if (this.canvas) {
            this.canvas.transition().call(
                this.zoom.transform,
                this.transform(direction)
            );
        }
    }

    constantScroll(params: { direction: SCROLL_DIRECTION; action: string }): void {
        if (this.canvas) {
            if (params.action === 'start') {
                interval(0, animationFrameScheduler)
                    .pipe(
                        untilDestroyed(this),
                        takeUntil(this.cancelScroll$)
                    )
                    .subscribe(() => {
                        this.canvas.call(
                            this.zoom.transform,
                            this.transform(params.direction)
                        );
                    });
            } else {
                this.cancelScroll$.next(true);
            }
        }
    }

    doZoom(direction: ZOOM_DIRECTION): void {
        const currentK = this.webglService.levelZoom$.value || 1;
        let zoomK: number;

        switch (direction) {
            case ZOOM_DIRECTION.in:
                zoomK = currentK * ZOOM_FACTOR;
                break;
            case ZOOM_DIRECTION.forceZoomIn:
                zoomK = currentK * FORCE_ZOOM_FACTOR;
                break;
            case ZOOM_DIRECTION.out:
                zoomK = currentK * (1 / ZOOM_FACTOR);
                break;
            case ZOOM_DIRECTION.forceZoomOut:
                zoomK = 1; // k = 1
                break;
        }

        this.canvas
            .transition()
            .duration(ZOOM_DURATION)
            .call(
                this.zoom.transform,
                d3.zoomIdentity.scale(zoomK)
            );
    }

    constantZoom(params: { direction: ZOOM_DIRECTION; action: string }): void {
        if (this.canvas) {
            if (params.action === 'start') {
                interval(0, animationFrameScheduler)
                    .pipe(
                        untilDestroyed(this),
                        takeUntil(this.cancelZoom$)
                    )
                    .subscribe(() => {
                        const currentK = this.webglService.levelZoom$.value || 1;
                        this.canvas.call(
                            this.zoom.transform,
                            d3.zoomIdentity.scale(currentK + CONSTANT_ZOOM_FACTOR)
                        );
                    });
            } else {
                this.cancelZoom$.next(true);
            }
        }
    }

    mouseMoveHandler(event: MouseEvent): void {
        if (event.offsetY > 5) { // avoid triggering at bottom scroll area
            this.timeLabelPosition = event.offsetX;
        }
    }

    mouseLeaveHandler(): void {
        this.timeLabelPosition = undefined;
    }

    getSelectionDate(coordX: number): void {
        this.currentPointer = this.chart.xInvert(coordX);
    }
}
