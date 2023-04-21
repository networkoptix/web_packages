// import { DOCUMENT } from '@angular/common';
import {
    AfterViewInit,
    Component,
    /* Inject, */
    Input,
    OnChanges,
    OnInit,
    ViewEncapsulation
} from '@angular/core';
import { chartCartesian } from '@d3fc/d3fc-chart';
import { extentDate } from '@d3fc/d3fc-extent';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import * as d3 from 'd3';
import * as fc from 'd3fc';
// import { randomFinancial } from 'd3fc';
import { animationFrameScheduler, interval } from 'rxjs';

import { NgChanges } from '@utils/ng-changes';
// import { NxWebGLService } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/services/webgl.service';
// import { largestTriangleThreeBucket } from 'd3fc';
// import { animationFrameScheduler, interval, Subject, takeUntil } from 'rxjs';

// import { NgChanges } from '@utils/ng-changes';
// import {
//     CONSTANT_SCROLL_FACTOR_PX,
//     SCROLL_DIRECTION,
//     SCROLL_FACTOR_PX
// } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/scroll/scroll.types';
// import { NxWebGLService } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/services/webgl.service';
// import {
//     CONSTANT_ZOOM_FACTOR,
//     FORCE_ZOOM_FACTOR,
//     ZOOM_DIRECTION,
//     ZOOM_DURATION,
//     ZOOM_FACTOR
// } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/zoom/zoom.types';

interface DATA {
    width: number;
    x: number;
    y: number;
}

// interface DataPoint {
//   high: number;
//   low: number;
//   volume: number;
//   open: number;
//   close: number;
//   date: Date;
// }

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

    container: HTMLDivElement;
    barSeries: never;
    timeFrameInS: number;
    start: number;
    end: number;

    // eslint-disable-next-line nx/no-untyped-init
    chart;
    // eslint-disable-next-line nx/no-untyped-init
    canvas;
    // eslint-disable-next-line nx/no-untyped-init
    data = [];

    xScale: d3.ScaleTime<number, number>;

    // constructor(
    //     private webglService: NxWebGLService,
    //     // @Inject(DOCUMENT) private document: Document,
    // ) {
    // }

    randomChunk(): void {
        const now = new Date().getTime();
        !this.data.length && this.data.push({ x: now, y: 30, width: 30000 });
        const lastChunk = this.data.pop();

        // if (new Date().getMinutes() % 2) {
        if (lastChunk.x + lastChunk.width < now) {
            lastChunk.width = now - lastChunk.x;
        }
        this.data.push(lastChunk);
        // } else {
        //     if (lastChunk.x + lastChunk.width > now) {
        //         this.data.push({ x: now, y: 30, width: 30000 });
        //     }
        // }
        this.end = now;
    }

    ngOnInit(): void {
        // this.data = this.initialData.map((chunk: Record<string, string>) => {
        //     const chunkStart = parseInt(chunk.startTimeMs);
        //     const chunkEnd = parseInt(chunk.durationMs);
        //
        //     return { x: chunkStart, y: 30, width: chunkEnd };
        // });
        //
        // this.start = parseInt(this.initialData[0].startTimeMs);
        // this.end = new Date().getTime();

        interval(0, animationFrameScheduler)
            .pipe(untilDestroyed(this))
            .subscribe(() => {
                this.randomChunk();
                // this.data.push({ x: new Date().getTime() - 500, y: 30, width: 100 });
                // this.end = new Date().getTime();

                this.render();
            });
    }

    ngAfterViewInit(): void {
        // this.container = this.document.querySelector('#chart');
        // this.webglService.canvasWidth$.next(this.container.clientWidth);
        // this.webglService.canvasHeight$.next(this.container.clientHeight);
        // this.webglService.canvasRect$.next(this.container.getBoundingClientRect());

        this.render();
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

    render = (): void => {
        // console.time();
        if (!this.data.length) {
            return;
        }

        const xExtent = extentDate().accessors([d => d.x + d.width]);

        this.xScale = d3.scaleUtc()
            .domain([this.start, this.end]);
        // .range([0, this.webglService.canvasWidth$.value]);

        this.initBars(this.data, this.xScale, d3.scaleLinear());
        // console.timeEnd();

        const chart = chartCartesian(this.xScale, d3.scaleLinear())
            .webglPlotArea(this.barSeries)
            .xDomain(xExtent(this.data));
        // .yDomain(yExtent(this.data));

        d3.select('#chart').datum(this.data).call(chart);
        // this.redraw();
    };

    // redraw(): void {
    //     // console.time();
    //     this.canvas = d3.select('#chart')
    //         .datum(this.data)// sampleData as datum kills chunks width
    //         .call(this.chart);
    //     // console.timeEnd();
    // }

    ngOnChanges(changes:NgChanges<SimpleNxWebGLCanvasComponent>): void {
        if (changes.pushData.currentValue) {
            // const obj = this.pushData.map((chunk: Record<string, string>) => {
            //     const chunkStart = parseInt(chunk.startTimeMs);
            //     const chunkEnd = parseInt(chunk.durationMs);
            //
            //     return { x: chunkStart, y: 30, width: chunkEnd };
            // });
            //
            // this.data.push(obj);
            // this.end = obj[0].x;

            // this.render();
        }
    }
}
