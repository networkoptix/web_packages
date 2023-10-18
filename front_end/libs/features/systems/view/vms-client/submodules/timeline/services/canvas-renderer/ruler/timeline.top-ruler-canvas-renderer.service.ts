import { Injectable } from '@angular/core';
import dateFormat from 'dateformat';

import { VideoManagementSystemService } from '@vms-client/submodules/vms/services/vms.service';
import { ms, px } from '@vms-client/utils/type-aliases';

import { cfg } from '../../timeline.config';
import { TimelineService } from '../../timeline.service';
import { NxDrawingConfigsService } from '../drawingConfigs/drowingConfigs.service';
import type { TopRuler } from '../drawingConfigs/drowingConfigs.service.types';

import { topRulerDateFormats } from './dateformats/top_ruler_date_formats';
import { IrregularLengthInterval } from './intervals/IrregularLengthInterval';
import { TOP__MIN_WIDTH_FOR_INTERVALS } from './intervals/cfg/TOP__MIN_WIDTH_FOR_INTERVALS';
import { irregularLengthIntervals } from './intervals/irregularLengthIntervals';
import { estimateIrregularLengthIntervalPessimistically } from './intervals/utils/estimateIrregularLengthIntervalPessimistically';
import { isIntervalOdd } from './intervals/utils/isIntervalOdd';
import { percentageToHex } from './utils/percentageToHex';

@Injectable({
    providedIn: 'root',
})
export class TimelineTopRulerCanvasRendererService {
    topRulerDrawingConfig: TopRuler;

    constructor(
        private timeline: TimelineService,
        private vms: VideoManagementSystemService,
        private drawingConfigsService: NxDrawingConfigsService,
    ) {}

    render(ctx: CanvasRenderingContext2D): void {
        this.topRulerDrawingConfig = this.drawingConfigsService.topRulerDrawingConfig;
        const interval = this.interval;
        const serifTimes = this.serifTimes;
        // console.log('TOP SERIFS', serifTimes, serifTimes.map(st => new Date(st)))
        this.withContext(ctx, () => {
            const h = this.timeline.canvasGeometry.height * cfg.ruler.top.relativeHeight;

            ctx.fillStyle = this.topRulerDrawingConfig.backgroundEvenColor;
            ctx.fillRect(0, 0, this.timeline.canvasGeometry.width, h);

            ctx.strokeStyle = this.topRulerDrawingConfig.underscoreColor;
            ctx.beginPath();
            ctx.moveTo(0, h);
            ctx.lineTo(this.timeline.canvasGeometry.width, h);
            ctx.stroke();

            serifTimes.map((time, index, serifTimes) =>
                this.drawSerif(ctx, interval, time, serifTimes[index - 1], serifTimes[index + 1]),
            );
        });
    }

    reset(): void {
        this._serifTimes = undefined;
        this._interval = undefined;
    }

    private _interval: IrregularLengthInterval;

    get interval(): IrregularLengthInterval {
        if (!this._interval) {
            this._interval = this.getInterval();
        }
        return this._interval;
    }

    private getInterval(): IrregularLengthInterval {
        for (const interval of irregularLengthIntervals) {
            if (interval in TOP__MIN_WIDTH_FOR_INTERVALS) {
                const displayWidth = this.timeline.durationToDomWidth(
                    estimateIrregularLengthIntervalPessimistically(interval),
                );
                const requiredWidth = TOP__MIN_WIDTH_FOR_INTERVALS[interval];
                if (displayWidth >= requiredWidth) {
                    return interval;
                }
            }
        }
    }

    private _serifTimes: Array<ms>;

    private get serifTimes(): Array<ms> {
        if (!this._serifTimes) {
            this._serifTimes = this.getSerifTimes(this.interval);
        }
        return this._serifTimes;
    }

    private getSerifTimes(interval: IrregularLengthInterval): Array<ms> {
        return interval
            ? this.timeline.visibleRange.iterate(interval, this.vms.timeZoneOffset)
            : [];
    }

    private withContext(ctx: CanvasRenderingContext2D, actualDrawing: () => void): void {
        ctx.save();
        actualDrawing();
        ctx.restore();
    }

    private drawSerif(
        ctx: CanvasRenderingContext2D,
        interval: IrregularLengthInterval,
        curTime: ms,
        prevTime: ms,
        nextTime: ms,
    ): void {
        let x0: px = this.timeline.timeToCanvasOffsetX(curTime);

        let x1 = nextTime
            ? this.timeline.timeToCanvasOffsetX(nextTime)
            : x0 +
              this.timeline.durationToCanvasWidth(
                  estimateIrregularLengthIntervalPessimistically(interval),
              );

        if (x0 < 0) {
            x0 = 0;
        }
        if (x1 > this.timeline.canvasGeometry.width) {
            x1 = this.timeline.canvasGeometry.width;
        }

        const y0: px = 0;
        const y1: px = Math.round(
            cfg.ruler.top.relativeHeight * this.timeline.canvasGeometry.height,
        );
        const y2: px = Math.round(
            this.topRulerDrawingConfig.serif.heightRelative * this.timeline.canvasGeometry.height,
        );

        if (isIntervalOdd(curTime, interval)) {
            ctx.fillStyle = this.topRulerDrawingConfig.backgroundOddColor;
            ctx.fillRect(x0, y0, x1 - x0, y1);
        }

        this.drawSerifText(ctx, interval, curTime, x0, x1, y0, y1, y2);
    }

    private drawSerifText(
        ctx: CanvasRenderingContext2D,
        interval: IrregularLengthInterval,
        curTime: ms,
        x0: px,
        x1: px,
        y0: px,
        y1: px,
        y2: px,
    ): void {
        ctx.strokeStyle = `${this.topRulerDrawingConfig.serif.baseColorHex}${percentageToHex(
            this.topRulerDrawingConfig.serif.opacity,
        )}`;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0, y2);
        ctx.stroke();
        const format = topRulerDateFormats[interval];
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const topString = dateFormat(this.vms.tweakT(curTime), format.top);
        const x = Math.round((x0 + x1) / 2);
        const y = Math.round((y0 + y1) / 2);
        const fontFace = 'Roboto, robotoregular, "Helvetica Neue", Arial, sans-serif';

        // ctx.fillText(topString, x, y, x1 - x0);
        const MIN_WIDTH = 100;
        if (x1 - x0 > MIN_WIDTH * this.timeline.canvasGeometry.dpr) {
            ctx.fillStyle = `${this.topRulerDrawingConfig.topLabel.baseColorHex}${percentageToHex(
                this.topRulerDrawingConfig.topLabel.opacity,
            )}`;
            ctx.font = `${
                this.topRulerDrawingConfig.topLabel.fontSize * this.timeline.canvasGeometry.dpr
            }px ${fontFace}`;
            ctx.fillText(topString, x, y); // maxWidth: x1 - x0);
        }

        if (x0 > 0 && x0 < this.timeline.canvasGeometry.width) {
            const serifString = dateFormat(this.vms.tweakT(curTime), format.serif);
            ctx.fillStyle = `${
                this.topRulerDrawingConfig.bottomLabel.baseColorHex
            }${percentageToHex(this.topRulerDrawingConfig.bottomLabel.opacity)}`;
            ctx.font = `${
                this.topRulerDrawingConfig.bottomLabel.fontSize * this.timeline.canvasGeometry.dpr
            }px ${fontFace}`;
            ctx.textBaseline = 'top';
            ctx.fillText(serifString, x0, y2 + this.timeline.canvasGeometry.dpr * 10);
        }
    }
}
