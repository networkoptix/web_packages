import { DOCUMENT } from '@angular/common';
import { AfterViewInit, Component, Inject, Input, ViewEncapsulation } from '@angular/core';
// import * as fcWebgl from '@d3fc/d3fc-webgl';
import * as d3 from 'd3';
import * as fc from 'd3fc';

interface DATA {
    width: number;
    x: number;
    y: number;
}

@Component({
    selector: 'nx-webgl-canvas',
    templateUrl: 'webgl-canvas.component.html',
    styleUrls: ['webgl-canvas.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class NxWebglCanvasComponent implements AfterViewInit {
    @Input() initialData: Array<Record<string, string>>;

    width: number;
    height: number;

    container: HTMLDivElement;
    barSeries: never;

    xAxisMajor: typeof fc.axisBottom;
    xAxisMinor: typeof fc.axisTop;

    periodModifier: d3.CountableTimeInterval;
    formatTime: (Date) => string;
    periodWidth: number = 0;

    constructor(
        @Inject(DOCUMENT) private document: Document,
    ) {
    }

    ngAfterViewInit(): void {
        this.container = this.document.querySelector('#chart');
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;

        this.initChart();
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
                fc.webglFillColor([1, 0, 0, 1])(context);
            }) as never);
    }

    initChart(): void {
        const timeRecords = this.initialData.length;
        if (timeRecords === 0) {
            return;
        }

        const startYear = new Date('2020-06-01');
        const start = startYear.getTime(); // parseInt(this.initialData[0].startTimeMs);
        const end = new Date().getTime();
        const timeFrameInS = Math.ceil((end - start) / 1000);

        // eslint-disable-next-line array-callback-return
        const data = this.initialData.map((chunk: Record<string, string>) => {
            const chunkStart = parseInt(chunk.startTimeMs);
            const chunkEnd = parseInt(chunk.durationMs);

            return { x: chunkStart, y: 30, width: chunkEnd };
        });

        this.periodModifier = d3.utcYear;

        const yScale = d3.scaleLinear();

        const xScale = d3.scaleUtc()
            .domain([start, end])
            // .domain(d3.extent(data, d => d.x))
            .nice()
            .range([0, this.width]);
        const xScaleOriginal = xScale.copy();

        this.initBars(data, xScale, yScale);

        this.xAxisMajor = fc.axisBottom(xScale)
            .tickSize(24)
            .tickCenterLabel(true)
            .tickPadding(8);
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

        this.xAxisMinor = fc.axisTop(xScale)
            .tickFormat(multiFormat);

        const nxXAxisMinor = d3.select('#nx-x-axis-minor')
            .append('d3fc-svg')
            .attr('class', 'x-axis nx-x-axis-minor')
            .select('svg')
            .append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0, 24)')
            .call(this.xAxisMinor);

        const xAxisCustomTicks = (): void => {
            const periodYears = d3.utcYears(xScale.domain()[0], xScale.domain()[1]).length;
            const periodMonths = d3.utcMonths(xScale.domain()[0], xScale.domain()[1]).length;
            const periodDays = d3.utcDays(xScale.domain()[0], xScale.domain()[1]).length;

            if (periodYears > 0 && periodMonths > 3) {
                this.periodModifier = d3.utcYear;
                this.formatTime = d3.utcFormat('%Y');
            } else {
                if (periodMonths < 4 && periodMonths > 0) {
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
                    .attr('transform', 'translate(' + this.periodWidth + ', 8)')
                    .attr('fill', '#000')
                    .attr('visibility', 'false')
                    .attr('dy', '0.71em')
                    .text(this.formatTime(xScale.domain()[0]));
            }
        };

        const removeMissingLabel = (): void => {
            nxXAxisMajor.select('g.missing-year').remove();
        };

        const zoom = d3
            .zoom()
            .scaleExtent([1, timeFrameInS])
            .translateExtent([[0, 0], [this.width, this.height]])
            .on('zoom', event => {
                const newScale = event.transform.rescaleX(xScaleOriginal);
                xScale.domain(newScale.domain());

                removeMissingLabel();

                nxXAxisMajor.call(this.xAxisMajor.scale(newScale));
                nxXAxisMajor.call(this.xAxisMajor.ticks(this.periodModifier));

                nxXAxisMinor.call(this.xAxisMinor.scale(newScale));
                nxXAxisMinor.call(this.xAxisMinor);

                // eslint-disable-next-line @typescript-eslint/no-use-before-define
                redraw();
            });

        const chart = fc.chartCartesian({
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
                        xAxisCustomTicks();
                        if (this.width === event.detail.width) {
                            return;
                        }
                        this.width = event.detail.width;
                        this.height = event.detail.height;
                        xScaleOriginal.range([0, this.width]);
                    })
                    .call(zoom));

        const redraw = (): void => {
            // console.time();
            d3.select('#chart')
                .datum(data)
                .call(chart);
            // console.timeEnd();
        };

        setTimeout(() => {
            redraw();
        });
    }
}
