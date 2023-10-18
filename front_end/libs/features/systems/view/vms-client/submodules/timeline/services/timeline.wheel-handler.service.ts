import { Injectable } from '@angular/core';

import { int, float, px } from '@vms-client/utils/type-aliases';

import { TimelineService } from './timeline.service';
import { TimelineTimeUnderMouseService } from './timeline.time-under-mouse.service';

@Injectable({
    providedIn: 'root',
})
export class TimelineWheelHandlerService {
    constructor(
        private timeline: TimelineService,
        private timeUnderMouse: TimelineTimeUnderMouseService,
    ) {}

    handleWheel(e: WheelEvent): void {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
            this.wheelScroll(e.deltaX);
        } else {
            this.wheelZoom(e);
        }
        this.timeUnderMouse.handleMouseMove(e);
    }

    private sanitizeOffset(offset: number): number {
        if (offset > 0) {
            if (this.timeline.visibleRange.end + offset > this.timeline.fullRange.end) {
                offset = this.timeline.fullRange.end - this.timeline.visibleRange.end;
            }
        } else {
            if (this.timeline.visibleRange.start + offset < this.timeline.fullRange.start) {
                offset = this.timeline.fullRange.start - this.timeline.visibleRange.start;
            }
        }
        return offset;
    }

    wheelScroll(delta: int): void {
        const step = 0.01;
        const offset = this.sanitizeOffset(
            Math.round(delta * step * this.timeline.visibleRange.duration),
        );
        this.timeline.shiftVisibleRange(offset);
    }

    private wheelZoom(e: WheelEvent): void {
        const delta: int = -e.deltaY;
        const edgeOffsetPx: px = 80;
        let offset: float;
        // console.log('wheel', e.offsetX, this.timeline.canvasGeometry.width, edgeOffsetPx, (this.timeline.canvasGeometry.width / this.timeline.canvasGeometry.dpr - edgeOffsetPx))
        if (e.offsetX < edgeOffsetPx) {
            offset = 0;
            // console.log('left edge')
        } else if (
            e.offsetX >
            this.timeline.canvasGeometry.width / this.timeline.canvasGeometry.dpr - edgeOffsetPx
        ) {
            offset = 1.0;
            // console.log('right edge')
        } else {
            offset =
                e.offsetX / (this.timeline.canvasGeometry.width / this.timeline.canvasGeometry.dpr);
            // console.log('normal')
        }
        const duration = this.timeline.visibleRange.duration;
        const MIN_DURATION = this.timeline.canvasGeometry.width * this.timeline.canvasGeometry.dpr;
        const step = 0.002;
        let durationDelta = duration * step * delta;
        const d2 = duration - durationDelta;
        if (d2 < MIN_DURATION) {
            durationDelta = d2;
        }
        this.timeline.zoom(durationDelta, offset);
    }
}
