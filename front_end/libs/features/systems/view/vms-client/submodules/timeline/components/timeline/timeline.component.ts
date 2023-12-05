import {
    Component,
    OnInit,
    ElementRef,
    ViewChild,
    AfterViewInit,
    OnDestroy,
    HostListener,
    Input,
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { DeviceDetectorService } from 'ngx-device-detector';
import { fromEvent, Subject } from 'rxjs';
import { debounceTime, startWith } from 'rxjs/operators';

import { nxConfig } from '@services/nx-config/config';
import { NxSystemService } from '@services/system.service/system.service';
import { px, ms } from '@view/datatypes/type-aliases';
import { PlaybackService } from '@view/services/playback.service';
import { WebClientUxService } from '@view/services/webclient-ux.service';

import { calcScreenX, calcOffsetX, calcOffsetY } from '../../calculate-coordinates';
import { TimelineCanvasRendererService } from '../../services/canvas-renderer/timeline.canvas-renderer.service';
import { TimelineSelectionService } from '../../services/timeline.selection.service';
import { TimelineService } from '../../services/timeline.service';
import type { TimelineServiceStatus } from '../../services/timeline.services.types';
import { SELECTION_DRAG_MODE } from '../../services/timeline.services.types';
import { TimelineTimeUnderMouseService } from '../../services/timeline.time-under-mouse.service';
import { TimelineWheelHandlerService } from '../../services/timeline.wheel-handler.service';

import { onPinch } from './onPinch';

const CANVAS_SELECTION_OFFSET_START = 60;
const CANVAS_SELECTION_OFFSET_END = 85;
const MOUSE_MINIMAL_MOVE_PX = 2;
const MOUSE_HIDE_UNTIL_PX = 8;
const MOUSE_MOVE_DT_LIMIT = 99999999;
// const MAX_TIMES_RENDERED = 1
// let times_rendered = 0

const CLICK_AND_HOLD_TIMEOUT = 250;
const VMS_VERSION_TIMELINE_ENABLED = 4.2;

@UntilDestroy()
@Component({
    selector: 'nx-timeline',
    templateUrl: './timeline.component.html',
    styleUrls: ['./timeline.component.scss'],
})
export class TimelineComponent implements OnInit, AfterViewInit, OnDestroy {
    @Input() canExport: boolean;
    @ViewChild('canvas') private canvasView: ElementRef<HTMLCanvasElement>;
    @ViewChild('canvasWrapper') private canvasWrapper: ElementRef<HTMLDivElement>;

    private mouseDownScreenX: px = 0;
    private mouseNotReleasedYet: boolean = false;

    private updateCanvas = new Subject<true>();
    private animationTimeout: number;

    hideTimeUnderMouse: boolean = false;
    isDragging: boolean = false;
    private clickAndHoldHandler: number;

    readonly archiveSelectionEnabled: boolean = false;

    constructor(
        deviceService: DeviceDetectorService,
        systemService: NxSystemService,
        private timeline: TimelineService,
        private playback: PlaybackService,
        private canvasRenderer: TimelineCanvasRendererService,
        private wheelHandler: TimelineWheelHandlerService,
        private timeUnderMouse: TimelineTimeUnderMouseService,
        public selection: TimelineSelectionService,
        public ux: WebClientUxService,
    ) {
        const device = deviceService.getDeviceInfo();
        this.archiveSelectionEnabled =
            !!nxConfig.featureFlags.archiveSelection &&
            device.deviceType !== 'mobile' &&
            systemService.getCurrentSystem().version >= VMS_VERSION_TIMELINE_ENABLED;

        this.selection.subject.pipe(untilDestroyed(this)).subscribe(selection => {
            this.isDragging =
                selection.dragMode !== SELECTION_DRAG_MODE.NO_DRAGGING || selection.hoverMode;
        });
    }

    private onTimelineStatusChange(s: TimelineServiceStatus): void {
        if (s.canvasGeometryUpdateRequested) {
            this.updateCanvas.next(true);
        }
    }

    private animationFrameRequestHandler: number;

    private pinchDestructor: () => void;
    // Event listener cleanup

    ngOnInit(): void {
        this.timeline.subject
            .pipe(untilDestroyed(this))
            .subscribe(() => this.onTimelineStatusChange);
        // FIXME: Doesn't do anything, missing call?
    }

    ngAfterViewInit(): void {
        fromEvent<Event>(window, 'resize')
            .pipe(untilDestroyed(this))
            .subscribe(() => this.updateCanvas.next(true));

        this.updateCanvas
            .pipe(startWith(true), debounceTime(50), untilDestroyed(this))
            .subscribe(() => {
                // Update canvas geometry
                const rect = this.canvasView.nativeElement.getBoundingClientRect();
                const dpr = window.devicePixelRatio;
                this.canvasView.nativeElement.width = rect.width * dpr;
                this.canvasView.nativeElement.height = rect.height * dpr;
                this.timeline.setCanvasGeometry(rect.width * dpr, rect.height * dpr, dpr);

                if (!this.animationFrameRequestHandler) {
                    // allow CanvasGeometry to be updated
                    setTimeout(() => {
                        this.animationFrameRequestHandler = requestAnimationFrame(() =>
                            this.onAnimationFrame(),
                        );
                    }, 250);
                }
            });
        this.updateCanvas.next(true);

        this.pinchDestructor = onPinch(
            this.canvasView.nativeElement,
            ({ newScale, scaleChange, offset }) => {
                const durationDelta = (scaleChange - 1) * this.timeline.fullRange.duration;
                this.timeline.zoom(durationDelta, offset);
            },
        );
    }

    ngOnDestroy(): void {
        clearTimeout(this.animationTimeout);
        if (this.animationFrameRequestHandler) {
            cancelAnimationFrame(this.animationFrameRequestHandler);
        }
        this.pinchDestructor?.();
    }

    private onAnimationFrame(): void {
        // console.time();
        const ctx = this.canvasView.nativeElement.getContext('2d');
        // console.log('render #', times_rendered)
        this.canvasRenderer.render(ctx);
        // console.timeEnd();

        // if (times_rendered++ >= MAX_TIMES_RENDERED) return

        this.animationTimeout = window.setTimeout(() => {
            this.animationFrameRequestHandler = requestAnimationFrame(() =>
                this.onAnimationFrame(),
            );
        }, this.timeline.renderFps);
    }

    canvasWheelHandler(e: WheelEvent): void {
        e.preventDefault();
        this.wheelHandler.handleWheel(e);
    }

    canvasMouseMoveHandler(e: MouseEvent | TouchEvent): void {
        e.stopPropagation();
        e.preventDefault();

        this.timeUnderMouse.handleMouseMove(e);

        // FIXME, maybe: Potentially dangerous cast that might crash if event is TouchEvent,
        // but I expect most customers aren't using touchscreens for this
        if (this.selection.handleMouseMove(e as MouseEvent)) {
            return;
        }

        const screenX = calcScreenX(e);
        const delta = Math.abs(screenX - this.mouseDownScreenX);

        if (this.mouseNotReleasedYet && delta > MOUSE_MINIMAL_MOVE_PX) {
            // console.log('dragging started', delta);
            this.isDragging = true;
        }

        if (this.isDragging) {
            const dt = -1 * this.timeline.domWidthToDuration(screenX - this.mouseDownScreenX);
            // short circuit unrealistically big "dt"
            // and prevent timeline jump when dragging
            if (Math.abs(dt) < MOUSE_MOVE_DT_LIMIT) {
                this.timeline.shiftVisibleRange(dt);
            }
            this.mouseDownScreenX = screenX;
        }

        if (delta > MOUSE_HIDE_UNTIL_PX && this.hideTimeUnderMouse) {
            this.hideTimeUnderMouse = false;
        }
    }

    canvasMouseEnterHandler(e: MouseEvent): void {
        this.timeUnderMouse.handleMouseEnter(e);
    }

    private exitEdge(mouse: MouseEvent, canvasWrapper: HTMLDivElement): string {
        const elemBounding = canvasWrapper.getBoundingClientRect();
        const elementLeftEdge = elemBounding.left;
        const elementRightEdge = elemBounding.right;

        const mouseX = mouse.pageX;

        if (mouseX <= elementLeftEdge) {
            return 'left';
        } else if (mouseX >= elementRightEdge) {
            return 'right';
        }
    }

    public timelineMouseLeaveHandler(e: MouseEvent): void {
        if (this.archiveSelectionEnabled && this.isDragging) {
            const edge = this.exitEdge(e, this.canvasWrapper.nativeElement);
            switch (edge) {
                case 'left':
                    this.selection.fitStart();
                    return;
                case 'right':
                    this.selection.fitEnd();
            }
        }
    }

    canvasMouseLeaveHandler(e: MouseEvent): void {
        this.timeUnderMouse.handleMouseLeave(e);
    }

    canvasMouseDownHandler(e: MouseEvent | TouchEvent): void {
        e.stopPropagation();
        e.preventDefault();

        if (e instanceof MouseEvent && e.button !== 0) {
            return;
        }
        if (this.archiveSelectionEnabled) {
            const offsetY = calcOffsetY(e);
            if (
                offsetY >= CANVAS_SELECTION_OFFSET_START &&
                offsetY <= CANVAS_SELECTION_OFFSET_END
            ) {
                this.selection.handleBackgroundMouseDown(e as MouseEvent);
            }
        } else {
            this.mouseDownScreenX = calcScreenX(e);
        }
        this.timeUnderMouse.handleMouseDown();
        this.mouseNotReleasedYet = true;
        this.clickAndHoldHandler = window.setTimeout(() => {
            this.isDragging = true;
            clearTimeout(this.clickAndHoldHandler);
        }, CLICK_AND_HOLD_TIMEOUT);
    }

    canvasMouseUpHandler(e: MouseEvent | TouchEvent, mustPlay: boolean = false): void {
        e.stopPropagation();
        e.preventDefault();

        if (this.clickAndHoldHandler) {
            clearTimeout(this.clickAndHoldHandler);
        }

        if (!this.isDragging) {
            if (!mustPlay && this.archiveSelectionEnabled) {
                mustPlay = !this.selection.handleMouseUp();
            }
            this.selection.reset();
            this.mouseDownScreenX = calcScreenX(e);
            this.timeUnderMouse.handleMouseDown();

            const screenX = calcScreenX(e);
            const offsetX = calcOffsetX(e);
            const delta = Math.abs(screenX - this.mouseDownScreenX);

            mustPlay ||= !this.isDragging && delta < MOUSE_MINIMAL_MOVE_PX;
            if (mustPlay) {
                this.play(offsetX);
            }
        }

        this.mouseDownScreenX = 0;
        this.mouseNotReleasedYet = false;
        this.isDragging = false;
        this.timeUnderMouse.handleMouseUp();
    }

    private play(offsetX: number): void {
        const time = this.timeline.domOffsetXtoTime(offsetX);
        this.playback.playArchive(time);
        this.hideTimeUnderMouse = true;
        this.mouseDownScreenX = screenX;

        const edgeWidth: px = 80;
        const edgeFixWidth: px = 160;
        const offset: ms = this.timeline.domWidthToDuration(edgeFixWidth);
        if (offsetX < edgeWidth) {
            // console.log('left edge fix')
            this.timeline.jumpScrollTo(time - offset, true);
        } else if (
            offsetX >
            this.timeline.canvasGeometry.width / this.timeline.canvasGeometry.dpr - edgeWidth
        ) {
            // console.log('right edge fix')
            this.timeline.jumpScrollTo(time - this.timeline.visibleRange.duration + offset, true);
        }
    }

    @HostListener('document:mouseup', ['$event'])
    documentMouseUpHandler(e: MouseEvent): void {
        e.stopPropagation();
        e.preventDefault();

        this.mouseNotReleasedYet = false;
        this.isDragging = false;
        if (this.archiveSelectionEnabled) {
            if (!this.selection.handleMouseUp()) {
                this.play(e.clientX - this.canvasView.nativeElement.getBoundingClientRect().left);
            }
        }
    }
}
