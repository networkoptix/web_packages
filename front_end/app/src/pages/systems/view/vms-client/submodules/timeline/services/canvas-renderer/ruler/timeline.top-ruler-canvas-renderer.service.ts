import { Injectable } from '@angular/core';
import * as df from 'dateformat';
import TimelineService from '../../timeline.service';
import IrregularLengthInterval from './intervals/IrregularLengthInterval';
import irregularLengthIntervals from './intervals/irregularLengthIntervals';
import estimateIrregularLengthIntervalPessimistically
    from './intervals/utils/estimateIrregularLengthIntervalPessimistically';
import TOP__MIN_WIDTH_FOR_INTERVALS from './intervals/cfg/TOP__MIN_WIDTH_FOR_INTERVALS';
import { ms, px } from '../../../../../utils/type-aliases';
import drawingConfig from './drawingConfigs/topRulerDrawingConfig';
import cfg from '../../timeline.config';
import topRulerDateFormats from './dateformats/top_ruler_date_formats';
import percentageToHex from './utils/percentageToHex';

import isIntervalOdd from './intervals/utils/isIntervalOdd';
import VideoManagementSystemService from '../../../../vms/services/vms.service';

const dateformat = df.default || df;

@Injectable({
    providedIn: 'root'
})
export class TimelineTopRulerCanvasRendererService {
    constructor(
        protected timeline: TimelineService,
        protected vms: VideoManagementSystemService,
    ) {
    }

    public render (ctx: CanvasRenderingContext2D) {
        const interval = this.getInterval();
        const serifTimes = this.getSerifTimes()
        // console.log('TOP SERIFS', serifTimes, serifTimes.map(st => new Date(st)))
        this._withContext(ctx, () => {
            const h = this.timeline.canvasGeometry.height * cfg.ruler.top.relativeHeight;

            ctx.fillStyle = drawingConfig.backgroundEvenColor;
            ctx.fillRect(0, 0, this.timeline.canvasGeometry.width, h);

            ctx.strokeStyle = drawingConfig.underscoreColor;
            ctx.beginPath();
            ctx.moveTo(0, h);
            ctx.lineTo(this.timeline.canvasGeometry.width, h);
            ctx.stroke();

            serifTimes.map(
                (time, index, serifTimes) =>
                    this._drawSerif(ctx, interval, time, serifTimes[index - 1], serifTimes[index + 1])
            );
        });
    }

    public reset () {
        this._serifTimes = undefined;
        this._interval = undefined;
    }

    protected _interval: IrregularLengthInterval

    public getInterval () {
        if (!this._interval) {
            this._interval = this._getInterval();
        }
        return this._interval;
    }

    protected _getInterval (): IrregularLengthInterval {
        for (const interval of irregularLengthIntervals) {
            if (interval in TOP__MIN_WIDTH_FOR_INTERVALS) {
                const displayWidth = this.timeline.durationToDomWidth(estimateIrregularLengthIntervalPessimistically(interval));
                const requiredWidth = TOP__MIN_WIDTH_FOR_INTERVALS[interval];
                if (displayWidth >= requiredWidth) {
                    return interval;
                }
            }
        }
    }

    protected _serifTimes: Array<ms>

    public getSerifTimes () {
        if (!this._serifTimes) {
            this._serifTimes = this._getSerifTimes(this.getInterval());
        }
        return this._serifTimes;
    }

    protected _getSerifTimes (interval: IrregularLengthInterval): Array<ms> {
        return interval ? this.timeline.visibleRange.iterate(interval, -this.vms.timeZoneOffset) : [];
    }

    protected _withContext (ctx, actualDrawing: () => void) {
        const oldStrokeStyle = ctx.strokeStyle;
        const oldFillStyle = ctx.fillStyle;
        const oldTextAlign = ctx.textAlign;
        const oldTextBaseline = ctx.textBaseline;
        const oldFont = ctx.font;
        actualDrawing();
        ctx.strokeStyle = oldStrokeStyle;
        ctx.fillStyle = oldFillStyle;
        ctx.textAlign = oldTextAlign;
        ctx.textBaseline = oldTextBaseline;
        ctx.font = oldFont;
    }

    protected _drawSerif (
        ctx: CanvasRenderingContext2D,
        interval: IrregularLengthInterval,
        curTime: ms,
        prevTime: ms,
        nextTime: ms
    ) {
        let x0: px = this.timeline.timeToCanvasOffsetX(curTime);
        const xNext: px = nextTime
            ? this.timeline.timeToCanvasOffsetX(nextTime)
            : x0 + this.timeline.durationToCanvasWidth(estimateIrregularLengthIntervalPessimistically(interval));
        // const xPrev: px = prevTime
        //   ? this.timeline.timeToCanvasOffsetX(prevTime)
        //   : x0 - this.timeline.durationToCanvasWidth(estimateIrregularLengthIntervalPessimistically(interval))
        let x1 = xNext;

        // if (xPrev < 0 && xNext > this.timeline.canvasGeometry.width && x0 < this.timeline.canvasGeometry.width) {
        //   x0 = 0
        //   x1 = this.timeline.canvasGeometry.width
        // }
        if (x0 < 0) {
            x0 = 0;
        }
        if (x1 > this.timeline.canvasGeometry.width) {
            x1 = this.timeline.canvasGeometry.width;
        }

        const y0: px = 0;
        const y1: px = Math.round(cfg.ruler.top.relativeHeight * this.timeline.canvasGeometry.height);
        const y2: px = Math.round(drawingConfig.serif.heightRelative * this.timeline.canvasGeometry.height);

        if (isIntervalOdd(curTime, interval)) {
            ctx.fillStyle = drawingConfig.backgroundOddColor;
            ctx.fillRect(x0, y0, x1 - x0, y1);
        }

        // const MIN_WIDTH = 130 * this.timeline.canvasGeometry.dpr;
        // if (x1 - x0 >= MIN_WIDTH) {
            this._drawSerifText(ctx, interval, curTime, x0, x1, y0, y1, y2);
        // }
    }

    protected _drawSerifText (
        ctx: CanvasRenderingContext2D,
        interval: IrregularLengthInterval,
        curTime: ms,
        x0: px,
        x1: px,
        y0: px,
        y1: px,
        y2: px
    ) {
        ctx.strokeStyle = `${drawingConfig.serif.baseColorHex}${percentageToHex(drawingConfig.serif.opacity)}`;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0, y2);
        ctx.stroke();
        const format = topRulerDateFormats[interval];
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const topString = dateformat(curTime + this.vms.timeZoneOffset, format.top);
        const x = Math.round((x0 + x1) / 2);
        const y = Math.round((y0 + y1) / 2);
        ctx.fillStyle = `${drawingConfig.topLabel.baseColorHex}${percentageToHex(drawingConfig.topLabel.opacity)}`;
        const fontFace = 'Roboto, robotoregular, "Helvetica Neue", Arial, sans-serif';
        ctx.font = `${drawingConfig.topLabel.fontSize * this.timeline.canvasGeometry.dpr}px ${fontFace}`;
        ctx.fillText(topString, x, y, x1 - x0);

        if (x0 > 0 && x0 < this.timeline.canvasGeometry.width) {
            const serifString = dateformat(curTime + this.vms.timeZoneOffset, format.serif);
            ctx.fillStyle = `${drawingConfig.bottomLabel.baseColorHex}${percentageToHex(drawingConfig.bottomLabel.opacity)}`;
            ctx.font = `${drawingConfig.bottomLabel.fontSize * this.timeline.canvasGeometry.dpr}px ${fontFace}`;
            ctx.textBaseline = 'top';
            ctx.fillText(serifString, x0, y2 + this.timeline.canvasGeometry.dpr * 10);
        }
    }
}

export default TimelineTopRulerCanvasRendererService;
