/* eslint-disable camelcase */
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { PlaybackService } from '@vms-client/submodules/playback/services/playback.service';
import { VideoManagementSystemService } from '@vms-client/submodules/vms/services/vms.service';
import { ms, px } from '@vms-client/utils/type-aliases';

import { TimeRange } from './TimeRange';
import { TimelineScrollbarRelativeService } from './timeline.scrollbarRelative.service';
import { TimelineService } from './timeline.service';
import type {
    PixelRange,
    TimelineSelectionServiceStatus
} from './timeline.services.types';
import { SELECTION_DRAG_MODE } from './timeline.services.types';

const MIN_SELECTION_WIDTH_PX = 5;
const PLAYBACK_OVERLAY_THRESHOLD_PX = 5;

// const EAR_WIDTH = 120;

enum EDGE_SCROLLING_SPEED {
    NONE = 0,
    SLOW = 1,
    MEDIUM = 2,
    FAST = 3,
}

@Injectable({
    providedIn: 'root'
})
export class TimelineSelectionService {
    protected _isActive: boolean = false;
    protected _selectedRange: TimeRange = new TimeRange(0, 0);

    protected _hoverMode: boolean = false;
    protected _dragMode: SELECTION_DRAG_MODE = SELECTION_DRAG_MODE.NO_DRAGGING;
    protected _dragAnchorPx: px = 0;
    protected _dragAnchorMs: ms = 0;

    constructor(
        protected timeline: TimelineService,
        protected playback: PlaybackService,
        protected scroll: TimelineScrollbarRelativeService,
        protected vms: VideoManagementSystemService
    ) {
        // this.handleTimelineChange = this.handleTimelineChange.bind(this)
        // timeline.subject.subscribe(this.handleTimelineChange)
        this.onAnimationFrame = this.onAnimationFrame.bind(this);
        requestAnimationFrame(this.onAnimationFrame);
    }

    public get exportUrlParams(): Object {
        return {
            transport: this.playback.state.transport,
            cameraId: this.vms.selectedCamera.id,
            pos: this._selectedRange.start,
            endPos: this._selectedRange.end,
            duration: Math.floor(this._selectedRange.duration / 1000)
        };
    }

    protected _subject = new BehaviorSubject<TimelineSelectionServiceStatus>(
        {
            isActive: false,
            range: new TimeRange(0, 0),
            pixelRange: { left: 0, right: 0 },
            dragMode: SELECTION_DRAG_MODE.NO_DRAGGING,
            hoverMode: false,
        }
    );

    public get subject() {
        return this._subject;
    }

    public get isActive() {
        return this._isActive;
    }

    public get range(): TimeRange {
        return this._selectedRange.clone();
    }

    public get rangeText(): string {
        const r = this.range;
        const s = new Date(r.start);
        const e = new Date(r.end);
        return `(${s.toLocaleString()} - ${e.toLocaleString()})`;
    }

    public set range(r: TimeRange) {
        this._selectedRange.start = r.start;
        this._selectedRange.end = r.end;
        this._emit();
    }

    public get pixelRange() {
        return this._pixelRange;
    }

    protected _pixelRange: PixelRange = { left: 0, right: 0 };

    protected updatePixelRange(): void {
        this._pixelRange = {
            left: this.timeline.timeToDomOffsetX(this.range.start),
            right: this.timeline.timeToDomOffsetX(this.range.end)
        };
    }

    // public handleTimelineChange () {
    //     this._selectedRange.start = this.timeline.domOffsetXtoTime(this._pixelRange.left)
    //     this._selectedRange.end = this.timeline.domOffsetXtoTime(this._pixelRange.right)
    //     this._emit()
    // }

    protected _leftEar: HTMLElement;
    public set leftEar(e: HTMLElement) {
        this._leftEar = e;
    }

    protected _rightEar: HTMLElement;
    public set rightEar(e: HTMLElement) {
        this._rightEar = e;
    }

    public get leftEarClientLeft(): px {
        return this._leftEar?.getBoundingClientRect().left || Infinity;
    }

    public get rightEarClientRight(): px {
        return this._rightEar?.getBoundingClientRect().right || Infinity;
    }

    public get leftEarClientRight(): px {
        return this._leftEar?.getBoundingClientRect().right || Infinity;
    }

    public get rightEarClientLeft(): px {
        return this._rightEar?.getBoundingClientRect().left || Infinity;
    }

    protected _emit(): void {
        this.updatePixelRange();
        this._subject.next({
            isActive: this.isActive,
            range: this.range,
            pixelRange: this.pixelRange,
            dragMode: this._dragMode,
            hoverMode: this._hoverMode,
        });
    }

    protected _$background: HTMLElement;

    public set $background(b: HTMLElement) {
        this._$background = b;
    }

    protected _getOffsetPx(e: MouseEvent) {
        return e.clientX - this._$background.getBoundingClientRect().left;
    }

    public handleBackgroundMouseDown(e: MouseEvent): void {
        this._activate();

        if (this._dragMode === SELECTION_DRAG_MODE.NO_DRAGGING) {
            e.preventDefault();
            e.stopPropagation();
            this._dragMode = SELECTION_DRAG_MODE.DRAGGING_BACKGROUND;
            this._dragAnchorPx = this._getOffsetPx(e);
            const mouseTime = this.timeline.domOffsetXtoTime(this._dragAnchorPx);
            // @ts-expect-error
            const playbackTime = this.playback.state?.currentTime || Infinity;
            const diff_ms = Math.abs(mouseTime - playbackTime);
            const diff_px = this.timeline.durationToDomWidth(diff_ms);
            if (diff_px < PLAYBACK_OVERLAY_THRESHOLD_PX) {
                this._selectedRange.start = playbackTime;
                this._selectedRange.end = playbackTime;
            } else {
                this._selectedRange.start = mouseTime;
                this._selectedRange.end = mouseTime;
            }
            this._dragAnchorMs = this._selectedRange.start;
        } else {
            console.warn('mouse down while already dragging', this._dragMode);
        }

        this._emit();
    }

    public handleSelectedRangeMouseDown(e: MouseEvent): void {
        e.preventDefault();
        e.stopPropagation();
        this.playback.pause();
        if (this._dragMode === SELECTION_DRAG_MODE.NO_DRAGGING) {
            this._dragMode = SELECTION_DRAG_MODE.DRAGGING_SELECTED_RANGE;
            this._dragAnchorPx = e.offsetX;
            this._dragAnchorMs = this._selectedRange.start;
        }
    }

    public handleLeftEarMouseDown(e: MouseEvent): void {
        e.preventDefault();
        e.stopPropagation();
        this.playback.pause();
        if (this._dragMode === SELECTION_DRAG_MODE.NO_DRAGGING) {
            this._dragMode = SELECTION_DRAG_MODE.DRAGGING_LEFT_EAR;
            this._dragAnchorPx = e.clientX;
            this._dragAnchorMs = this._selectedRange.start;
            // console.log('left ear drag started', this._dragAnchorPx, this._dragAnchorMs)
        }
    }

    public handleRightEarMouseDown(e: MouseEvent): void {
        e.preventDefault();
        e.stopPropagation();
        this.playback.pause();
        if (this._dragMode === SELECTION_DRAG_MODE.NO_DRAGGING) {
            this._dragMode = SELECTION_DRAG_MODE.DRAGGING_RIGHT_EAR;
            this._dragAnchorPx = e.clientX;
            this._dragAnchorMs = this._selectedRange.end;
        }
    }

    public handleEarMouseInOut(status: boolean): void {
        this._hoverMode = status;
        this._emit();
    }

    protected _lastMouseMove: MouseEvent;

    public handleMouseMove(e: MouseEvent) {
        this._lastMouseMove = e;
        if (this._isActive) {
            if (this._dragMode === SELECTION_DRAG_MODE.DRAGGING_BACKGROUND) {
                const offsetPx = this._getOffsetPx(e);
                const time = this.timeline.domOffsetXtoTime(offsetPx);
                if (time < this._dragAnchorMs) {
                    this._selectedRange.start = time;
                    this._selectedRange.end = this._dragAnchorMs;
                } else {
                    this._selectedRange.end = time;
                    this._selectedRange.start = this._dragAnchorMs;
                }
                this._emit();
            } else if (this._dragMode === SELECTION_DRAG_MODE.DRAGGING_SELECTED_RANGE) {
                // if (this.leftEdgeScrollingSpeed && this.scroll.canScrollLeft) {
                //     return
                // }
                // if (this.rightEdgeScrollingSpeed && this.scroll.canScrollRight) {
                //     return
                // }
                const offsetPx = this._getOffsetPx(e) - this._dragAnchorPx;
                const timeUnderMouse = this.timeline.domOffsetXtoTime(offsetPx);
                const leftEdgeFits = this.timeline.archiveRange.contains(timeUnderMouse);
                const rightEdgeFits = this.timeline.archiveRange.contains(
                    timeUnderMouse + this._selectedRange.duration
                );
                if (offsetPx < 0) {
                    if (leftEdgeFits) {
                        this._selectedRange.moveStartTo(timeUnderMouse);
                    } else {
                        this._selectedRange.moveStartTo(
                            this.timeline.archiveRange.start
                        );
                    }
                } else if (offsetPx > 0) {
                    if (rightEdgeFits) {
                        this._selectedRange.moveStartTo(timeUnderMouse);
                    } else {
                        this._selectedRange.moveStartTo(
                            this.timeline.archiveRange.end - this._selectedRange.duration
                        );
                    }
                }
                this._emit();
            } else if (this._dragMode === SELECTION_DRAG_MODE.DRAGGING_LEFT_EAR) {
                if (this.leftEdgeScrollingSpeed && this.scroll.canScrollLeft) {
                    return;
                }
                const pxDelta = this._dragAnchorPx - e.clientX;
                // // console.log('left ear progress', e.clientX, e.offsetX, e.target, e)
                // const pxDelta = this.leftEarClientRight - e.clientX - (EAR_WIDTH - this._dragAnchorPx);
                // console.log('left px delta', pxDelta, this.leftEarClientRight, e.clientX, (EAR_WIDTH - this._dragAnchorPx), '|', EAR_WIDTH, this._dragAnchorPx)
                const msDelta = this.timeline.domWidthToDuration(pxDelta);
                const newStart = this._dragAnchorMs - msDelta;
                if (newStart < this._selectedRange.end) {
                    this._selectedRange.start = newStart;
                } else {
                    this._dragMode = SELECTION_DRAG_MODE.DRAGGING_RIGHT_EAR;
                    const oldEnd = this._selectedRange.end;
                    this._selectedRange.end = newStart;
                    this._selectedRange.start = oldEnd;
                }
                this._emit();
            } else if (this._dragMode === SELECTION_DRAG_MODE.DRAGGING_RIGHT_EAR) {
                if (this.rightEdgeScrollingSpeed && this.scroll.canScrollRight) {
                    return;
                }
                const pxDelta = e.clientX - this._dragAnchorPx;
                const msDelta = this.timeline.domWidthToDuration(pxDelta);
                // this._selectedRange.end = Math.max(
                //     this._selectedRange.start,
                //     this._dragAnchorMs + msDelta
                // );
                const newEnd = this._dragAnchorMs + msDelta;
                if (newEnd > this._selectedRange.start) {
                    this._selectedRange.end = newEnd;
                } else {
                    this._dragMode = SELECTION_DRAG_MODE.DRAGGING_LEFT_EAR;
                    const oldStart = this._selectedRange.start;
                    this._selectedRange.start = newEnd;
                    this._selectedRange.end = oldStart;
                }
                this._emit();
            }
            return true;
        } else {
            return false;
        }
    }

    protected _snapToPlaybackTime(t) {
        // @ts-expect-error
        const playbackTime = this.playback.state?.currentTime || Infinity;
        const diff_ms = Math.abs(t - playbackTime);
        const diff_px = this.timeline.durationToDomWidth(diff_ms);
        if (diff_px < PLAYBACK_OVERLAY_THRESHOLD_PX) {
            return playbackTime;
        } else {
            return t;
        }
    }

    protected _snapStartToPlayback() {
        const s = this._selectedRange.start;
        this._selectedRange.start = this._snapToPlaybackTime(s);
        return s !== this._selectedRange.start;
    }

    protected _snapEndToPlayback() {
        const e = this._selectedRange.end;
        this._selectedRange.end = this._snapToPlaybackTime(e);
        return e !== this._selectedRange.end;
    }

    protected _snapRangeEdgesToPlayback() {
        return this._snapStartToPlayback() ||
            this._snapEndToPlayback();
    }

    public handleMouseUp(e: MouseEvent) {
        let result = true;
        if (
            this._dragMode === SELECTION_DRAG_MODE.DRAGGING_BACKGROUND &&
            this.timeline.durationToDomWidth(this._selectedRange.duration) <= MIN_SELECTION_WIDTH_PX
        ) {
            this.reset();
            result = false;
            // console.log('hmuRes', this.rangeText, this.range)
        } else {
            this._snapRangeEdgesToPlayback();
            this._emit();
        }
        // console.log('hmuAfter', this.range)
        this._dragMode = SELECTION_DRAG_MODE.NO_DRAGGING;
        return result;
    }

    public handleMouseLeave(e: MouseEvent): void {
        // this.handleMouseUp(e);
    }

    protected _activate(): void {
        this._isActive = true;
        this.playback.pause();
    }

    protected _deactivate(): void {
        this._isActive = false;
    }

    public reset(): void {
        this._deactivate();
        this._selectedRange = new TimeRange(0, 0);
        this._emit();
    }

    protected _animationFrameHandle: number;

    public onAnimationFrame(): void {
        this._animationFrameHandle = requestAnimationFrame(this.onAnimationFrame);
        let speed, offset;
        const STEP = 0.2;
        switch (this._dragMode) {
            case SELECTION_DRAG_MODE.DRAGGING_SELECTED_RANGE:
                if (
                    !(this.leftEdgeScrollingSpeed && this.scroll.canScrollLeft) &&
                    !(this.rightEdgeScrollingSpeed && this.scroll.canScrollRight)
                ) {
                    return;
                }
                if (this.leftEdgeScrollingSpeed) {
                    speed = this.leftEdgeScrollingSpeed;
                    offset = this.timeline.domWidthToDuration((1 << speed) * 10);
                    this.timeline.stepScrollToStartTime(
                        this.timeline.visibleRange.start - offset,
                        STEP
                    );
                }
                if (this.rightEdgeScrollingSpeed) {
                    speed = this.rightEdgeScrollingSpeed;
                    offset = this.timeline.domWidthToDuration((1 << speed) * 10);
                    this.timeline.stepScrollToStartTime(
                        this.timeline.visibleRange.start + offset,
                        STEP
                    );
                }
                this.handleMouseMove(this._lastMouseMove);
                break;
            case SELECTION_DRAG_MODE.DRAGGING_LEFT_EAR:
                // false-positively buggy =(
                if (this.leftEdgeScrollingSpeed && !this.scroll.canScrollLeft) {
                    return;
                }
                if (this.leftEdgeScrollingSpeed) {
                    speed = this.leftEdgeScrollingSpeed;
                    offset = this.timeline.domWidthToDuration((1 << speed) * 10);
                    // console.log('left', speed, offset, this.timeline.durationToDomWidth(offset))
                    if (
                        this.timeline.stepScrollToStartTime(
                            this.timeline.visibleRange.start - offset,
                            STEP
                        )
                    ) {
                        this._selectedRange.start -= offset * STEP;
                        this._dragAnchorMs = this._selectedRange.start;
                        this._dragAnchorPx = this._lastMouseMove.clientX;
                        // // this._dragAnchorPx += this.timeline.durationToDomWidth(offset) * STEP
                        this._emit();
                    }
                    // this.handleLeftEarMouseDown(this._lastMouseMove)
                } else if (this.rightEdgeScrollingSpeed) {
                    speed = this.rightEdgeScrollingSpeed;
                    offset = this.timeline.domWidthToDuration((1 << speed) * 10);
                    if (
                        this.timeline.stepScrollToStartTime(
                            (this.timeline.visibleRange.start + offset),
                            STEP
                        )
                    ) {
                        this._selectedRange.start += offset * STEP;
                        this._dragAnchorMs = this._selectedRange.start;
                        this._dragAnchorPx = this._lastMouseMove.clientX;
                        this._emit();
                    }
                }
                break;
            case SELECTION_DRAG_MODE.DRAGGING_RIGHT_EAR:
                if (this.rightEdgeScrollingSpeed && !this.scroll.canScrollRight) {
                    return;
                }
                if (this.rightEdgeScrollingSpeed) {
                    speed = this.rightEdgeScrollingSpeed;
                    offset = this.timeline.domWidthToDuration((1 << speed) * 10);
                    // console.log('right', speed, offset, this.timeline.durationToDomWidth(offset))
                    if (
                        this.timeline.stepScrollToStartTime(
                            this.timeline.visibleRange.start + offset,
                            STEP
                        )
                    ) {
                        this._selectedRange.end += offset * STEP;
                        this._dragAnchorMs = this._selectedRange.end;
                        this._dragAnchorPx = this._lastMouseMove.clientX;
                        // this._dragAnchorPx -= this.timeline.durationToDomWidth(offset) * STEP
                        this._emit();
                    }
                    // this.handleRightEarMouseDown(this._lastMouseMove)
                } else if (this.leftEdgeScrollingSpeed) {
                    speed = this.leftEdgeScrollingSpeed;
                    offset = this.timeline.domWidthToDuration((1 << speed) * 10);
                    if (
                        this.timeline.stepScrollToStartTime(
                            this.timeline.visibleRange.start - offset,
                            STEP
                        )
                    ) {
                        this._selectedRange.end -= offset * STEP;
                        this._dragAnchorMs = this._selectedRange.end;
                        this._dragAnchorPx = this._lastMouseMove.clientX;
                        this._emit();
                    }
                }
                break;
        }
    }

    public get mouseFromLeftEdge(): px {
        if (!this.isActive) {
            return Infinity;
        }
        return this._lastMouseMove.clientX - this._$background.getBoundingClientRect().left;
        // return this.timeline.timeToDomOffsetX(this._selectedRange.start) - EAR_WIDTH
    }

    public get mouseFromRightEdge(): px {
        if (!this.isActive) {
            return Infinity;
        }
        return this._$background.getBoundingClientRect().right - this._lastMouseMove.clientX;
        // return this.timeline.canvasGeometry.width / this.timeline.canvasGeometry.dpr -
        //     (this.timeline.timeToDomOffsetX(this._selectedRange.end) + EAR_WIDTH * 2)
    }

    protected _distanceToScrollingSpeed(distanceFromEdge: px): EDGE_SCROLLING_SPEED {
        if (distanceFromEdge > 80) {
            return EDGE_SCROLLING_SPEED.NONE;
        }
        if (distanceFromEdge > 40) {
            return EDGE_SCROLLING_SPEED.SLOW;
        }
        if (distanceFromEdge > 20) {
            return EDGE_SCROLLING_SPEED.MEDIUM;
        }
        return EDGE_SCROLLING_SPEED.FAST;
    }

    public get rightEdgeScrollingSpeed(): EDGE_SCROLLING_SPEED {
        return this._distanceToScrollingSpeed(this.mouseFromRightEdge);
    }

    public get leftEdgeScrollingSpeed(): EDGE_SCROLLING_SPEED {
        return this._distanceToScrollingSpeed(this.mouseFromLeftEdge);
    }
}
