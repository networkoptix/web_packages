import {
    Component,
    OnInit,
    ElementRef,
    ViewChild,
    AfterViewInit,
    OnDestroy,
    HostListener,
    Inject,
    Input,
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { DeviceDetectorService } from 'ngx-device-detector';
import { fromEvent, Subject } from 'rxjs';
import { debounceTime, startWith } from 'rxjs/operators';

import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxSystemService } from '@services/system.service/system.service';
import { WINDOW } from '@services/window-provider';
import { WebClientUxService } from '@view/services/webclient-ux.service';
import { PlaybackService } from '@vms-client/submodules/playback/services/playback.service';
import { calcScreenX, calcOffsetX, calcOffsetY } from '@vms-client/utils/calculate-coordinates';
import { px, ms } from '@vms-client/utils/type-aliases';

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
    @ViewChild('canvas') canvasView: ElementRef<HTMLCanvasElement>;
    @ViewChild('canvasWrapper') canvasWrapper: ElementRef<HTMLDivElement>;

    protected _state: TimelineServiceStatus;
    protected _mouseDownScreenX: px = 0;
    protected _mouseNotReleasedYet: boolean = false;

    private updateCanvas = new Subject<true>();
    private _animationTimeout: number;

    public hideTimeUnderMouse: boolean = false;
    public isDragging: boolean = false;
    clickAndHoldHandler: number;

    public readonly archiveSelectionEnabled: boolean = false;

    constructor(
        deviceService: DeviceDetectorService,
        systemService: NxSystemService,
        protected configService: NxConfigService,
        public timeline: TimelineService,
        protected playback: PlaybackService,
        protected canvasRenderer: TimelineCanvasRendererService,
        protected wheelHandler: TimelineWheelHandlerService,
        public timeUnderMouse: TimelineTimeUnderMouseService,
        public selection: TimelineSelectionService,
        public ux: WebClientUxService,
        @Inject(WINDOW) private window: Window,
    ) {
        const device = deviceService.getDeviceInfo();
        this.archiveSelectionEnabled =
            this.configService.flagsEnabled('archiveSelection') &&
            device.deviceType !== 'mobile' &&
            systemService.getCurrentSystem().version >= VMS_VERSION_TIMELINE_ENABLED;

        this.selection.subject.pipe(untilDestroyed(this)).subscribe(selection => {
            this.isDragging =
                selection.dragMode !== SELECTION_DRAG_MODE.NO_DRAGGING || selection.hoverMode;
        });
    }

    protected _onTimelineStatusChange(s: TimelineServiceStatus): void {
        if (s.canvasGeometryUpdateRequested) {
            this.updateCanvas.next(true);
        }
    }

    protected _animationFrameRequestHandler: number;

    protected _pinchDestructor: () => void;
    // Event listener cleanup

    public ngOnInit(): void {
        this.timeline.subject
            .pipe(untilDestroyed(this))
            .subscribe(() => this._onTimelineStatusChange);
        // FIXME: Doesn't do anything, missing call?
    }

    public ngAfterViewInit(): void {
        fromEvent<Event>(this.window, 'resize')
            .pipe(untilDestroyed(this))
            .subscribe(() => this.updateCanvas.next(true));

        this.updateCanvas
            .pipe(startWith(true), debounceTime(50), untilDestroyed(this))
            .subscribe(() => {
                this._updateCanvasGeometry();
                if (!this._animationFrameRequestHandler) {
                    // allow CanvasGeometry to be updated
                    setTimeout(() => {
                        this._animationFrameRequestHandler = requestAnimationFrame(() =>
                            this.onAnimationFrame(),
                        );
                    }, 250);
                }
            });
        this.updateCanvas.next(true);

        this._pinchDestructor = onPinch(
            this.canvasView.nativeElement,
            ({ newScale, scaleChange, offset }) => {
                const durationDelta = (scaleChange - 1) * this.timeline.fullRange.duration;
                this.timeline.zoom(durationDelta, offset);
            },
        );
    }

    public ngOnDestroy(): void {
        clearTimeout(this._animationTimeout);
        this._animationFrameRequestHandler &&
            cancelAnimationFrame(this._animationFrameRequestHandler);
        this._pinchDestructor && this._pinchDestructor();
    }

    public onAnimationFrame(): void {
        // console.time();
        const ctx = this.canvasView.nativeElement.getContext('2d');
        // console.log('render #', times_rendered)
        this.canvasRenderer.render(ctx);
        // console.timeEnd();

        // if (times_rendered++ >= MAX_TIMES_RENDERED) return

        this._animationTimeout = this.window.setTimeout(() => {
            this._animationFrameRequestHandler = requestAnimationFrame(() =>
                this.onAnimationFrame(),
            );
        }, this.timeline.renderFps);
    }

    protected _updateCanvasGeometry(): void {
        const rect = this.canvasView.nativeElement.getBoundingClientRect();
        const dpr = this.window.devicePixelRatio;
        this.canvasView.nativeElement.width = rect.width * dpr;
        this.canvasView.nativeElement.height = rect.height * dpr;
        this.timeline.setCanvasGeometry(rect.width * dpr, rect.height * dpr, dpr);
    }

    public canvasWheelHandler(e: WheelEvent): void {
        e.preventDefault();
        this.wheelHandler.handleWheel(e);
    }

    public canvasMouseMoveHandler(e: MouseEvent | TouchEvent): void {
        e.stopPropagation();
        e.preventDefault();

        this.timeUnderMouse.handleMouseMove(e);
        if (this.selection.handleMouseMove(e as MouseEvent)) {
            return;
        }

        const screenX = calcScreenX(e);
        const delta = Math.abs(screenX - this._mouseDownScreenX);

        if (this._mouseNotReleasedYet && delta > MOUSE_MINIMAL_MOVE_PX) {
            // console.log('dragging started', delta);
            this.isDragging = true;
        }

        if (this.isDragging) {
            const dt = -1 * this.timeline.domWidthToDuration(screenX - this._mouseDownScreenX);
            // short circuit unrealistically big "dt"
            // and prevent timeline jump when dragging
            if (Math.abs(dt) < MOUSE_MOVE_DT_LIMIT) {
                this.timeline.shiftVisibleRange(dt);
            }
            this._mouseDownScreenX = screenX;
        }

        if (delta > MOUSE_HIDE_UNTIL_PX && this.hideTimeUnderMouse) {
            this.hideTimeUnderMouse = false;
        }
    }

    public canvasMouseEnterHandler(e: MouseEvent): void {
        this.timeUnderMouse.handleMouseEnter(e);
    }

    exitEdge(mouse: MouseEvent, elem: HTMLDivElement): string {
        const elemBounding = elem.getBoundingClientRect();
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

    public canvasMouseLeaveHandler(e: MouseEvent): void {
        this.timeUnderMouse.handleMouseLeave(e);
    }

    public canvasMouseDownHandler(e: MouseEvent | TouchEvent): void {
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
            this._mouseDownScreenX = calcScreenX(e);
        }
        this.timeUnderMouse.handleMouseDown();
        this._mouseNotReleasedYet = true;
        this.clickAndHoldHandler = this.window.setTimeout(() => {
            this.isDragging = true;
            clearTimeout(this.clickAndHoldHandler);
        }, CLICK_AND_HOLD_TIMEOUT);
    }

    public canvasMouseUpHandler(e: MouseEvent | TouchEvent, mustPlay: boolean = false): void {
        e.stopPropagation();
        e.preventDefault();

        this.clickAndHoldHandler && clearTimeout(this.clickAndHoldHandler);

        if (!this.isDragging) {
            if (!mustPlay && this.archiveSelectionEnabled) {
                mustPlay = !this.selection.handleMouseUp(e as MouseEvent);
            }
            this.selection.reset();
            this._mouseDownScreenX = calcScreenX(e);
            this.timeUnderMouse.handleMouseDown();

            const screenX = calcScreenX(e);
            const offsetX = calcOffsetX(e);
            const delta = Math.abs(screenX - this._mouseDownScreenX);

            mustPlay ||= !this.isDragging && delta < MOUSE_MINIMAL_MOVE_PX;
            if (mustPlay) {
                this._play(offsetX);
            }
        }

        this._mouseDownScreenX = 0;
        this._mouseNotReleasedYet = false;
        this.isDragging = false;
        this.timeUnderMouse.handleMouseUp();
    }

    protected _play(offsetX: number): void {
        const time = this.timeline.domOffsetXtoTime(offsetX);
        this.playback.playArchive(time);
        this.hideTimeUnderMouse = true;
        this._mouseDownScreenX = screenX;

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
    public documentMouseUpHandler(e: MouseEvent): void {
        e.stopPropagation();
        e.preventDefault();

        this._mouseNotReleasedYet = false;
        this.isDragging = false;
        if (this.archiveSelectionEnabled) {
            if (!this.selection.handleMouseUp(e)) {
                this._play(e.clientX - this.canvasView.nativeElement.getBoundingClientRect().left);
            }
        }
    }
}
