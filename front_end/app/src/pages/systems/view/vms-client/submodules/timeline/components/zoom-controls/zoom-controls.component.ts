import { Component, OnInit, HostListener } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { animationFrameScheduler, interval } from 'rxjs';

import { PlaybackService } from '@vms-client/submodules/playback/services/playback.service';
import { VmsState, VMS_MODE } from '@vms-client/submodules/vms/datatypes/VmsState';
import { VideoManagementSystemService } from '@vms-client/submodules/vms/services/vms.service';
import { float, int, ms } from '@vms-client/utils/type-aliases';

import { TimelineService } from '../../services/timeline.service';
import type {
    TimelineServiceStatus,
} from '../../services/timeline.services.types';

type signType = int; // -1 | 0 | 1

@UntilDestroy()
@Component({
    selector: 'zoom-controls',
    templateUrl: './zoom-controls.component.html',
    styleUrls: ['./zoom-controls.component.scss']
})
export class ZoomControlsComponent implements OnInit {
    protected state: TimelineServiceStatus;
    public disabled: boolean = true;
    public canZoomIn: boolean = false;
    public canZoomOut: boolean = false;

    constructor(
        public timeline: TimelineService,
        public vms: VideoManagementSystemService,
        public playback: PlaybackService
    ) {
    }

    private _onAnimationFrame(): void {
        this.performZoomingStep();
    }

    public ngOnInit(): void {
        this.timeline.subject
            .pipe(untilDestroyed(this))
            .subscribe((s: TimelineServiceStatus) => {
                this.onTimelineSubjectChange(s);
            });

        this.vms.subject
            .pipe(untilDestroyed(this))
            .subscribe((s: VmsState) => {
                this.onVmsSubjectChange(s);
            });

        interval(0, animationFrameScheduler)
            .pipe(untilDestroyed(this))
            .subscribe(() => {
                this._onAnimationFrame();
            });
    }

    public onTimelineSubjectChange(state: TimelineServiceStatus): void {
        this.state = state;
        this._updateEnabledDisabled();
    }

    public onVmsSubjectChange(state: VmsState): void {
        this._updateEnabledDisabled();
    }

    protected _updateEnabledDisabled(): void {
        const vmsState = this.vms.subject.getValue();
        this.disabled = vmsState.mode !== VMS_MODE.CAMERA_SELECTED;
        this.canZoomIn = (!this.disabled && this.state?.zoom?.canZoomIn) || false;
        this.canZoomOut = (!this.disabled && this.state?.zoom?.canZoomOut) || false;
    }

    protected _zoomingSign: signType = 0;
    protected _zoomingStartedTimestamp: ms;

    public startZooming($event: MouseEvent, sign: signType): void {
        if ($event.button !== 0) {
            return;
        }
        this._zoomingSign = sign;
        this._zoomingStartedTimestamp = Date.now();
    }

    public stopZooming(): void {
        const sinceZoomingStarted = Date.now() - this._zoomingStartedTimestamp;
        const fastClickEdge: ms = 200;
        if (sinceZoomingStarted < fastClickEdge) {
            this.wheelZoom(40 * this._zoomingSign);
        }
        this._zoomingSign = 0;
    }

    @HostListener('mouseleave')
    public onMouseLeave(): void {
        this.stopZooming();
    }

    public performZoomingStep(): void {
        if (this._zoomingSign) {
            this.wheelZoom(this._zoomingSign);
        }
    }

    public wheelZoom(delta: int, offset: float = 0.5): void {
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

    public fullZoomOut(): void {
        this.timeline.fullZoomOut();
    }

    public strongZoomIn(): void {
        this.wheelZoom(80);
    }
}
