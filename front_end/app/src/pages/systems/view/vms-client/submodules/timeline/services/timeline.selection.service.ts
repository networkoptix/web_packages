import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import TimelineService from './timeline.service';
import TimeRange from './TimeRange';
import { ms, px } from '../../../utils/type-aliases';
import PlaybackService from '../../playback/services/playback.service';

const MIN_SELECTION_WIDTH_PX = 2;

enum SELECTION_DRAG_MODE {
    NO_DRAGGING = 0,
    DRAGGING_BACKGROUND = 1,
    DRAGGING_LEFT_EAR = 2,
    DRAGGING_RIGHT_EAR = 3,
    DRAGGING_SELECTED_RANGE = 4,
}

export interface TimelineSelectionServiceStatus {
    isActive: boolean,
    range: TimeRange,
}

@Injectable({
    providedIn: 'root'
})
export class TimelineSelectionService {
    protected _isActive: boolean = false
    protected _selectedRange: TimeRange = new TimeRange(0, 0)

    protected _dragMode: SELECTION_DRAG_MODE = SELECTION_DRAG_MODE.NO_DRAGGING
    protected _dragAnchorPx: px = 0
    protected _dragAnchorMs: ms = 0

    constructor(
        protected timeline: TimelineService,
        protected playback: PlaybackService
    ) {
    }

    protected _subject = new BehaviorSubject<TimelineSelectionServiceStatus>(
        {
            isActive : false,
            range    : new TimeRange(0, 0)
        }
    )

    public get subject () {
        return this._subject;
    }

    public get isActive () {
        return this._isActive;
    }

    public get range () {
        return this._selectedRange.clone();
    }

    protected _emit () {
        this._subject.next({
            isActive : this.isActive,
            range    : this.range
        });
    }

    protected _$background: HTMLElement

    public set $background(b: HTMLElement) {
        this._$background = b;
    }

    protected _getOffsetPx (e: MouseEvent) {
        return e.clientX - this._$background.getBoundingClientRect().left;
    }

    public handleBackgroundMouseDown (e: MouseEvent) {
        this._activate();

        if (this._dragMode === SELECTION_DRAG_MODE.NO_DRAGGING) {
            e.preventDefault();
            e.stopPropagation();
            this._dragMode = SELECTION_DRAG_MODE.DRAGGING_BACKGROUND;
            this._dragAnchorPx = this._getOffsetPx(e);
            this._selectedRange.end = this._selectedRange.start = this.timeline.domOffsetXtoTime(this._dragAnchorPx);
        }

        this._emit();
    }

    public handleSelectedRangeMouseDown (e: MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        if (this._dragMode === SELECTION_DRAG_MODE.NO_DRAGGING) {
            this._dragMode = SELECTION_DRAG_MODE.DRAGGING_SELECTED_RANGE;
            this._dragAnchorPx = e.offsetX;
            this._dragAnchorMs = this._selectedRange.start;
        }
    }

    public handleLeftEarMouseDown (e: MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        if (this._dragMode === SELECTION_DRAG_MODE.NO_DRAGGING) {
            this._dragMode = SELECTION_DRAG_MODE.DRAGGING_LEFT_EAR;
            this._dragAnchorPx = e.clientX;
            this._dragAnchorMs = this._selectedRange.start;
        }
    }

    public handleRightEarMouseDown (e: MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        if (this._dragMode === SELECTION_DRAG_MODE.NO_DRAGGING) {
            this._dragMode = SELECTION_DRAG_MODE.DRAGGING_RIGHT_EAR;
            this._dragAnchorPx = e.clientX;
            this._dragAnchorMs = this._selectedRange.end;
        }
    }

    public handleMouseMove (e: MouseEvent) {
        if (this._isActive) {
            if (this._dragMode === SELECTION_DRAG_MODE.DRAGGING_BACKGROUND) {
                const offsetPx = this._getOffsetPx(e);
                const time = this.timeline.domOffsetXtoTime(offsetPx);
                if (offsetPx < this._dragAnchorPx) {
                    this._selectedRange.start = time;
                } else {
                    this._selectedRange.end = time;
                }
                this._emit();
            } else if (this._dragMode === SELECTION_DRAG_MODE.DRAGGING_SELECTED_RANGE) {
                const offsetPx = this._getOffsetPx(e) - this._dragAnchorPx;
                const timeUnderMouse = this.timeline.domOffsetXtoTime(offsetPx);
                // TODO: handle edges
                this._selectedRange.moveStartTo(timeUnderMouse);
                this._emit();
            } else if (this._dragMode === SELECTION_DRAG_MODE.DRAGGING_LEFT_EAR) {
                const pxDelta = this._dragAnchorPx - e.clientX;
                const msDelta = this.timeline.domWidthToDuration(pxDelta);
                this._selectedRange.start = Math.min(
                    this._selectedRange.end,
                    this._dragAnchorMs - msDelta
                );
                this._emit();
            } else if (this._dragMode === SELECTION_DRAG_MODE.DRAGGING_RIGHT_EAR) {
                const pxDelta = e.clientX - this._dragAnchorPx;
                const msDelta = this.timeline.domWidthToDuration(pxDelta);
                this._selectedRange.end = Math.max(
                    this._selectedRange.start,
                    this._dragAnchorMs + msDelta
                );
                this._emit();
            }
        }
    }

    public handleMouseUp (e: MouseEvent) {
        if (
            this._dragMode === SELECTION_DRAG_MODE.DRAGGING_BACKGROUND &&
            this.timeline.durationToDomWidth(this._selectedRange.duration) <= MIN_SELECTION_WIDTH_PX
        ) {
            this.reset();
        }
        this._dragMode = SELECTION_DRAG_MODE.NO_DRAGGING;
    }

    public handleMouseLeave (e: MouseEvent) {
        this.handleMouseUp(e);
    }

    protected _activate () {
        this._isActive = true;
        this.playback.pause();
    }

    protected _deactivate () {
        this._isActive = false;
    }

    public reset () {
        this._deactivate();
        this._selectedRange = new TimeRange(0, 0);
        this._emit();
    }
}

export default TimelineSelectionService;
