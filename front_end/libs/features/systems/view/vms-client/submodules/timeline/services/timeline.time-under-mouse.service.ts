import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

import { ms, px } from '@view/datatypes/type-aliases';

import { calcOffsetX } from '../calculate-coordinates';

import { TimelineService } from './timeline.service';
import type { TimelineTimeUnderMouseServiceStatus } from './timeline.services.types';

@Injectable({
    providedIn: 'root',
})
export class TimelineTimeUnderMouseService {
    private isMouseInside: boolean = false;
    private timeUnderMouse: ms = -1;
    private offsetX: px = -1;
    private pressed: boolean = false;

    subject = new Subject<TimelineTimeUnderMouseServiceStatus>();

    private emit(): void {
        this.subject.next({
            isMouseInside: this.isMouseInside,
            timeUnderMouse: this.timeUnderMouse,
            offsetX: this.offsetX,
            pressed: this.pressed,
        });
    }

    constructor(private timeline: TimelineService) {}

    handleMouseDown(): void {
        if (!this.pressed) {
            this.pressed = true;
            this.emit();
        }
    }

    handleMouseUp(): void {
        if (this.pressed) {
            this.pressed = false;
            this.emit();
        }
    }

    handleMouseMove(e: MouseEvent | TouchEvent): void {
        this.offsetX = calcOffsetX(e);
        this.timeUnderMouse = this.timeline.domOffsetXtoTime(this.offsetX);
        this.emit();
    }

    handleMouseEnter(e: MouseEvent): void {
        this.isMouseInside = true;
        this.handleMouseMove(e);
    }

    handleMouseLeave(e: MouseEvent): void {
        this.isMouseInside = false;
        this.timeUnderMouse = -1;
        this.offsetX = -1;
        this.emit();
    }

    updateTime(): void {
        if (!this.isMouseInside) {
            return;
        }
        this.timeUnderMouse = this.timeline.domOffsetXtoTime(this.offsetX);
        this.emit();
    }
}
