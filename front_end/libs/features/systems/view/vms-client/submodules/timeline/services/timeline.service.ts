import { Injectable } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { DeviceDetectorService } from 'ngx-device-detector';
import { animationFrameScheduler, interval, Subject } from 'rxjs';

import { int, float, ms, px, CanvasGeometry } from '@view/datatypes/type-aliases';
import { VideoManagementSystemService } from '@view/services/vms.service';

import { TimeRange } from './TimeRange';
import { cfg } from './timeline.config';
import type { TimelineServiceStatus } from './timeline.services.types';

@UntilDestroy()
@Injectable({
    providedIn: 'root',
})
export class TimelineService {
    readonly renderFps: number;
    private _fullRange = new TimeRange(0, 0);
    private _visibleRange = new TimeRange(0, 0);
    private _canvasGeometry: CanvasGeometry = { width: 0, height: 0, dpr: 1 };

    subject = new Subject<TimelineServiceStatus>();
    canvasGeometryUpdateRequested: boolean = true;

    constructor(
        private vms: VideoManagementSystemService,
        browserDetector: DeviceDetectorService,
    ) {
        // 1000 / [desired frames] = timeout between animation frames requests
        const _60fps = Math.ceil(1000 / 60); // ~17ms
        const _30fps = Math.ceil(1000 / 30); // ~34ms

        this.renderFps = _60fps;
        if (browserDetector.isMobile() || ['safari', 'firefox'].includes(browserDetector.browser)) {
            this.renderFps = _30fps;
        }

        interval(0, animationFrameScheduler)
            .pipe(untilDestroyed(this))
            .subscribe(() => {
                const now = Date.now();
                const diff = now - this.scrollAnimationStartTime;
                if (diff < cfg.SCROLL_ANIMATION_DURATION_MS) {
                    this.animationStep++;
                    const percentage = diff / cfg.SCROLL_ANIMATION_DURATION_MS;
                    const diffMs = this._targetScrollMs - this.initialScrollMs;
                    const dMs = Math.round(diffMs * percentage);
                    const current = this.initialScrollMs + dMs;
                    this.changeVisibleDurationStart(current);
                } else if (this._targetScrollMs) {
                    this.changeVisibleDurationStart(this._targetScrollMs);
                    this._targetScrollMs = undefined;
                    this.animationStep = 0;
                }
                this.emit();
            });
    }

    private changeVisibleDurationStart(t: ms): void {
        const duration = this._visibleRange.duration;
        this._visibleRange.start = t;
        this._visibleRange.end = t + duration;

        // Sanizitze visible range position
        let diff = this._visibleRange.end - this._fullRange.end;
        if (diff > 0) {
            this._visibleRange.shift(-diff);
        }
        diff = this._fullRange.start - this._visibleRange.start;
        if (diff > 0) {
            this._visibleRange.shift(diff);
        }
    }

    requestCanvasGeometryUpdate(): void {
        this.canvasGeometryUpdateRequested = true;
    }

    private emit(): void {
        this.subject.next({
            fullRange: this.fullRange,
            visibleRange: this.visibleRange,
            canvasGeometry: this.canvasGeometry,
            zoom: this.zoomStatus,
            canvasGeometryUpdateRequested: this.canvasGeometryUpdateRequested,
        });
    }

    get zoomStatus(): TimelineServiceStatus['zoom'] {
        return {
            canZoomIn:
                this._visibleRange.duration / this.canvasGeometry.dpr > this.canvasGeometry.width,
            canZoomOut: this._visibleRange.duration < this._fullRange.duration,
        };
    }

    get fullRange(): TimeRange {
        return this._fullRange.clone();
    }

    get visibleRange(): TimeRange {
        return this._visibleRange.clone();
    }

    set visibleRange(r: TimeRange) {
        this._visibleRange.start = Math.max(r.start, this.fullRange.start);
        this._visibleRange.end = Math.min(r.end, this.fullRange.end);
        this.emit();
    }

    get canvasGeometry(): CanvasGeometry {
        return { ...this._canvasGeometry };
    }

    reset(start: ms, end: ms): void {
        this._fullRange.start = start;
        this._fullRange.end = end;
        this._visibleRange.start = start;
        this._visibleRange.end = end;
    }

    extendToNow(): void {
        const serverId = this.vms.selectedCamera?.parentServerId;
        const serverTimes = this.vms.serverTimes$$()?.find(server => server.serverId === serverId);

        const now = Date.now() - (serverTimes?.vmsTimeOffset || 0);

        if (this._fullRange.end - this._visibleRange.end < cfg.STICK_TO_LIVE_TRESHOLD) {
            const visibleRangeDurationWas = this._visibleRange.duration;
            this._visibleRange.end = now;
            if (this._visibleRange.start - this._fullRange.start > cfg.STICK_TO_LIVE_TRESHOLD) {
                this._visibleRange.start = this._visibleRange.end - visibleRangeDurationWas;
            }
        }
        this._fullRange.end = now;
        this.emit();
    }

    setCanvasGeometry(width: px, height: px, dpr: int): void {
        // console.log(this.id, 'setCanvasGeometry', width, height, dpr)
        this._canvasGeometry.width = width;
        this._canvasGeometry.height = height;
        this._canvasGeometry.dpr = dpr;
        this.canvasGeometryUpdateRequested = false;
        this.emit();
    }

    get msPerCanvasPx(): float {
        // console.log(this.id, 'msPerCanvasPx', this._visibleRange.duration, this._canvasGeometry.width)
        return this._visibleRange.duration / this._canvasGeometry.width;
    }

    domOffsetXtoTime(x: px): ms {
        const canvasOffsetX = x * this._canvasGeometry.dpr;
        return Math.round(this._visibleRange.start + this.msPerCanvasPx * canvasOffsetX);
    }

    timeToDomOffsetX(t: ms): px {
        return Math.round(
            (t - this._visibleRange.start) / (this.msPerCanvasPx * this._canvasGeometry.dpr),
        );
    }

    timeToCanvasOffsetX(t: ms): px {
        return Math.round((t - this._visibleRange.start) / this.msPerCanvasPx);
    }

    durationToCanvasWidth(d: ms): px {
        return Math.round(d / this.msPerCanvasPx);
    }

    durationToDomWidth(d: ms): px {
        return Math.round(this.durationToCanvasWidth(d) / this._canvasGeometry.dpr);
    }

    domWidthToDuration(w: px): ms {
        return this.canvasWidthToDuration(w * this._canvasGeometry.dpr);
    }

    canvasWidthToDuration(w: px): ms {
        return Math.round(w * this.msPerCanvasPx);
    }

    shiftVisibleRange(offset: ms): void {
        // If the visible start is less than full range ignore the move.
        if (
            this.fullRange.start <= this.visibleRange.start + offset &&
            this.visibleRange.end + offset <= this.fullRange.end
        ) {
            this._visibleRange.shift(offset);
            this.emit();
        }
    }

    zoom(durationDelta: ms, offset: float): void {
        const MIN_DURATION = this.canvasGeometry.width * this.canvasGeometry.dpr;
        const duration = this.visibleRange.duration;
        if (duration - durationDelta < MIN_DURATION) {
            durationDelta = duration - MIN_DURATION;
        }
        this._visibleRange.zoom(durationDelta, offset, this._fullRange);
        this.emit();
    }

    fullZoomOut(): void {
        this._visibleRange.start = this._fullRange.start;
        this._visibleRange.end = this._fullRange.end;
        this._targetScrollMs = undefined;
        this.emit();
        // console.log('full zoom out')
    }

    stepScrollToStartTime(targetT: ms, step: number = cfg.SCROLL_STEP): boolean {
        // Sanitize scroll start time aim
        if (targetT > this._fullRange.end - this._visibleRange.duration) {
            targetT = this._fullRange.end - this._visibleRange.duration;
        }
        if (targetT < this._fullRange.start) {
            targetT = this._fullRange.start;
        }

        const dt = targetT - this._visibleRange.start;
        if (dt) {
            const offset = Math.round(dt * step);
            this._visibleRange.shift(offset);
            return true;
        } else {
            return false;
        }
        // TODO: check why not calling emit() here
    }

    private scrollAnimationStartTime: ms;
    private initialScrollMs: ms;
    private _targetScrollMs: ms;
    private animationStep: int = 0;

    get targetScrollMs(): number {
        return this._targetScrollMs || this.visibleRange.start;
    }

    jumpScrollTo(targetT: ms, animate: boolean = false): boolean {
        if (animate) {
            this.scrollAnimationStartTime = Date.now();
            this.initialScrollMs = this._visibleRange.start;
            this._targetScrollMs = targetT;
        } else {
            return this.stepScrollToStartTime(targetT, 1.0);
        }
    }
}
