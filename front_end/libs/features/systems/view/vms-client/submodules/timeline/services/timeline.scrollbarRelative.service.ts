import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { calcOffsetX } from '@vms-client/utils/calculate-coordinates';
import { float, ms, px, sign } from '@vms-client/utils/type-aliases';

import { TimelineService } from './timeline.service';
import type { TimelineScrollbarRelativeServiceStatus } from './timeline.services.types';

// const SCROLL_TRESHOLD_MS = 10;

@Injectable({
    providedIn: 'root',
})
export class TimelineScrollbarRelativeService {
    constructor(protected timeline: TimelineService) {
        this.timeline.subject.subscribe(this._emit.bind(this));
    }

    protected _subject = new BehaviorSubject<TimelineScrollbarRelativeServiceStatus>({
        magnification: 1.0,
        offset: 0.0,
        canScrollLeft: false,
        canScrollRight: false,
    });

    protected _emit(): void {
        this._subject.next({
            magnification: this.magnification,
            offset: this.offset,
            canScrollLeft: this.canScrollLeft,
            canScrollRight: this.canScrollRight,
        });
    }

    public get subject(): BehaviorSubject<TimelineScrollbarRelativeServiceStatus> {
        return this._subject;
    }

    public get offset(): px {
        return Math.max(
            0,
            Math.min(
                (this.timeline.targetScrollMs - this.timeline.fullRange.start) /
                    this.timeline.fullRange.duration,
                1.0 - 1 / this.magnification,
            ),
        );
    }

    public get magnification(): float {
        return this.timeline.fullRange.duration / this.timeline.visibleRange.duration;
    }

    public get canScrollLeft(): boolean {
        return this.timeline.visibleRange.start > this.timeline.fullRange.start;
        // return this.timeline.visibleRange.start - this.timeline.fullRange.start > SCROLL_TRESHOLD_MS;
    }

    public get canScrollRight(): boolean {
        return this.timeline.fullRange.end > this.timeline.visibleRange.end;
        // return this.timeline.fullRange.end - this.timeline.visibleRange.end > SCROLL_TRESHOLD_MS;
    }

    public handleBarDblClick(e: MouseEvent | TouchEvent): void {
        e.preventDefault();
        this.timeline.fullZoomOut();
    }

    protected isBackgroundMouseDown: boolean = false;
    private holdScrollTargetTime: ms = -1;
    protected _timestampMouseDown: ms;
    protected _scrollDirection: sign = 0;

    public handleBackgroundMouseDown(e: MouseEvent): void {
        this.isBackgroundMouseDown = true;
        this._timestampMouseDown = Date.now();
        this.holdScrollTargetTime = this._targetTimeFromMouseEvent(e);
        this._scrollDirection =
            calcOffsetX(e) <
            (this.offset * this.timeline.canvasGeometry.width) / this.timeline.canvasGeometry.dpr
                ? -1
                : +1;
    }

    public handleBackgroundMouseUp(e: MouseEvent | TouchEvent): void {
        this.isBackgroundMouseDown = false;
        this.holdScrollTargetTime = -1;
        const sinceMouseDown: ms = Date.now() - this._timestampMouseDown;
        const edgeTimeSinceMouseDown: ms = 200;
        if (sinceMouseDown < edgeTimeSinceMouseDown) {
            // console.log(sinceMouseDown, 'jump one screen', this._scrollDirection)
            this.timeline.jumpScrollTo(
                this.timeline.visibleRange.start +
                    this.timeline.visibleRange.duration * this._scrollDirection,
                true,
            );
        } else {
            // console.log('normal mouse up')
        }
    }

    public handleButtonLeftMouseDown(): void {
        this.isBackgroundMouseDown = true;
        this.holdScrollTargetTime = this.timeline.fullRange.start;
    }

    public handleButtonRightMouseDown(): void {
        this.isBackgroundMouseDown = true;
        this.holdScrollTargetTime =
            this.timeline.fullRange.end - this.timeline.visibleRange.duration;
    }

    public updateIfMouseIsDown(): void {
        if (this.isBackgroundMouseDown) {
            this.timeline.stepScrollToStartTime(this.holdScrollTargetTime);
            this._emit();
        }
    }

    public handleBackgroundDblClick(e: MouseEvent | TouchEvent): void {
        this.isBackgroundMouseDown = false;
        const targetTime = this._targetTimeFromMouseEvent(e);
        this.timeline.jumpScrollTo(targetTime, true);
        this._emit();
    }

    public handleButtonLeftDblClick(): void {
        this.timeline.jumpScrollTo(this.timeline.fullRange.start, true);
        this._emit();
    }

    public handleButtonRightDblClick(): void {
        this.timeline.jumpScrollTo(
            this.timeline.fullRange.end - this.timeline.visibleRange.duration,
            true,
        );
        this._emit();
    }

    protected _targetTimeFromMouseEvent(e: MouseEvent | TouchEvent): ms {
        return Math.round(
            this.timeline.fullRange.start +
                this.timeline.fullRange.duration *
                    (calcOffsetX(e) / (e.target as HTMLElement).clientWidth) -
                this.timeline.visibleRange.duration * 0.5,
        );
    }
}
