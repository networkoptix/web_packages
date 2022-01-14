import { Injectable } from '@angular/core';

import VideoManagementSystemService from '@vms-client/submodules/vms/services/vms.service';
import { float, ms } from '@vms-client/utils/type-aliases';

import TimelineService from '../timeline.service';

import cfg from './drawingConfigs/recordsDrawingConfig';
import stripeCfg from './stripy-bar/cfg';
import getSlopeWidth from './stripy-bar/slope';
import drawStripyBar from './stripy-bar/stripy-bar';

@Injectable({
    providedIn: 'root'
})
export class TimelineRecordsCanvasRendererService {
    constructor (
        protected timeline: TimelineService,
        protected vms: VideoManagementSystemService
    ) {
    }

    protected get cfg () {
        return cfg;
    }

    public render (ctx: CanvasRenderingContext2D) {
        ctx.save();
        this._drawBackground(ctx);
        this._drawRecords(ctx);
        ctx.restore();
    }

    protected _drawBackground (ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = this.cfg.BACKGROUND_FILL_STYLE;
        ctx.fillRect(
            0,
            Math.round(
                this.cfg.RECORDS_OFFSET_RELATIVE * this.timeline.canvasGeometry.height
            ),
            this.timeline.canvasGeometry.width,
            Math.round(
                this.cfg.RECORDS_HEIGHT_RELATIVE * this.timeline.canvasGeometry.height
            )
        );
    }

    protected _drawRecords (ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = this.cfg.RECORD_FILL_STYLE;

        if (this.vms.selectedCamera) {
            const startMs: ms = this.timeline.visibleRange.start;
            const endMs: ms = this.timeline.visibleRange.end;
            const pxPerMs: float = 1 / this.timeline.msPerCanvasPx;
            const minGapMs: ms = Math.floor(this.timeline.msPerCanvasPx);
            const records = this.vms.selectedCamera.getRecords(startMs, endMs, minGapMs);

            records.map(r => {
                this._drawRecord(ctx, r, startMs, pxPerMs);
            });

            const LAST_MINUTE_SIZE = 1.5 * 60 * 1000; // 1.5 minutes
            const lastMinuteStartMs: ms = Date.now() - LAST_MINUTE_SIZE;
            if (
                endMs > lastMinuteStartMs &&
                this.timeline.durationToCanvasWidth(LAST_MINUTE_SIZE) > 1
            ) {
                this._drawLastMinuteStripes(ctx, lastMinuteStartMs, pxPerMs);
            }
        }
    }

    protected _drawRecord (ctx, r, startMs, pxPerMs) {
        const x0 = Math.round((r.start - startMs) * pxPerMs);
        let x1 = Math.round((r.end - startMs) * pxPerMs);
        if (x1 - x0 < this.cfg.MIN_RECORD_WIDTH_PX) {
            x1 = x0 + this.cfg.MIN_RECORD_WIDTH_PX;
        }
        const ch = this.timeline.canvasGeometry.height;
        const y = Math.round(this.cfg.RECORDS_OFFSET_RELATIVE * ch);
        const h = Math.round(this.cfg.RECORDS_HEIGHT_RELATIVE * ch);
        const w = x1 - x0;
        ctx.fillRect(x0, y, w, h);
    }

    protected _drawLastMinuteStripes (ctx, lastMinuteStartMs, pxPerMs) {
        const dpr = this.timeline.canvasGeometry.dpr;
        const x = Math.round(
            (lastMinuteStartMs - this.timeline.visibleRange.start) * pxPerMs
        );
        const w = this.timeline.canvasGeometry.width - x;
        const ch = this.timeline.canvasGeometry.height;
        const y = Math.round(this.cfg.RECORDS_OFFSET_RELATIVE * ch);
        const h = Math.round(this.cfg.RECORDS_HEIGHT_RELATIVE * ch);

        drawStripyBar(
            ctx,
            x, y,
            w, h,
            stripeCfg.stripeWidth * dpr,
            getSlopeWidth(stripeCfg.slope, h), // memoized
            stripeCfg.speed * dpr,
            stripeCfg.backgroundColor,
            stripeCfg.stripeColor
        );
    }
}

export default TimelineRecordsCanvasRendererService;
