import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import TimelineService, { TimelineServiceStatus } from '../../services/timeline.service';
import TimelineCanvasRendererService from '../../services/canvas-renderer/timeline.canvas-renderer.service';
import TimelineWheelHandlerService from '../../services/timeline.wheel-handler.service';
import TimelineTimeUnderMouseService from '../../services/timeline.time-under-mouse.service';
import TimelineSelectionService from '../../services/timeline.selection.service';
import PlaybackService from '../../../playback/services/playback.service';
import { Subject, Subscription } from 'rxjs';
import { px, ms } from '@pages/systems/view/vms-client/utils/type-aliases';
import { NxUtilsService } from '@services/utils.service';
import { debounceTime, takeUntil } from 'rxjs/operators';

const CANVAS_SELECTION_OFFSET_START = 60;
const CANVAS_SELECTION_OFFSET_END = 85;
const MOUSE_MINIMAL_MOVE_PX = 2;
const MOUSE_HIDE_UNTIL_PX = 8;
// const MAX_TIMES_RENDERED = 1
// let times_rendered = 0

@Component({
    selector: 'timeline',
    templateUrl: './timeline.component.html',
    styleUrls: ['./timeline.component.scss']
})
export class TimelineComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('canvas') canvasView: ElementRef;

    protected _state: TimelineServiceStatus
    protected _stateSubscription: Subscription
    private updateCanvas = new Subject();
    private unsub$ = new Subject();

    constructor(
        public timeline: TimelineService,
        protected playback: PlaybackService,
        protected canvasRenderer: TimelineCanvasRendererService,
        protected wheelHandler: TimelineWheelHandlerService,
        public timeUnderMouse: TimelineTimeUnderMouseService,
        protected selection: TimelineSelectionService
    ) {
        this._onTimelineStatusChange = this._onTimelineStatusChange.bind(this);
    }

    protected _onTimelineStatusChange (s: TimelineServiceStatus) {
        if (s.canvasGeometryUpdateRequested) {
            this.updateCanvas.next();
        }
    }

    protected _animationFrameRequestHandler: number

    public ngOnInit (): void {
        this._stateSubscription = this.timeline.subject.subscribe(this._onTimelineStatusChange);
        this._animationFrameRequestHandler =
            requestAnimationFrame(() => this.onAnimationFrame());
    }

    public onAnimationFrame (): void {
        const ctx = (this.canvasView.nativeElement as HTMLCanvasElement).getContext('2d');
        // console.log('render #', times_rendered)
        this.canvasRenderer.render(ctx);

        // if (times_rendered++ >= MAX_TIMES_RENDERED) return

        setTimeout(() => {
            this._animationFrameRequestHandler =
                requestAnimationFrame(() => this.onAnimationFrame());
        }, this.timeline.renderFps);
    }

    public ngOnDestroy (): void {
        this.unsub$.next();
        this._stateSubscription.unsubscribe();
        cancelAnimationFrame(this._animationFrameRequestHandler);
    }

    public ngAfterViewInit (): void {
        window.addEventListener(
            'resize',
            () => this.updateCanvas.next()
        );

        setTimeout(() => this.updateCanvas.next());
        this.updateCanvas.pipe(
            debounceTime(50),
            takeUntil(this.unsub$)
        ).subscribe(() => this._updateCanvasGeometry());
    }

    protected _updateCanvasGeometry (): void {
        const rect = this.canvasView.nativeElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio;
        this.canvasView.nativeElement.width = rect.width * dpr;
        this.canvasView.nativeElement.height = rect.height * dpr;
        this.timeline.setCanvasGeometry(rect.width * dpr, rect.height * dpr, dpr);
    }

    public canvasWheelHandler (e: WheelEvent): void {
        e.preventDefault();
        this.wheelHandler.handleWheel(e);
    }

    public canvasMouseMoveHandler (e: MouseEvent|TouchEvent): void {
        this.timeUnderMouse.handleMouseMove(e);
        if (this.selection.handleMouseMove(e as MouseEvent)) {
            return
        }
        const screenX = NxUtilsService.calcScreenX(e);
        const delta = Math.abs(screenX - this._mouseDownScreenX);
        if (this._mouseNotReleasedYet && delta > MOUSE_MINIMAL_MOVE_PX) {
            // console.log('dragging started', delta)
            this.isDragging = true;
        }
        if (this.isDragging) {
            const dt = -1 * this.timeline.domWidthToDuration(screenX - this._mouseDownScreenX);
            // console.log('dragging in progress', dt)
            this.timeline.shiftVisibleRange(dt);
            this._mouseDownScreenX = screenX;
        }
        if (delta > MOUSE_HIDE_UNTIL_PX && this.hideTimeUnderMouse) {
            this.hideTimeUnderMouse = false;
        }
    }

    public canvasMouseEnterHandler (e: MouseEvent): void {
        this.timeUnderMouse.handleMouseEnter(e);
    }

    public canvasMouseLeaveHandler (e: MouseEvent): void {
        this.timeUnderMouse.handleMouseLeave(e);
    }

    protected _mouseDownScreenX: px = 0
    protected _mouseNotReleasedYet: boolean = false
    public hideTimeUnderMouse: boolean = false
    public isDragging: boolean = false

    public canvasMouseDownHandler (e: MouseEvent|TouchEvent): void {
        if (e instanceof MouseEvent && e.button !== 0) {
            return;
        }
        e.stopPropagation();
        e.preventDefault();
        const offsetY = NxUtilsService.calcOffsetY(e)
        if (offsetY >= CANVAS_SELECTION_OFFSET_START &&
            offsetY <= CANVAS_SELECTION_OFFSET_END
        ) {
            this.selection.handleBackgroundMouseDown(e as MouseEvent)
        } else {
            this.selection.reset()
            this._mouseDownScreenX = NxUtilsService.calcScreenX(e);
            this._mouseNotReleasedYet = true;
            this.timeUnderMouse.handleMouseDown()
        }
    }

    public canvasMouseUpHandler (e: MouseEvent|TouchEvent): void {
        this.selection.handleMouseUp(e as MouseEvent)
        const screenX = NxUtilsService.calcScreenX(e);
        const offsetX = NxUtilsService.calcOffsetX(e);
        const delta = Math.abs(screenX - this._mouseDownScreenX);
        // console.log('mouse up', e.screenX, delta)
        if (!this.isDragging && delta < MOUSE_MINIMAL_MOVE_PX) {
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
            } else if (offsetX > this.timeline.canvasGeometry.width / this.timeline.canvasGeometry.dpr - edgeWidth) {
                // console.log('right edge fix')
                this.timeline.jumpScrollTo(time - this.timeline.visibleRange.duration + offset, true);
            }

            // console.log('started to hide the time under mouse indicator', this._mouseDownScreenX)
        }
        this._mouseNotReleasedYet = false;
        this.isDragging = false;
        this.timeUnderMouse.handleMouseUp();
    }

    @HostListener('document:mouseup')
    public documentMouseUpHandler (e: MouseEvent): void {
        this._mouseNotReleasedYet = false;
        this.isDragging = false;
        this.selection.handleMouseUp(e as MouseEvent)
    }
}

export default TimelineComponent;
