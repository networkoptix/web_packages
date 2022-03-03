import { Component, OnInit, OnDestroy } from '@angular/core';

import { TimelineExtendToNowService } from '@vms-client/submodules/timeline/services/timeline.extend-to-now.service';
import { TimelineService } from '@vms-client/submodules/timeline/services/timeline.service';

@Component({
    selector: 'page-timeline',
    templateUrl: './timeline-page.component.html',
    styleUrls: ['./timeline-page.component.scss']
})
export class TimelinePageComponent implements OnInit, OnDestroy {
    public constructor(
        public timeline: TimelineService,
        public timelineExtendToNow: TimelineExtendToNowService
    ) {
    }

    protected _animationFrameRequestHandler: number;

    public ngOnInit(): void {
        const now = Date.now();
        if (!this.timeline.fullRange.duration) {
            const DURATION = 12 * 31 * 24 * 60 * 60 * 1000;
            this.timeline.reset(now - DURATION, now);
        }

        this._animationFrameRequestHandler =
            requestAnimationFrame(this.onAnimationFrame.bind(this));
    }

    public onAnimationFrame(): void {
        // this.timelineExtendToNow.extendToNow()

        this._animationFrameRequestHandler =
            requestAnimationFrame(this.onAnimationFrame.bind(this));
    }

    public ngOnDestroy(): void {
        cancelAnimationFrame(this._animationFrameRequestHandler);
    }
}
