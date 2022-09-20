import {
    Component,
    OnInit,
    HostListener,
    ElementRef,
    ViewChild,
    AfterViewInit,
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import dateFormat from 'dateformat';
import { animationFrameScheduler, interval } from 'rxjs';

import { PLAYBACK_MODE } from '@vms-client/submodules/playback/datatypes/PlaybackState';
import { PlaybackService } from '@vms-client/submodules/playback/services/playback.service';
import {
    TimelineScrollbarRelativeService
} from '@vms-client/submodules/timeline/services/timeline.scrollbarRelative.service';
import { VideoManagementSystemService } from '@vms-client/submodules/vms/services/vms.service';
import { calcOffsetX } from '@vms-client/utils/calculate-coordinates';
import type { ms } from '@vms-client/utils/type-aliases';
import { px } from '@vms-client/utils/type-aliases';

import {
    TimelineSelectionService,
} from '../../services/timeline.selection.service';
import { TimelineService } from '../../services/timeline.service';
import type {
    TimelineServiceStatus,
    TimelineSelectionServiceStatus,
} from '../../services/timeline.services.types';
import { TimelineTimeUnderMouseService } from '../../services/timeline.time-under-mouse.service';
import { TimelineWheelHandlerService } from '../../services/timeline.wheel-handler.service';

const DATE_FORMAT_STRING = 'dd mmmm yyyy';
const TIME_FORMAT_STRING = 'HH:MM:ss';

const PLAYBACK_OVERLAY_THRESHOLD_PX = 5;
const EDGE_SCROLL_STEP = 0.2;
const CLICK_AND_HOLD_TIMEOUT = 250;

enum EDGE_SCROLLING_DIRECTION {
    RIGHT,
    LEFT,
}

enum EDGE_SCROLLING_SPEED {
    NONE = 0,
    SLOW = 1,
    MEDIUM = 2,
    FAST = 3,
}

enum EDGE_SCROLLING_SPEED_POS {
    FAR = 80,
    MID = 40,
    NEAR = 20,
}

@UntilDestroy()
@Component({
    selector: 'nx-timeline-selection',
    templateUrl: './timeline-selection.component.html',
    styleUrls: ['./timeline-selection.component.scss']
})
export class TimelineSelectionComponent implements OnInit, AfterViewInit {
    protected selectionStatus: TimelineSelectionServiceStatus;

    public hideLeftEar: boolean = false;
    public hideRightEar: boolean = false;

    private selectionMode: boolean;

    leftDate: string = '';
    leftTime: string = '';
    rightDate: string = '';
    rightTime: string = '';
    host: HTMLElement;

    left: number;
    right: number;
    duration: number;
    offset: number;
    _lastMouseMoveEvent: MouseEvent;

    private clickAndHoldHandler;

    @ViewChild('selectedRange')
    protected selectedRangeView: ElementRef<HTMLDivElement>;

    @ViewChild('leftEar')
    protected leftEarView: ElementRef<HTMLDivElement>;

    @ViewChild('rightEar')
    protected rightEarView: ElementRef<HTMLDivElement>;

    private dateStrings(): void {
        if (!this.selectionStatus || !this.selectionStatus.isActive) {
            this.leftDate = '';
            this.leftTime = '';
            this.rightDate = '';
            this.rightTime = '';
        } else {
            const tweakedTStart = this.vms.tweakT(this.selectionStatus.range.start);
            const tweakedTEnd = this.vms.tweakT(this.selectionStatus.range.end);
            this.leftDate = dateFormat(tweakedTStart, DATE_FORMAT_STRING);
            this.leftTime = dateFormat(tweakedTStart, TIME_FORMAT_STRING);
            this.rightDate = dateFormat(tweakedTEnd, DATE_FORMAT_STRING);
            this.rightTime = dateFormat(tweakedTEnd, TIME_FORMAT_STRING);
        }
    }

    constructor(
        private self: ElementRef,
        private vms: VideoManagementSystemService,
        protected timeline: TimelineService,
        protected selection: TimelineSelectionService,
        private scroll: TimelineScrollbarRelativeService,
        protected playback: PlaybackService,
        protected wheel: TimelineWheelHandlerService,
        protected timeUnderMouse: TimelineTimeUnderMouseService
    ) {
    }

    public ngOnInit(): void {
        this.selection.subject
            .pipe(untilDestroyed(this))
            .subscribe((s: TimelineSelectionServiceStatus) => {
                this.onSelectionSubjectChange(s);
            });

        this.timeline.subject
            .pipe(untilDestroyed(this))
            .subscribe((s: TimelineServiceStatus) => {
                this.onTimelineSubjectChange(s);
            });

        interval(0, animationFrameScheduler)
            .pipe(untilDestroyed(this))
            .subscribe(() => {
                this._onAnimationFrame();
            });
    }

    private scrollTimeline(pos, direction) {
        const speed = this.edgeScrollingSpeed(pos);
        const offset = this.timeline.domWidthToDuration((1 << speed) * 10);
        let target = this.timeline.visibleRange.start;

        target = (direction === EDGE_SCROLLING_DIRECTION.LEFT)
            ? target - offset
            : target + offset;

        if (
            this.timeline.stepScrollToStartTime(
                target,
                EDGE_SCROLL_STEP
            )
        ) {
            this.updateMouseMoveEvent(this._lastMouseMoveEvent);
        }
    }

    private _onAnimationFrame() {
        // @ts-expect-error classname does not exist in EventTarget
        const direction = this._lastMouseMoveEvent?.target.className === 'right-draggable'
            ? EDGE_SCROLLING_DIRECTION.RIGHT
            : EDGE_SCROLLING_DIRECTION.LEFT;

        const canScroll = (direction === EDGE_SCROLLING_DIRECTION.LEFT)
            ? this.scroll.canScrollLeft
            : this.scroll.canScrollRight;

        if (!(this.selectionMode && canScroll)) {
            return;
        }

        const timelineWidth = this.timeline.canvasGeometry.width / this.timeline.canvasGeometry.dpr;
        if (direction === EDGE_SCROLLING_DIRECTION.LEFT) {
            // left going left
            if (this.left < EDGE_SCROLLING_SPEED_POS.FAR) {
                this.scrollTimeline(
                    this.left,
                    EDGE_SCROLLING_DIRECTION.LEFT
                );
            }
            // left going right
            if (timelineWidth - this.left < EDGE_SCROLLING_SPEED_POS.FAR) {
                this.scrollTimeline(
                    this.timeline.canvasGeometry.width - this.left,
                    EDGE_SCROLLING_DIRECTION.RIGHT)
                ;
            }
        }

        if (direction === EDGE_SCROLLING_DIRECTION.RIGHT) {
            this.right = timelineWidth - (this.left + this.duration);
            if (this.right < EDGE_SCROLLING_SPEED_POS.FAR) {
                this.scrollTimeline(
                    this.right,
                    EDGE_SCROLLING_DIRECTION.RIGHT
                );
            }
            if (timelineWidth - this.right < EDGE_SCROLLING_SPEED_POS.FAR) {
                this.scrollTimeline(
                    timelineWidth - this.right,
                    EDGE_SCROLLING_DIRECTION.LEFT
                );
            }
        }
    }

    private distanceToScrollingSpeed(distanceFromEdge: px): EDGE_SCROLLING_SPEED {
        if (distanceFromEdge > EDGE_SCROLLING_SPEED_POS.FAR) {
            return EDGE_SCROLLING_SPEED.NONE;
        }
        if (distanceFromEdge > EDGE_SCROLLING_SPEED_POS.MID) {
            return EDGE_SCROLLING_SPEED.SLOW;
        }
        if (distanceFromEdge > EDGE_SCROLLING_SPEED_POS.NEAR) {
            return EDGE_SCROLLING_SPEED.MEDIUM;
        }
        return EDGE_SCROLLING_SPEED.FAST;
    }

    private edgeScrollingSpeed(pos): EDGE_SCROLLING_SPEED {
        return this.distanceToScrollingSpeed(pos);
    }

    public ngAfterViewInit(): void {
        this.selection.$background = this.self.nativeElement;
        this.selection.leftEar = this.leftEarView.nativeElement;
        this.selection.rightEar = this.rightEarView.nativeElement;
        this.host = this.selectedRangeView.nativeElement.parentElement;
    }

    private _updateCss(): void {
        if (this.selectedRangeView && this.selectionStatus.isActive) {
            this.selectedRangeView.nativeElement.classList.add('active');
            this.left = this.timeline.timeToDomOffsetX(
                this.selectionStatus.range.start
            );
            this.duration = this.timeline.durationToDomWidth(
                this.selectionStatus.range.duration
            );

            this.selectedRangeView.nativeElement.style.left = `${this.left}px`;
            this.selectedRangeView.nativeElement.style.width = `${this.duration}px`;
            this.leftEarView?.nativeElement.classList.toggle(
                'playback',
                this._leftEarOverPlayback
            );
            this.rightEarView?.nativeElement.classList.toggle(
                'playback',
                this._rightEarOverPlayback
            );
        } else if (this.selectedRangeView) {
            this.selectedRangeView.nativeElement.classList.remove('active');
        }
    }

    protected _playbackOverlays(t: ms): boolean {
        if (this.playback.state.mode !== PLAYBACK_MODE.ARCHIVE) {
            return false;
        }
        const duration = Math.abs(t - this.playback.state.currentTime);
        const width = this.timeline.durationToDomWidth(duration);
        return width < PLAYBACK_OVERLAY_THRESHOLD_PX;
    }

    protected get _leftEarOverPlayback(): boolean {
        return this._playbackOverlays(this.selectionStatus.range.start);
    }

    protected get _rightEarOverPlayback(): boolean {
        return this._playbackOverlays(this.selectionStatus.range.end);
    }

    public onSelectionSubjectChange(s: TimelineSelectionServiceStatus): void {
        this.selectionStatus = s;
        if (this.selectionStatus.dragMode) {
            this._updateCss();
            this.dateStrings();
        }
    }

    public onTimelineSubjectChange(s: TimelineServiceStatus): void {
        this._updateCss();
    }

    private play(offsetX): void {
        const time = this.timeline.domOffsetXtoTime(offsetX);
        this.playback.playArchive(time);

        const edgeWidth: px = 80;
        const edgeFixWidth: px = 160;
        const offset: ms = this.timeline.domWidthToDuration(edgeFixWidth);
        if (offsetX < edgeWidth) {
            this.timeline.jumpScrollTo(time - offset, true);
        } else if (offsetX > this.timeline.canvasGeometry.width / this.timeline.canvasGeometry.dpr - edgeWidth) {
            this.timeline.jumpScrollTo(
                time - this.timeline.visibleRange.duration + offset,
                true
            );
        }
    }

    @HostListener('mousedown', ['$event'])
    public mouseSelectionDownHandler(e: MouseEvent): void {
        this.clickAndHoldHandler = setTimeout(() => {
            this.selectionMode = true;
            this.selection.handleBackgroundMouseDown(e);
            clearTimeout(this.clickAndHoldHandler);
        }, CLICK_AND_HOLD_TIMEOUT);
    }

    @HostListener('mouseup', ['$event'])
    public mouseSelectionUpHandler(e: MouseEvent): void {
        if (!this.selectionMode) {
            this.clickAndHoldHandler && clearTimeout(this.clickAndHoldHandler);
            // short click
            const offsetX = calcOffsetX(e);
            this.play(offsetX);
            return;
        }
        this.clickAndHoldHandler && clearTimeout(this.clickAndHoldHandler);
        this.selectionMode = false;
        this.hideLeftEar = this.selectionStatus.isActive;
        this.hideRightEar = this.selectionStatus.isActive;
        this.selection.handleMouseUp(e);
    }

    // @HostListener('document:mouseup', ['$event'])
    // public mouseUpHandler(e: MouseEvent): void {
    //     this.selection.handleMouseUp(e);
    // }

    @HostListener('mouseenter', ['$event'])
    public mouseEnterHandler(e: MouseEvent): void {
        this.timeUnderMouse.handleMouseEnter(e);
    }

    @HostListener('mouseleave', ['$event'])
    public mouseLeaveHandler(e: MouseEvent): void {
        this.selection.handleMouseLeave(e);
        this.timeUnderMouse.handleMouseLeave(e);
    }

    @HostListener('mousemove', ['$event'])
    public mouseMoveHandler(e: MouseEvent): void {
        this._lastMouseMoveEvent = e;
        this.updateMouseMoveEvent(e);
    }

    private updateMouseMoveEvent(e: MouseEvent) {
        // @ts-expect-error
        this.timeUnderMouse.handleMouseMove({
            offsetX:
                (e.target as HTMLElement).getBoundingClientRect().left -
                this.host.getBoundingClientRect().left +
                e.offsetX
        });
        this.selection.handleMouseMove(e);
        if (this.selectionMode) {
            this.hideLeftEar = this.selection.range.duration === 0;
            this.hideRightEar = this.selection.range.duration === 0;
        }
    }

    public selectedRangeMouseDownHandler(e: MouseEvent): void {
        this.selection.reset();
    }

    public selectedRangeDoubleClickHandler(e: MouseEvent): void {
        this.selection.reset();
    }

    public leftEarMouseDownHandler(e: MouseEvent): void {
        this.selection.handleLeftEarMouseDown(e);
        this.hideLeftEar = false;
        this.selectionMode = true;
    }

    public rightEarMouseDownHandler(e: MouseEvent): void {
        this.selection.handleRightEarMouseDown(e);
        this.hideRightEar = false;
        this.selectionMode = true;
    }

    public rightEarMouseInOutHandler(status: boolean): void {
        this.selection.handleEarMouseInOut(status);
        this.hideRightEar = !status;
    }

    public leftEarMouseInOutHandler(status: boolean): void {
        this.selection.handleEarMouseInOut(status);
        this.hideLeftEar = !status;
    }

    @HostListener('wheel', ['$event'])
    public wheelHandler(e: WheelEvent): void {
        e.preventDefault();

        if (e.target !== this.host) {
            // @ts-expect-error
            this.wheel.handleWheel({
                offsetX:
                    (e.target as HTMLElement).getBoundingClientRect().left -
                    this.host.getBoundingClientRect().left +
                    e.offsetX,
                deltaX: e.deltaX,
                deltaY: e.deltaY
            });
        } else {
            this.wheel.handleWheel(e);
        }
    }
}
