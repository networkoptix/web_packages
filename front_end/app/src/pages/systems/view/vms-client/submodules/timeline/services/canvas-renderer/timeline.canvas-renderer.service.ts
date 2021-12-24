import { Injectable, isDevMode } from '@angular/core';

import { NxConfigService, IConfig } from '@services/nx-config';

import TimelineService from '../timeline.service';

import TimelineRulerCanvasRendererService from './ruler/timeline.ruler-canvas-renderer.service';
import TimelineDebugCanvasRendererService from './timeline.debug-canvas-renderer.service';
import TimelineRecordsCanvasRendererService from './timeline.records-canvas-renderer.service';

@Injectable({
    providedIn: 'root'
})
export class TimelineCanvasRendererService {
    protected CONFIG: IConfig

    constructor(
        protected timeline: TimelineService,
        protected rulerRenderer: TimelineRulerCanvasRendererService,
        protected recordsRenderer: TimelineRecordsCanvasRendererService,
        configService: NxConfigService,
        protected debugRenderer: TimelineDebugCanvasRendererService
    ) {
        this.CONFIG = configService.getConfig();
    }

    public render (ctx: CanvasRenderingContext2D) {
        ctx.clearRect(0, 0, this.timeline.canvasGeometry.width, this.timeline.canvasGeometry.height);
        this.rulerRenderer.render(ctx);
        this.recordsRenderer.render(ctx);

        if (isDevMode() && this.CONFIG.allowDebugMode) {
            this.debugRenderer.render(ctx);
        }
    }
}

export default TimelineCanvasRendererService;
