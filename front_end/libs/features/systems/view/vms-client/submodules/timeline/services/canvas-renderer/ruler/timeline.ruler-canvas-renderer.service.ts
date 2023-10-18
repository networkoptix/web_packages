import { Injectable } from '@angular/core';

import { TimelinePrimaryRulerCanvasRendererService } from './timeline.primary-ruler-canvas-renderer.service';
import { TimelineTopRulerCanvasRendererService } from './timeline.top-ruler-canvas-renderer.service';

@Injectable({
    providedIn: 'root',
})
export class TimelineRulerCanvasRendererService {
    constructor(
        private primaryRenderer: TimelinePrimaryRulerCanvasRendererService,
        private topRenderer: TimelineTopRulerCanvasRendererService,
    ) {}

    render(ctx: CanvasRenderingContext2D): void {
        this.topRenderer.reset();
        this.primaryRenderer.render(ctx, this.topRenderer.interval);
        this.topRenderer.render(ctx);
    }
}
