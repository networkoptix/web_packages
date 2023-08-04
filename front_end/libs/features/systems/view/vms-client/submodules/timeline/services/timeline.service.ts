import { Injectable } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { DeviceDetectorService } from 'ngx-device-detector';
import { animationFrameScheduler, interval, Subject } from 'rxjs';

import { VideoManagementSystemService } from '@vms-client/submodules/vms/services/vms.service';
import { int, float, ms, px, CanvasGeometry } from '@vms-client/utils/type-aliases';

import { TimeRange } from './TimeRange';
import { cfg } from './timeline.config';
import type { TimelineServiceStatus } from './timeline.services.types';

@UntilDestroy()
@Injectable({
    providedIn: 'root',
})
export class TimelineService {
    public readonly renderFps: number;
    protected _fullRange: TimeRange = new TimeRange(0, 0);
    protected _visibleRange: TimeRange = new TimeRange(0, 0);
    protected _canvasGeometry: CanvasGeometry = { width: 0, height: 0, dpr: 1 };

    protected _subject = new Subject<TimelineServiceStatus>();
    protected _canvasGeometryUpdateRequested: boolean = true;

    public constructor(
        protected vms: VideoManagementSystemService,
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
                this._onAnimationFrame();
            });
    }

    public get canvasGeometryUpdateRequested() {
        return this._canvasGeometryUpdateRequested;
    }

    public requestCanvasGeometryUpdate(): void {
        this._canvasGeometryUpdateRequested = true;
    }

    protected _emit(): void {
        this._subject.next({
            fullRange: this.fullRange,
            visibleRange: this.visibleRange,
            canvasGeometry: this.canvasGeometry,
            zoom: this.zoomStatus,
            canvasGeometryUpdateRequested: this.canvasGeometryUpdateRequested,
        });
    }

    public get zoomStatus() {
        return {
            canZoomIn:
                this._visibleRange.duration / this.canvasGeometry.dpr > this.canvasGeometry.width,
            canZoomOut: this._visibleRange.duration < this._fullRange.duration,
        };
    }

    public get subject() {
        return this._subject;
    }

    public get archiveRange(): TimeRange {
        const sc = this.vms.selectedCamera;
        if (sc?.hasArchive) {
            return new TimeRange(this.fullRange.start, sc.archiveEnd);
        } else {
            return this.fullRange;
        }
    }

    public get fullRange(): TimeRange {
        return this._fullRange.clone();
    }

    public get visibleRange(): TimeRange {
        return this._visibleRange.clone();
    }

    public set visibleRange(r: TimeRange) {
        this._visibleRange.start = Math.max(r.start, this.fullRange.start);
        this._visibleRange.end = Math.min(r.end, this.fullRange.end);
        this._emit();
    }

    public get canvasGeometry(): CanvasGeometry {
        return { ...this._canvasGeometry };
    }

    public reset(start: ms, end: ms): void {
        this._fullRange.start = start;
        this._fullRange.end = end;
        this._visibleRange.start = start;
        this._visibleRange.end = end;
    }

    public extendToNow(): void {
        const serverId = this.vms.selectedCamera.parentServerId;
        const serverTimes = this.vms.serverTimes()?.find(server => (server.serverId = serverId));

        const now = Date.now() - serverTimes.vmsTimeOffset;

        if (this._fullRange.end - this._visibleRange.end < cfg.STICK_TO_LIVE_TRESHOLD) {
            const visibleRangeDurationWas = this._visibleRange.duration;
            this._visibleRange.end = now;
            if (this._visibleRange.start - this._fullRange.start > cfg.STICK_TO_LIVE_TRESHOLD) {
                this._visibleRange.start = this._visibleRange.end - visibleRangeDurationWas;
            }
        }
        this._fullRange.end = now;
        this._emit();
    }

    public setCanvasGeometry(width: px, height: px, dpr: int): void {
        // console.log(this.id, 'setCanvasGeometry', width, height, dpr)
        this._canvasGeometry.width = width;
        this._canvasGeometry.height = height;
        this._canvasGeometry.dpr = dpr;
        this._canvasGeometryUpdateRequested = false;
        this._emit();
    }

    public get msPerCanvasPx(): float {
        // console.log(this.id, 'msPerCanvasPx', this._visibleRange.duration, this._canvasGeometry.width)
        return this._visibleRange.duration / this._canvasGeometry.width;
    }

    public domOffsetXtoTime(x: px): ms {
        return this.canvasOffsetXtoTime(x * this._canvasGeometry.dpr);
    }

    public canvasOffsetXtoTime(x: px): ms {
        return Math.round(this._visibleRange.start + this.msPerCanvasPx * x);
    }

    public timeToDomOffsetX(t: ms): px {
        return Math.round(
            (t - this._visibleRange.start) / (this.msPerCanvasPx * this._canvasGeometry.dpr),
        );
    }

    public timeToCanvasOffsetX(t: ms): px {
        return Math.round((t - this._visibleRange.start) / this.msPerCanvasPx);
    }

    public durationToCanvasWidth(d: ms): px {
        return Math.round(d / this.msPerCanvasPx);
    }

    public durationToDomWidth(d: ms): px {
        return Math.round(this.durationToCanvasWidth(d) / this._canvasGeometry.dpr);
    }

    public domWidthToDuration(w: px): ms {
        return this.canvasWidthToDuration(w * this._canvasGeometry.dpr);
    }

    public canvasWidthToDuration(w: px): ms {
        return Math.round(w * this.msPerCanvasPx);
    }

    public shiftVisibleRange(offset: ms): void {
        // If the visible start is less than full range ignore the move.
        if (
            this.fullRange.start <= this.visibleRange.start + offset &&
            this.visibleRange.end + offset <= this.fullRange.end
        ) {
            this._visibleRange.shift(offset);
            this._emit();
        }
    }

    public zoom(durationDelta: ms, offset: float): void {
        const MIN_DURATION = this.canvasGeometry.width * this.canvasGeometry.dpr;
        const duration = this.visibleRange.duration;
        if (duration - durationDelta < MIN_DURATION) {
            durationDelta = duration - MIN_DURATION;
        }
        this._visibleRange.zoom(durationDelta, offset, this._fullRange);
        this._emit();
    }

    public fullZoomOut(): void {
        this._visibleRange.start = this._fullRange.start;
        this._visibleRange.end = this._fullRange.end;
        this._targetScrollMs = undefined;
        this._emit();
        // console.log('full zoom out')
    }

    protected _sanitizeScrollStartTimeAim(targetT: ms): ms {
        if (targetT > this._fullRange.end - this._visibleRange.duration) {
            targetT = this._fullRange.end - this._visibleRange.duration;
        }
        if (targetT < this._fullRange.start) {
            targetT = this._fullRange.start;
        }
        return targetT;
    }

    public stepScrollToStartTime(targetT: ms, step = cfg.SCROLL_STEP) {
        targetT = this._sanitizeScrollStartTimeAim(targetT);
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

    protected _scrollAnimationStartTime: ms;
    protected _initialScrollMs: ms;
    protected _targetScrollMs: ms;
    protected _animationStep: int = 0;

    public get targetScrollMs() {
        return this._targetScrollMs || this.visibleRange.start;
    }

    public jumpScrollTo(targetT: ms, animate: boolean = false) {
        if (animate) {
            this._scrollAnimationStartTime = Date.now();
            this._initialScrollMs = this._visibleRange.start;
            this._targetScrollMs = targetT;
        } else {
            return this.stepScrollToStartTime(targetT, 1.0);
        }
    }

    protected _sanitizeVisibleRangePosition(): void {
        let diff = this._visibleRange.end - this._fullRange.end;
        if (diff > 0) {
            this._visibleRange.shift(-diff);
        }
        diff = this._fullRange.start - this._visibleRange.start;
        if (diff > 0) {
            this._visibleRange.shift(diff);
        }
    }

    protected _changeVisibleDurationStart(t: ms): void {
        const duration = this._visibleRange.duration;
        this._visibleRange.start = t;
        this._visibleRange.end = t + duration;
        this._sanitizeVisibleRangePosition();
    }

    protected _onAnimationFrame(): void {
        const now = Date.now();
        const diff = now - this._scrollAnimationStartTime;
        if (diff < cfg.SCROLL_ANIMATION_DURATION_MS) {
            this._animationStep++;
            const percentage = diff / cfg.SCROLL_ANIMATION_DURATION_MS;
            const diffMs = this._targetScrollMs - this._initialScrollMs;
            const dMs = Math.round(diffMs * percentage);
            const current = this._initialScrollMs + dMs;
            this._changeVisibleDurationStart(current);
        } else if (this._targetScrollMs) {
            this._changeVisibleDurationStart(this._targetScrollMs);
            this._targetScrollMs = undefined;
            this._animationStep = 0;
        }
        this._emit();
    }
}
