import { Injectable } from '@angular/core';

import { TimelineService } from './timeline.service';
import { TimelineTimeUnderMouseService } from './timeline.time-under-mouse.service';

@Injectable({
    providedIn: 'root'
})
export class TimelineExtendToNowService {
    constructor(
        protected timeline: TimelineService,
        protected timeUnderMouse: TimelineTimeUnderMouseService
    ) {}

    public extendToNow(): void {
        this.timeline.extendToNow();
        this.timeUnderMouse.updateTime();
    }
}
