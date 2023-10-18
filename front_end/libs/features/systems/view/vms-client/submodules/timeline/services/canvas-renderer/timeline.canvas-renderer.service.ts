import { Injectable, isDevMode } from '@angular/core';

import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';

import { TimelineService } from '../timeline.service';

import { TimelineRulerCanvasRendererService } from './ruler/timeline.ruler-canvas-renderer.service';
import { TimelineDebugCanvasRendererService } from './timeline.debug-canvas-renderer.service';
import { TimelineRecordsCanvasRendererService } from './timeline.records-canvas-renderer.service';

@Injectable({
    providedIn: 'root',
})
export class TimelineCanvasRendererService {
    private CONFIG: IConfig;

    constructor(
        private timeline: TimelineService,
        private rulerRenderer: TimelineRulerCanvasRendererService,
        private recordsRenderer: TimelineRecordsCanvasRendererService,
        configService: NxConfigService,
        private debugRenderer: TimelineDebugCanvasRendererService,
    ) {
        this.CONFIG = configService.getConfig();
    }

    render(ctx: CanvasRenderingContext2D): void {
        ctx.clearRect(
            0,
            0,
            this.timeline.canvasGeometry.width,
            this.timeline.canvasGeometry.height,
        );
        this.rulerRenderer.render(ctx);
        this.recordsRenderer.render(ctx);

        if (isDevMode() && this.CONFIG.allowDebugMode) {
            this.debugRenderer.render(ctx);
        }
    }
}
