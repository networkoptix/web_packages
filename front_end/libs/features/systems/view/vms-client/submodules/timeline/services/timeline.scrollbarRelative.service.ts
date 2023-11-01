import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { float, ms, px, sign } from '@view/datatypes/type-aliases';

import { calcOffsetX } from '../calculate-coordinates';

import { TimelineService } from './timeline.service';
import type { TimelineScrollbarRelativeServiceStatus } from './timeline.services.types';

// const SCROLL_TRESHOLD_MS = 10;

@Injectable({
    providedIn: 'root',
})
export class TimelineScrollbarRelativeService {
    constructor(private timeline: TimelineService) {
        this.timeline.subject.subscribe(this.emit.bind(this));
    }

    subject = new BehaviorSubject<TimelineScrollbarRelativeServiceStatus>({
        magnification: 1.0,
        offset: 0.0,
        canScrollLeft: false,
        canScrollRight: false,
    });

    private emit(): void {
        this.subject.next({
            magnification: this.magnification,
            offset: this.offset,
            canScrollLeft: this.canScrollLeft,
            canScrollRight: this.canScrollRight,
        });
    }

    get offset(): px {
        return Math.max(
            0,
            Math.min(
                (this.timeline.targetScrollMs - this.timeline.fullRange.start) /
                    this.timeline.fullRange.duration,
                1.0 - 1 / this.magnification,
            ),
        );
    }

    get magnification(): float {
        return this.timeline.fullRange.duration / this.timeline.visibleRange.duration;
    }

    get canScrollLeft(): boolean {
        return this.timeline.visibleRange.start > this.timeline.fullRange.start;
        // return this.timeline.visibleRange.start - this.timeline.fullRange.start > SCROLL_TRESHOLD_MS;
    }

    get canScrollRight(): boolean {
        return this.timeline.fullRange.end > this.timeline.visibleRange.end;
        // return this.timeline.fullRange.end - this.timeline.visibleRange.end > SCROLL_TRESHOLD_MS;
    }

    handleBarDblClick(e: MouseEvent | TouchEvent): void {
        e.preventDefault();
        this.timeline.fullZoomOut();
    }

    private isBackgroundMouseDown: boolean = false;
    private holdScrollTargetTime: ms = -1;
    private timestampMouseDown: ms;
    private scrollDirection: sign = 0;

    handleBackgroundMouseDown(e: MouseEvent): void {
        this.isBackgroundMouseDown = true;
        this.timestampMouseDown = Date.now();
        this.holdScrollTargetTime = this.targetTimeFromMouseEvent(e);
        this.scrollDirection =
            calcOffsetX(e) <
            (this.offset * this.timeline.canvasGeometry.width) / this.timeline.canvasGeometry.dpr
                ? -1
                : +1;
    }

    handleBackgroundMouseUp(e: MouseEvent | TouchEvent): void {
        this.isBackgroundMouseDown = false;
        this.holdScrollTargetTime = -1;
        const sinceMouseDown: ms = Date.now() - this.timestampMouseDown;
        const edgeTimeSinceMouseDown: ms = 200;
        if (sinceMouseDown < edgeTimeSinceMouseDown) {
            // console.log(sinceMouseDown, 'jump one screen', this._scrollDirection)
            this.timeline.jumpScrollTo(
                this.timeline.visibleRange.start +
                    this.timeline.visibleRange.duration * this.scrollDirection,
                true,
            );
        } else {
            // console.log('normal mouse up')
        }
    }

    handleButtonLeftMouseDown(): void {
        this.isBackgroundMouseDown = true;
        this.holdScrollTargetTime = this.timeline.fullRange.start;
    }

    handleButtonRightMouseDown(): void {
        this.isBackgroundMouseDown = true;
        this.holdScrollTargetTime =
            this.timeline.fullRange.end - this.timeline.visibleRange.duration;
    }

    updateIfMouseIsDown(): void {
        if (this.isBackgroundMouseDown) {
            this.timeline.stepScrollToStartTime(this.holdScrollTargetTime);
            this.emit();
        }
    }

    handleBackgroundDblClick(e: MouseEvent | TouchEvent): void {
        this.isBackgroundMouseDown = false;
        const targetTime = this.targetTimeFromMouseEvent(e);
        this.timeline.jumpScrollTo(targetTime, true);
        this.emit();
    }

    handleButtonLeftDblClick(): void {
        this.timeline.jumpScrollTo(this.timeline.fullRange.start, true);
        this.emit();
    }

    handleButtonRightDblClick(): void {
        this.timeline.jumpScrollTo(
            this.timeline.fullRange.end - this.timeline.visibleRange.duration,
            true,
        );
        this.emit();
    }

    private targetTimeFromMouseEvent(e: MouseEvent | TouchEvent): ms {
        return Math.round(
            this.timeline.fullRange.start +
                this.timeline.fullRange.duration *
                    (calcOffsetX(e) / (e.target as HTMLElement).clientWidth) -
                this.timeline.visibleRange.duration * 0.5,
        );
    }
}
