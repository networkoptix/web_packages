import { Injectable } from '@angular/core';

// import { RecordsConfig } from '@vms-client/submodules/timeline/services/canvas-renderer/drawingConfigs/drowingConfigs.service.types';
import { VideoManagementSystemService } from '@view/services/vms.service';

import { TimelineService } from '../timeline.service';

// import { NxDrawingConfigsService } from './drawingConfigs/drowingConfigs.service';

@Injectable({
    providedIn: 'root',
})
export class TimelineDebugCanvasRendererService {
    constructor(
        private timeline: TimelineService,
        private vms: VideoManagementSystemService, // private drawingConfigsService: NxDrawingConfigsService,
    ) {}

    // get cfg(): RecordsConfig {
    //     return this.drawingConfigsService.recordsDrawingConfig;
    // }

    render(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        this._renderTimeZoneOffset(ctx);
        ctx.restore();
    }

    private _renderTimeZoneOffset(ctx: CanvasRenderingContext2D): void {
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
