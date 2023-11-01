import { Component, OnInit, HostListener, effect } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { animationFrameScheduler, interval } from 'rxjs';

import { VmsState, VMS_MODE } from '@view/datatypes/VmsState';
import { float, int, ms } from '@view/datatypes/type-aliases';
import { PlaybackService } from '@view/services/playback.service';
import { VideoManagementSystemService } from '@view/services/vms.service';

import { TimelineService } from '../../services/timeline.service';
import type { TimelineServiceStatus } from '../../services/timeline.services.types';

type signType = -1 | 0 | 1;

@UntilDestroy()
@Component({
    selector: 'nx-zoom-controls',
    templateUrl: './zoom-controls.component.html',
    styleUrls: ['./zoom-controls.component.scss'],
})
export class ZoomControlsComponent implements OnInit {
    private timelineStatus: TimelineServiceStatus;
    disabled: boolean = true;
    canZoomIn: boolean = false;
    canZoomOut: boolean = false;

    constructor(
        private timeline: TimelineService,
        private vms: VideoManagementSystemService,
        private playback: PlaybackService,
    ) {
        effect(() => {
            this.updateEnabledDisabled(this.vms.state());
        });
    }

    ngOnInit(): void {
        this.timeline.subject.pipe(untilDestroyed(this)).subscribe(timelineStatus => {
            this.timelineStatus = timelineStatus;
            this.updateEnabledDisabled(this.vms.state());
        });

        interval(0, animationFrameScheduler)
            .pipe(untilDestroyed(this))
            .subscribe(() => {
                if (this.zoomingSign) {
                    this.wheelZoom(this.zoomingSign);
                }
            });
    }

    private updateEnabledDisabled(state: VmsState): void {
        this.disabled = state.mode !== VMS_MODE.CAMERA_SELECTED;
        this.canZoomIn = (!this.disabled && this.timelineStatus?.zoom?.canZoomIn) || false;
        this.canZoomOut = (!this.disabled && this.timelineStatus?.zoom?.canZoomOut) || false;
    }

    private zoomingSign: signType = 0;
    private zoomingStartedTimestamp: ms;

    startZooming($event: MouseEvent, sign: signType): void {
        if ($event.button !== 0) {
            return;
        }
        this.zoomingSign = sign;
        this.zoomingStartedTimestamp = Date.now();
    }

    stopZooming(): void {
        const sinceZoomingStarted = Date.now() - this.zoomingStartedTimestamp;
        const fastClickEdge: ms = 200;
        if (sinceZoomingStarted < fastClickEdge) {
            this.wheelZoom(40 * this.zoomingSign);
        }
        this.zoomingSign = 0;
    }

    @HostListener('mouseleave')
    onMouseLeave(): void {
        this.stopZooming();
    }

    private wheelZoom(delta: int, offset: float = 0.5): void {
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

    fullZoomOut(): void {
        this.timeline.fullZoomOut();
    }

    strongZoomIn(): void {
        this.wheelZoom(80);
    }
}
