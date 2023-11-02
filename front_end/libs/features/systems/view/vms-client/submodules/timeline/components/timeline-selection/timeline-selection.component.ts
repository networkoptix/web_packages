import { DOCUMENT } from '@angular/common';
import {
    Component,
    OnInit,
    HostListener,
    ElementRef,
    ViewChild,
    AfterViewInit,
    Inject,
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import dateFormat from 'dateformat';
import { animationFrameScheduler, interval } from 'rxjs';

import type { ms } from '@view/datatypes/type-aliases';
import { px } from '@view/datatypes/type-aliases';
import { PlaybackService } from '@view/services/playback.service';
import { VideoManagementSystemService } from '@view/services/vms.service';
import { TimelineScrollbarRelativeService } from '@vms-client/submodules/timeline/services/timeline.scrollbarRelative.service';

import { calcOffsetX } from '../../calculate-coordinates';
import { TimelineSelectionService } from '../../services/timeline.selection.service';
import { TimelineService } from '../../services/timeline.service';
import type { TimelineSelectionServiceStatus } from '../../services/timeline.services.types';
import { TimelineTimeUnderMouseService } from '../../services/timeline.time-under-mouse.service';
import { TimelineWheelHandlerService } from '../../services/timeline.wheel-handler.service';

const DATE_FORMAT_STRING = 'dd mmmm yyyy';
const TIME_FORMAT_STRING = 'HH:MM:ss';

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

const MARGIN = 5;
const ARROW_WIDTH = 10;
const PRIMARY_WIDTH = 140;
const WNM = PRIMARY_WIDTH - 2 * MARGIN; // widthNoMargins

@UntilDestroy()
@Component({
    selector: 'nx-timeline-selection',
    templateUrl: './timeline-selection.component.html',
    styleUrls: ['./timeline-selection.component.scss'],
})
export class TimelineSelectionComponent implements OnInit, AfterViewInit {
    private selectionStatus: TimelineSelectionServiceStatus;

    hideLeftEar: boolean = false;
    hideRightEar: boolean = false;

    private selectionMode: boolean;

    leftDate: string = '';
    leftTime: string = '';
    rightDate: string = '';
    rightTime: string = '';
    private host: HTMLElement;

    private left: number;
    private right: number;
    private duration: number;
    private lastMouseMoveEvent: MouseEvent;

    private clickAndHoldHandler: number;

    // Initial values
    private tl = ARROW_WIDTH / 2; // top left vertex
    private tr = ARROW_WIDTH; // top right vertex
    private b = ARROW_WIDTH / 2; // bottom vertex

    @ViewChild('selectedRange')
    private selectedRangeView: ElementRef<HTMLDivElement>;

    @ViewChild('leftEar')
    private leftEarView: ElementRef<HTMLDivElement>;

    @ViewChild('rightEar')
    private rightEarView: ElementRef<HTMLDivElement>;

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
        private timeline: TimelineService,
        private selection: TimelineSelectionService,
        private scroll: TimelineScrollbarRelativeService,
        private playback: PlaybackService,
        private wheel: TimelineWheelHandlerService,
        private timeUnderMouse: TimelineTimeUnderMouseService,
        @Inject(DOCUMENT) private document: Document,
    ) {}

    ngOnInit(): void {
        this.selection.subject.pipe(untilDestroyed(this)).subscribe(s => {
            this.selectionStatus = s;
            this.updateCss();
            this.dateStrings();
        });

        this.timeline.subject.pipe(untilDestroyed(this)).subscribe(s => {
            this.updateCss();
        });

        interval(0, animationFrameScheduler)
            .pipe(untilDestroyed(this))
            .subscribe(() => {
                this.onAnimationFrame();
            });
    }

    private scrollTimeline(pos: number, direction: EDGE_SCROLLING_DIRECTION): void {
        const speed = this.edgeScrollingSpeed(pos);
        const offset = this.timeline.domWidthToDuration((1 << speed) * 10);
        let target = this.timeline.visibleRange.start;

        target = direction === EDGE_SCROLLING_DIRECTION.LEFT ? target - offset : target + offset;

        if (this.timeline.stepScrollToStartTime(target, EDGE_SCROLL_STEP)) {
            this.updateMouseMoveEvent(this.lastMouseMoveEvent);
        }
    }

    private onAnimationFrame(): void {
        const direction =
            // @ts-expect-error classname does not exist in EventTarget
            this.lastMouseMoveEvent?.target.className === 'right-draggable'
                ? EDGE_SCROLLING_DIRECTION.RIGHT
                : EDGE_SCROLLING_DIRECTION.LEFT;

        const canScroll =
            direction === EDGE_SCROLLING_DIRECTION.LEFT
                ? this.scroll.canScrollLeft
                : this.scroll.canScrollRight;

        if (!(this.selectionMode && canScroll)) {
            return;
        }

        const timelineWidth = this.timeline.canvasGeometry.width / this.timeline.canvasGeometry.dpr;
        if (direction === EDGE_SCROLLING_DIRECTION.LEFT) {
            // left going left
            if (this.left < EDGE_SCROLLING_SPEED_POS.FAR) {
                this.scrollTimeline(this.left, EDGE_SCROLLING_DIRECTION.LEFT);
            }
            // left going right
            if (timelineWidth - this.left < EDGE_SCROLLING_SPEED_POS.FAR) {
                this.scrollTimeline(
                    this.timeline.canvasGeometry.width - this.left,
                    EDGE_SCROLLING_DIRECTION.RIGHT,
                );
            }
        }

        if (direction === EDGE_SCROLLING_DIRECTION.RIGHT) {
            this.right = timelineWidth - (this.left + this.duration);
            if (this.right < EDGE_SCROLLING_SPEED_POS.FAR) {
                this.scrollTimeline(this.right, EDGE_SCROLLING_DIRECTION.RIGHT);
            }
            if (timelineWidth - this.right < EDGE_SCROLLING_SPEED_POS.FAR) {
                this.scrollTimeline(timelineWidth - this.right, EDGE_SCROLLING_DIRECTION.LEFT);
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

    private edgeScrollingSpeed(pos: number): EDGE_SCROLLING_SPEED {
        return this.distanceToScrollingSpeed(pos);
    }

    ngAfterViewInit(): void {
        this.selection.background = this.self.nativeElement;
        this.host = this.selectedRangeView.nativeElement.parentElement;
    }

    private updateCss(): void {
        if (this.selectedRangeView && this.selectionStatus.isActive) {
            this.selectedRangeView.nativeElement.classList.add('active');
            this.left = this.timeline.timeToDomOffsetX(this.selectionStatus.range.start);
            this.duration = this.timeline.durationToDomWidth(this.selectionStatus.range.duration);

            const canvasWidth =
                this.timeline.canvasGeometry.width / this.timeline.canvasGeometry.dpr;
            const range = this.left + this.duration;

            // left ear
            if (this.leftEarView) {
                this.leftEarView.nativeElement.style.left = `${-WNM}px`;
                if (this.left - WNM <= 0) {
                    const padding = this.left - WNM;
                    this.leftEarView.nativeElement.style.left = `${-WNM - padding}px`;
                }
            }

            // right ear
            if (this.rightEarView) {
                this.rightEarView.nativeElement.style.right = `${-WNM}px`;
                if (range >= canvasWidth - WNM) {
                    const padding = canvasWidth - range - WNM;
                    this.rightEarView.nativeElement.style.right = `${-WNM - padding}px`;
                }
            }

            this.selectedRangeView.nativeElement.style.left = `${this.left}px`;
            this.selectedRangeView.nativeElement.style.width = `${this.duration}px`;
            // this.leftEarView?.nativeElement.classList.toggle(
            //     'playback',
            //     this._leftEarOverPlayback,
            // );
            // this.rightEarView?.nativeElement.classList.toggle(
            //     'playback',
            //     this._rightEarOverPlayback,
            // );
        } else if (this.selectedRangeView) {
            this.selectedRangeView.nativeElement.classList.remove('active');
        }
    }

    get svgLeftArrowPoints(): string {
        let offset: number;

        if (this.selectionStatus.dragMode || this.selectionStatus.hoverMode) {
            offset = this.left - WNM;

            this.tl = this.left - offset + MARGIN;
            this.tr = this.left - offset;
            this.b = this.left - offset + MARGIN;

            if (offset < 0) {
                if (offset > -MARGIN) {
                    this.tl = WNM + MARGIN;
                } else {
                    this.tl += offset + MARGIN;
                }
                this.tr += offset;
                this.b += offset;

                if (offset < -WNM + MARGIN) {
                    this.tr = MARGIN;
                }
            }
        }

        return `${this.tl},0 ${this.tr},0 ${this.b},5`;
    }

    get svgRightArrowPoints(): string {
        const wwm = PRIMARY_WIDTH + 2 * MARGIN; // widthWithMargins

        let offset: number;

        if (this.selectionStatus.dragMode || this.selectionStatus.hoverMode) {
            const canvasWidth =
                this.timeline.canvasGeometry.width / this.timeline.canvasGeometry.dpr;
            const range = this.left + this.duration;
            offset = canvasWidth - range - WNM;

            this.tl = MARGIN;
            this.tr = ARROW_WIDTH;
            this.b = MARGIN;

            if (offset < 0) {
                if (offset > -MARGIN) {
                    this.tl = MARGIN;
                } else {
                    this.tl -= offset + MARGIN;
                }
                this.tr -= offset;
                this.b -= offset;

                if (this.tl > wwm - 2 * ARROW_WIDTH) {
                    this.tl = wwm - 2 * ARROW_WIDTH;
                }
                if (this.tr > wwm - (ARROW_WIDTH + MARGIN)) {
                    this.tr = wwm - (ARROW_WIDTH + MARGIN);
                }
            }
        }

        return `${this.tl},0 ${this.tr},0 ${this.b},5`;
    }

    private play(offsetX: number): void {
        const time = this.timeline.domOffsetXtoTime(offsetX);
        this.playback.playArchive(time);

        const edgeWidth: px = 80;
        const edgeFixWidth: px = 160;
        const offset: ms = this.timeline.domWidthToDuration(edgeFixWidth);
        if (offsetX < edgeWidth) {
            this.timeline.jumpScrollTo(time - offset, true);
        } else if (
            offsetX >
            this.timeline.canvasGeometry.width / this.timeline.canvasGeometry.dpr - edgeWidth
        ) {
            this.timeline.jumpScrollTo(time - this.timeline.visibleRange.duration + offset, true);
        }
    }

    @HostListener('mousedown', ['$event'])
    mouseSelectionDownHandler(e: MouseEvent): void {
        this.clickAndHoldHandler = window.setTimeout(() => {
            this.selectionMode = true;
            this.selection.handleBackgroundMouseDown(e);
            clearTimeout(this.clickAndHoldHandler);
        }, CLICK_AND_HOLD_TIMEOUT);
    }

    @HostListener('document:mouseup', ['$event'])
    @HostListener('mouseup', ['$event'])
    mouseSelectionUpHandler(e: MouseEvent): void {
        this.selectedRangeView.nativeElement.classList.remove('range-drag');
        if (!this.selectionMode && e.currentTarget !== this.document) {
            if (this.clickAndHoldHandler) {
                clearTimeout(this.clickAndHoldHandler);
            }
            // short click
            this.selection.reset();
            const offsetX = calcOffsetX(e);
            this.play(offsetX);
            return;
        }
        if (this.clickAndHoldHandler) {
            clearTimeout(this.clickAndHoldHandler);
        }
        this.selectionMode = false;
        this.hideLeftEar = this.selectionStatus.isActive;
        this.hideRightEar = this.selectionStatus.isActive;
        this.selection.handleMouseUp();
    }

    @HostListener('mouseenter', ['$event'])
    mouseEnterHandler(e: MouseEvent): void {
        this.timeUnderMouse.handleMouseEnter(e);
    }

    @HostListener('mouseleave', ['$event'])
    mouseLeaveHandler(e: MouseEvent): void {
        if (!this.selectionMode) {
            this.hideLeftEar = true;
            this.hideRightEar = true;
        }
        this.timeUnderMouse.handleMouseLeave(e);
    }

    @HostListener('mousemove', ['$event'])
    mouseMoveHandler(e: MouseEvent): void {
        this.lastMouseMoveEvent = e;
        this.updateMouseMoveEvent(e);
    }

    @HostListener('dblclick', ['$event'])
    selectedRangeDoubleClickHandler(_: MouseEvent): void {
        this.selection.reset();
    }

    private updateMouseMoveEvent(e: MouseEvent): void {
        // @ts-expect-error FIXME: TIL errors inside event listeners will silently crash
        // without anything displaying in the console. Currently this call always crashes and
        // blocks the code under from ever executing
        this.timeUnderMouse.handleMouseMove({
            offsetX:
                (e.target as HTMLElement).getBoundingClientRect().left -
                this.host.getBoundingClientRect().left +
                e.offsetX,
        });

        if (this.selectionMode && e.buttons) {
            this.selection.handleMouseMove(e);
            this.hideLeftEar = this.selection.range.duration === 0;
            this.hideRightEar = this.selection.range.duration === 0;
        }
    }

    leftEarMouseDownHandler(e: MouseEvent): void {
        this.selection.handleLeftEarMouseDown(e);
        this.hideLeftEar = false;
        this.selectionMode = true;
    }

    rightEarMouseDownHandler(e: MouseEvent): void {
        this.selection.handleRightEarMouseDown(e);
        this.hideRightEar = false;
        this.selectionMode = true;
    }

    rightEarMouseInOutHandler(status: boolean): void {
        if (!this.selectionMode) {
            this.selection.handleEarMouseInOut(status);
            this.hideRightEar = !status;
        }
    }

    leftEarMouseInOutHandler(status: boolean): void {
        if (!this.selectionMode) {
            this.selection.handleEarMouseInOut(status);
            this.hideLeftEar = !status;
        }
    }

    @HostListener('wheel', ['$event'])
    wheelHandler(e: WheelEvent): void {
        e.preventDefault();

        if (e.target !== this.host) {
            // This branch is triggered when wheeling over a selection and the target
            // changes from nx-timeline-selection component to selected range div
            // (host is nx-timeline-selection component)
            // @ts-expect-error FIXME: Like above, this will always crash
            this.wheel.handleWheel({
                offsetX:
                    (e.target as HTMLElement).getBoundingClientRect().left -
                    this.host.getBoundingClientRect().left +
                    e.offsetX,
                deltaX: e.deltaX,
                deltaY: e.deltaY,
            });
        } else {
            this.wheel.handleWheel(e);
        }
    }
}
