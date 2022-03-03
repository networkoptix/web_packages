import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Subscription } from 'rxjs';

import { PlaybackService } from '@vms-client/submodules/playback/services/playback.service';
import { VmsState, VMS_MODE } from '@vms-client/submodules/vms/datatypes/VmsState';
import { VideoManagementSystemService } from '@vms-client/submodules/vms/services/vms.service';
import { float, int, ms } from '@vms-client/utils/type-aliases';

import { TimelineService, TimelineServiceStatus } from '../../services/timeline.service';

type signType = int; // -1 | 0 | 1

@Component({
    selector: 'zoom-controls',
    templateUrl: './zoom-controls.component.html',
    styleUrls: ['./zoom-controls.component.scss']
})
export class ZoomControlsComponent implements OnInit, OnDestroy {
    protected timelineSubscription: Subscription;
    protected vmsSubscription: Subscription;
    protected state: TimelineServiceStatus;
    public disabled: boolean = true;
    public canZoomIn: boolean = false;
    public canZoomOut: boolean = false;

    constructor(
        public timeline: TimelineService,
        public vms: VideoManagementSystemService,
        public playback: PlaybackService
    ) {
        this.onTimelineSubjectChange = this.onTimelineSubjectChange.bind(this);
        this.onVmsSubjectChange = this.onVmsSubjectChange.bind(this);
    }

    protected _animationFrameRequestHandler: number;

    public onAnimationFrame(): void {
        this.performZoomingStep();
        setTimeout(() => {
            this._animationFrameRequestHandler = requestAnimationFrame(() =>
                this.onAnimationFrame()
            );
        }, this.timeline.renderFps);
    }

    public ngOnInit(): void {
        this.timelineSubscription = this.timeline.subject.subscribe(
            this.onTimelineSubjectChange
        );
        this.vmsSubscription = this.vms.subject.subscribe(
            this.onVmsSubjectChange
        );
        this._animationFrameRequestHandler = requestAnimationFrame(() =>
            this.onAnimationFrame()
        );
    }

    public ngOnDestroy(): void {
        this.timelineSubscription.unsubscribe();
        this.vmsSubscription.unsubscribe();
        cancelAnimationFrame(this._animationFrameRequestHandler);
    }

    public onTimelineSubjectChange(state: TimelineServiceStatus) {
        this.state = state;
        this._updateEnabledDisabled();
    }

    public onVmsSubjectChange(state: VmsState) {
        this._updateEnabledDisabled();
    }

    protected _updateEnabledDisabled() {
        const vmsState = this.vms.subject.getValue();
        this.disabled = vmsState.mode !== VMS_MODE.CAMERA_SELECTED;
        this.canZoomIn = (!this.disabled && this.state?.zoom?.canZoomIn) || false;
        this.canZoomOut = (!this.disabled && this.state?.zoom?.canZoomOut) || false;
    }

    protected _zoomingSign: signType = 0;
    protected _zoomingStartedTimestamp: ms;

    public startZooming($event: MouseEvent, sign: signType) {
        if ($event.button !== 0) {
            return;
        }
        this._zoomingSign = sign;
        this._zoomingStartedTimestamp = Date.now();
    }

    public stopZooming() {
        const sinceZoomingStarted = Date.now() - this._zoomingStartedTimestamp;
        const fastClickEdge: ms = 200;
        if (sinceZoomingStarted < fastClickEdge) {
            this.wheelZoom(40 * this._zoomingSign);
        }
        this._zoomingSign = 0;
    }

    @HostListener('document:mouseup')
    public onMouseUp() {
        this.stopZooming();
    }

    public performZoomingStep() {
        if (this._zoomingSign) {
            this.wheelZoom(this._zoomingSign);
        }
    }

    public wheelZoom(delta: int, offset: float = 0.5) {
        const duration = this.timeline.visibleRange.duration;
        const MIN_DURATION = this.timeline.canvasGeometry.width * this.timeline.canvasGeometry.dpr;
        const step = 0.01;
        let durationDelta = duration * step * delta;
        if (duration - durationDelta < MIN_DURATION) {
            durationDelta = duration - MIN_DURATION;
        }
        if (!this.playback.isBeyondVisibleRange) {
            offset = this.playback.relativeOffset;
        }
        this.timeline.zoom(durationDelta, offset);
    }

    public fullZoomOut() {
        this.timeline.fullZoomOut();
    }

    public strongZoomIn() {
        this.wheelZoom(80);
    }
}
