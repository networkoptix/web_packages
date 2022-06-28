import {
    Component,
    OnInit,
    ElementRef,
    ViewChild,
    AfterViewInit,
    OnDestroy,
    HostListener
} from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

import { NxConfigService } from '@services/nx-config/nx-config.service';
import { PlaybackService } from '@vms-client/submodules/playback/services/playback.service';
import {
    calcScreenX,
    calcOffsetX,
    calcOffsetY,
} from '@vms-client/utils/calculate-coordinates';
import { px, ms } from '@vms-client/utils/type-aliases';

import { TimelineCanvasRendererService } from '../../services/canvas-renderer/timeline.canvas-renderer.service';
import { TimelineSelectionService } from '../../services/timeline.selection.service';
import { TimelineService } from '../../services/timeline.service';
import type {
    TimelineServiceStatus,
} from '../../services/timeline.services.types';
import { TimelineTimeUnderMouseService } from '../../services/timeline.time-under-mouse.service';
import { TimelineWheelHandlerService } from '../../services/timeline.wheel-handler.service';

import { onPinch } from './onPinch';

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
    @ViewChild('canvas') canvasView: ElementRef<HTMLCanvasElement>;

    protected _state: TimelineServiceStatus;
    protected _stateSubscription: Subscription;
    private updateCanvas = new Subject();
    private unsub$ = new Subject();

    constructor(
        protected configService: NxConfigService,
        public timeline: TimelineService,
        protected playback: PlaybackService,
        protected canvasRenderer: TimelineCanvasRendererService,
        protected wheelHandler: TimelineWheelHandlerService,
        public timeUnderMouse: TimelineTimeUnderMouseService,
        protected selection: TimelineSelectionService
    ) {
        this._onTimelineStatusChange = this._onTimelineStatusChange.bind(this);
        this.archiveSelectionEnabled = this.configService.flagsEnabled(
            'archiveSelection'
        );
    }

    public readonly archiveSelectionEnabled: boolean = false;

    protected _onTimelineStatusChange(s: TimelineServiceStatus): void {
        if (s.canvasGeometryUpdateRequested) {
            this.updateCanvas.next(true);
        }
    }

    protected _animationFrameRequestHandler: number;

    protected _pinchDestructor: Function;

    public ngOnInit(): void {
        this._stateSubscription = this.timeline.subject.subscribe(
            this._onTimelineStatusChange
        );
        this._animationFrameRequestHandler =
            requestAnimationFrame(() => this.onAnimationFrame());
    }

    public onAnimationFrame(): void {
        const ctx = this.canvasView.nativeElement.getContext('2d');
        // console.log('render #', times_rendered)
        this.canvasRenderer.render(ctx);

        // if (times_rendered++ >= MAX_TIMES_RENDERED) return

        setTimeout(() => {
            this._animationFrameRequestHandler =
                requestAnimationFrame(() => this.onAnimationFrame());
        }, this.timeline.renderFps);
    }

    public ngOnDestroy(): void {
        this.unsub$.next(true);
        this._stateSubscription.unsubscribe();
        cancelAnimationFrame(this._animationFrameRequestHandler);
        this._pinchDestructor && this._pinchDestructor();
    }

    public ngAfterViewInit(): void {
        window.addEventListener(
            'resize',
            () => this.updateCanvas.next(true)
        );

        setTimeout(() => this.updateCanvas.next(true));
        this.updateCanvas.pipe(
            debounceTime(50),
            takeUntil(this.unsub$)
        ).subscribe(() => this._updateCanvasGeometry());

        this._pinchDestructor = onPinch(
            this.canvasView.nativeElement,
            ({ newScale, scaleChange, offset }) => {
                const durationDelta =
                    (scaleChange - 1) * this.timeline.fullRange.duration;
                this.timeline.zoom(durationDelta, offset);
            }
        );
    }

    protected _updateCanvasGeometry(): void {
        const rect = this.canvasView.nativeElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio;
        this.canvasView.nativeElement.width = rect.width * dpr;
        this.canvasView.nativeElement.height = rect.height * dpr;
        this.timeline.setCanvasGeometry(rect.width * dpr, rect.height * dpr, dpr);
    }

    public canvasWheelHandler(e: WheelEvent): void {
        e.preventDefault();
        this.wheelHandler.handleWheel(e);
    }

    public canvasMouseMoveHandler(e: MouseEvent | TouchEvent): void {
        this.timeUnderMouse.handleMouseMove(e);
        if (this.selection.handleMouseMove(e as MouseEvent)) {
            return;
        }
        const screenX = calcScreenX(e);
        const delta = Math.abs(screenX - this._mouseDownScreenX);
        if (this._mouseNotReleasedYet && delta > MOUSE_MINIMAL_MOVE_PX) {
            // console.log('dragging started', delta)
            this.isDragging = true;
        }
        if (this.isDragging) {
            const dt = -1 * this.timeline.domWidthToDuration(
                screenX - this._mouseDownScreenX
            );
            // console.log('dragging in progress', dt)
            this.timeline.shiftVisibleRange(dt);
            this._mouseDownScreenX = screenX;
        }
        if (delta > MOUSE_HIDE_UNTIL_PX && this.hideTimeUnderMouse) {
            this.hideTimeUnderMouse = false;
        }
    }

    public canvasMouseEnterHandler(e: MouseEvent): void {
        this.timeUnderMouse.handleMouseEnter(e);
    }

    public canvasMouseLeaveHandler(e: MouseEvent): void {
        this.timeUnderMouse.handleMouseLeave(e);
    }

    protected _mouseDownScreenX: px = 0;
    protected _mouseNotReleasedYet: boolean = false;
    public hideTimeUnderMouse: boolean = false;
    public isDragging: boolean = false;

    public canvasMouseDownHandler(e: MouseEvent | TouchEvent): void {
        if (e instanceof MouseEvent && e.button !== 0) {
            return;
        }
        e.stopPropagation();
        e.preventDefault();
        if (this.archiveSelectionEnabled) {
            const offsetY = calcOffsetY(e);
            if (offsetY >= CANVAS_SELECTION_OFFSET_START &&
                offsetY <= CANVAS_SELECTION_OFFSET_END
            ) {
                this.selection.handleBackgroundMouseDown(e as MouseEvent);
            } else {
                this.selection.reset();
                this._mouseDownScreenX = calcScreenX(e);
                this._mouseNotReleasedYet = true;
                this.timeUnderMouse.handleMouseDown();
            }
        } else {
            this._mouseDownScreenX = calcScreenX(e);
            this._mouseNotReleasedYet = true;
            this.timeUnderMouse.handleMouseDown();
        }
    }

    protected _play(offsetX): void {
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
            this.timeline.jumpScrollTo(
                time - this.timeline.visibleRange.duration + offset,
                true
            );
        }
    }

    public canvasMouseUpHandler(e: MouseEvent | TouchEvent, mustPlay: boolean = false): void {
        if (!mustPlay && this.archiveSelectionEnabled) {
            mustPlay = !this.selection.handleMouseUp(e as MouseEvent);
        }
        const screenX = calcScreenX(e);
        const offsetX = calcOffsetX(e);
        const delta = Math.abs(screenX - this._mouseDownScreenX);
        // console.log('mouse up', e.screenX, delta)
        mustPlay ||= !this.isDragging && delta < MOUSE_MINIMAL_MOVE_PX;
        if (mustPlay) {
            this._play(offsetX);

            // console.log('started to hide the time under mouse indicator', this._mouseDownScreenX)
        }
        this._mouseNotReleasedYet = false;
        this.isDragging = false;
        this.timeUnderMouse.handleMouseUp();
    }

    @HostListener('document:mouseup', ['$event'])
    public documentMouseUpHandler(e: MouseEvent): void {
        this._mouseNotReleasedYet = false;
        this.isDragging = false;
        if (this.archiveSelectionEnabled) {
            if (!this.selection.handleMouseUp(e)) {
                this._play(e.clientX - (this.canvasView.nativeElement as HTMLElement).getBoundingClientRect().left);
            }
        }
    }
}
