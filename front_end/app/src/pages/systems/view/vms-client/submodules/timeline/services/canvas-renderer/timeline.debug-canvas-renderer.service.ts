import { Injectable } from '@angular/core';

import { VideoManagementSystemService } from '@vms-client/submodules/vms/services/vms.service';

import { TimelineService } from '../timeline.service';

import { cfg } from './drawingConfigs/recordsDrawingConfig';

@Injectable({
    providedIn: 'root'
})
export class TimelineDebugCanvasRendererService {
    constructor(
        protected timeline: TimelineService,
        protected vms: VideoManagementSystemService
    ) {
    }

    protected get cfg() {
        return cfg;
    }

    public render(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        this._renderTimeZoneOffset(ctx);
        ctx.restore();
    }

    protected _renderTimeZoneOffset(ctx: CanvasRenderingContext2D): void {
        const offsetMs = this.vms.timeZoneOffset;
        const offsetH = offsetMs / (60 * 60 * 1000);
        const x = this.timeline.canvasGeometry.width / 2;
        const y = this.timeline.canvasGeometry.height / 2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(0, 0, 0, 150)';
        const fontFace = 'Roboto, Arial, sans-serif';
        const fontSize = 20 * this.timeline.canvasGeometry.dpr;
        ctx.font = `${fontSize}px ${fontFace}`;
        ctx.fillText(`TZO ${offsetH}h`, x, y);
    }
}
