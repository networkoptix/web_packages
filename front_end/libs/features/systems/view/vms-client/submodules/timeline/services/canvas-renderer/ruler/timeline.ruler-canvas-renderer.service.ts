import { Injectable } from '@angular/core';

import { TimelinePrimaryRulerCanvasRendererService } from './timeline.primary-ruler-canvas-renderer.service';
import { TimelineTopRulerCanvasRendererService } from './timeline.top-ruler-canvas-renderer.service';

@Injectable({
    providedIn: 'root'
})
export class TimelineRulerCanvasRendererService {
    constructor(
        protected primaryRenderer: TimelinePrimaryRulerCanvasRendererService,
        protected topRenderer: TimelineTopRulerCanvasRendererService,
    ) {}

    public render(ctx: CanvasRenderingContext2D): void {
        this.topRenderer.reset();
        this.primaryRenderer.render(ctx, this.topRenderer.getInterval());
        this.topRenderer.render(ctx);
    }
}
