import { Injectable } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { BehaviorSubject } from 'rxjs';

import { NxSystem } from '@services/system.service/system';
import type { PlayingState } from '@view/datatypes/PlaybackState';
import { ms, px } from '@view/datatypes/type-aliases';
import { PlaybackService } from '@view/services/playback.service';
import { VideoManagementSystemService } from '@view/services/vms.service';

import { TimeRange } from './TimeRange';
import { TimelineService } from './timeline.service';
import type { TimelineSelectionServiceStatus } from './timeline.services.types';
import { SELECTION_DRAG_MODE } from './timeline.services.types';

const MIN_SELECTION_WIDTH_PX = 5;
const PLAYBACK_OVERLAY_THRESHOLD_PX = 5;

@UntilDestroy()
@Injectable({
    providedIn: 'root',
})
export class TimelineSelectionService {
    isActive: boolean = false;
    private selectedRange: TimeRange = new TimeRange(0, 0);

    private hoverMode: boolean = false;
    private dragMode: SELECTION_DRAG_MODE = SELECTION_DRAG_MODE.NO_DRAGGING;
    private dragAnchorPx: px = 0;
    private dragAnchorMs: ms = 0;

    constructor(
        private timeline: TimelineService,
        private playback: PlaybackService,
        private vms: VideoManagementSystemService,
    ) {}

    get exportUrlParams(): Parameters<NxSystem['mediaserver']['getExportUrl']>[0] {
        return {
            transport: this.playback.state.transport,
            cameraId: this.vms.selectedCamera.id,
            pos: this.selectedRange.start,
            endPos: this.selectedRange.end,
            duration: Math.floor(this.selectedRange.duration / 1000),
        };
    }

    subject = new BehaviorSubject<TimelineSelectionServiceStatus>({
        isActive: false,
        range: new TimeRange(0, 0),
        pixelRange: { left: 0, right: 0 },
        dragMode: SELECTION_DRAG_MODE.NO_DRAGGING,
        hoverMode: false,
    });

    get range(): TimeRange {
        return this.selectedRange.clone();
    }

    set range(r: Pick<TimeRange, 'start' | 'end'>) {
        this.selectedRange.start = r.start;
        this.selectedRange.end = r.end;
        this.emit();
    }

    fitStart(): void {
        this.selectedRange.fitStart(this.timeline.fullRange);
        this.emit();
    }

    fitEnd(): void {
        this.selectedRange.fitEnd(this.timeline.fullRange);
        this.emit();
    }

    private emit(): void {
        this.subject.next({
            isActive: this.isActive,
            range: this.range,
            pixelRange: {
                left: this.timeline.timeToDomOffsetX(this.range.start),
                right: this.timeline.timeToDomOffsetX(this.range.end),
            },
            dragMode: this.dragMode,
            hoverMode: this.hoverMode,
        });
    }

    background: HTMLElement;

    private getOffsetPx(e: MouseEvent): number {
        return e.clientX - this.background.getBoundingClientRect().left;
    }

    handleBackgroundMouseDown(e: MouseEvent): void {
        // activate
        this.isActive = true;
        this.playback.pause();

        if (this.dragMode === SELECTION_DRAG_MODE.NO_DRAGGING) {
            e.preventDefault();
            e.stopPropagation();
            this.dragMode = SELECTION_DRAG_MODE.DRAGGING_BACKGROUND;
            this.dragAnchorPx = this.getOffsetPx(e);
            const mouseTime = this.timeline.domOffsetXtoTime(this.dragAnchorPx);
            const playbackTime = (this.playback.state as PlayingState)?.currentTime || Infinity;
            const diff_ms = Math.abs(mouseTime - playbackTime);
            const diff_px = this.timeline.durationToDomWidth(diff_ms);
            if (diff_px < PLAYBACK_OVERLAY_THRESHOLD_PX) {
                this.selectedRange.start = playbackTime;
                this.selectedRange.end = playbackTime;
            } else {
                this.selectedRange.start = mouseTime;
                this.selectedRange.end = mouseTime;
            }
            this.dragAnchorMs = this.selectedRange.start;
        } else {
            console.warn('mouse down while already dragging', this.dragMode);
        }

        this.emit();
    }

    handleLeftEarMouseDown(e: MouseEvent): void {
        e.preventDefault();
        e.stopPropagation();
        this.playback.pause();
        if (this.dragMode === SELECTION_DRAG_MODE.NO_DRAGGING) {
            this.dragMode = SELECTION_DRAG_MODE.DRAGGING_LEFT_EAR;
            this.dragAnchorPx = e.clientX;
            this.dragAnchorMs = this.selectedRange.start;
            // console.log('left ear drag started', this._dragAnchorPx, this._dragAnchorMs)
        }
    }

    handleRightEarMouseDown(e: MouseEvent): void {
        e.preventDefault();
        e.stopPropagation();
        this.playback.pause();
        if (this.dragMode === SELECTION_DRAG_MODE.NO_DRAGGING) {
            this.dragMode = SELECTION_DRAG_MODE.DRAGGING_RIGHT_EAR;
            this.dragAnchorPx = e.clientX;
            this.dragAnchorMs = this.selectedRange.end;
        }
    }

    handleEarMouseInOut(status: boolean): void {
        this.hoverMode = status;
        this.emit();
    }

    handleMouseMove(e: MouseEvent): boolean {
        if (this.isActive && this.dragMode) {
            if (this.dragMode === SELECTION_DRAG_MODE.DRAGGING_BACKGROUND) {
                const offsetPx = this.getOffsetPx(e);
                const time = this.timeline.domOffsetXtoTime(offsetPx);

                if (time < this.dragAnchorMs) {
                    this.selectedRange.start = time;
                    this.selectedRange.end = this.dragAnchorMs;
                } else {
                    this.selectedRange.end = time;
                    this.selectedRange.start = this.dragAnchorMs;
                }

                this.emit();
                // Keep this just in case UX change their mind ... again
                // } else if (this._dragMode === SELECTION_DRAG_MODE.DRAGGING_SELECTED_RANGE) {
                //     const offsetPx = this._getOffsetPx(e) - this._dragAnchorPx;
                //     const timeUnderMouse = this.timeline.domOffsetXtoTime(offsetPx);
                //     const leftEdgeFits = this.timeline.archiveRange.contains(timeUnderMouse);
                //     const rightEdgeFits = this.timeline.archiveRange.contains(
                //         timeUnderMouse + this._selectedRange.duration
                //     );
                //     if (offsetPx < 0) {
                //         if (leftEdgeFits) {
                //             this._selectedRange.moveStartTo(timeUnderMouse);
                //         } else {
                //             this._selectedRange.moveStartTo(
                //                 this.timeline.archiveRange.start
                //             );
                //         }
                //     } else if (offsetPx > 0) {
                //         if (rightEdgeFits) {
                //             this._selectedRange.moveStartTo(timeUnderMouse);
                //         } else {
                //             this._selectedRange.moveStartTo(
                //                 this.timeline.archiveRange.end - this._selectedRange.duration
                //             );
                //         }
                //     }
                //     this._emit();
            } else if (this.dragMode === SELECTION_DRAG_MODE.DRAGGING_LEFT_EAR) {
                const offsetPx = this.getOffsetPx(e);
                const newStart = this.timeline.domOffsetXtoTime(offsetPx);

                if (newStart < this.selectedRange.end) {
                    this.selectedRange.start = newStart;
                } else {
                    this.dragMode = SELECTION_DRAG_MODE.DRAGGING_RIGHT_EAR;
                    const oldEnd = this.selectedRange.end;
                    this.selectedRange.end = newStart;
                    this.selectedRange.start = oldEnd;
                }

                this.emit();
            } else if (this.dragMode === SELECTION_DRAG_MODE.DRAGGING_RIGHT_EAR) {
                const offsetPx = this.getOffsetPx(e);
                const newEnd = this.timeline.domOffsetXtoTime(offsetPx);

                if (newEnd > this.selectedRange.start) {
                    this.selectedRange.end = newEnd;
                } else {
                    this.dragMode = SELECTION_DRAG_MODE.DRAGGING_LEFT_EAR;
                    const oldStart = this.selectedRange.start;
                    this.selectedRange.start = newEnd;
                    this.selectedRange.end = oldStart;
                }

                this.emit();
            }
            return true;
        } else {
            return false;
        }
    }

    private snapToPlaybackTime(t: ms): ms {
        const playbackTime = (this.playback.state as PlayingState)?.currentTime || Infinity;
        const diff_ms = Math.abs(t - playbackTime);
        const diff_px = this.timeline.durationToDomWidth(diff_ms);
        if (diff_px < PLAYBACK_OVERLAY_THRESHOLD_PX) {
            return playbackTime;
        } else {
            return t;
        }
    }

    private snapStartToPlayback(): boolean {
        const s = this.selectedRange.start;
        this.selectedRange.start = this.snapToPlaybackTime(s);
        return s !== this.selectedRange.start; // Snapped to start
    }

    private snapEndToPlayback(): boolean {
        const e = this.selectedRange.end;
        this.selectedRange.end = this.snapToPlaybackTime(e);
        return e !== this.selectedRange.end; // Snapped to end
    }

    private snapRangeEdgesToPlayback(): void {
        // TODO: Refactor this
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        this.snapStartToPlayback() || this.snapEndToPlayback();
    }

    handleMouseUp(): boolean {
        let result = true;
        if (
            this.dragMode === SELECTION_DRAG_MODE.DRAGGING_BACKGROUND &&
            this.timeline.durationToDomWidth(this.selectedRange.duration) <= MIN_SELECTION_WIDTH_PX
        ) {
            this.reset();
            result = false;
            // console.log('hmuRes', this.rangeText, this.range)
        } else {
            this.snapRangeEdgesToPlayback();
            this.emit();
        }
        // console.log('hmuAfter', this.range)
        this.dragMode = SELECTION_DRAG_MODE.NO_DRAGGING;
        return result;
    }

    reset(): void {
        this.isActive = false;
        this.selectedRange = new TimeRange(0, 0);
        this.emit();
    }
}
