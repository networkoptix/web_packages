import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

import { NxUtilsService } from '@services/utils.service';
import { ms, px } from '@vms-client/utils/type-aliases';

import TimelineService from './timeline.service';

export interface TimelineTimeUnderMouseServiceStatus {
    isMouseInside: boolean,
    timeUnderMouse: ms,
    offsetX: px,
    pressed: boolean,
}

@Injectable({
    providedIn: 'root'
})
export class TimelineTimeUnderMouseService {
    protected _isMouseInside: boolean = false
    protected _timeUnderMouse: ms = -1
    protected _offsetX: px = -1
    protected _pressed: boolean = false

    protected _subject = new Subject<TimelineTimeUnderMouseServiceStatus>()

    protected _emit () {
        this._subject.next({
            isMouseInside: this._isMouseInside,
            timeUnderMouse: this._timeUnderMouse,
            offsetX: this._offsetX,
            pressed: this._pressed
        });
    }

    public get subject () {
        return this._subject;
    }

    public get isMouseInside (): boolean {
        return this._isMouseInside;
    }

    public get timeUnderMouse (): ms {
        return this._timeUnderMouse;
    }

    public get offsetX (): ms {
        return this._offsetX;
    }

    public get pressed () {
        return this._pressed;
    }

    constructor(
        protected timeline: TimelineService
    ) {
    }

    public handleMouseDown () {
        if (!this._pressed) {
            this._pressed = true;
            this._emit();
        }
    }

    public handleMouseUp () {
        if (this._pressed) {
            this._pressed = false;
            this._emit();
        }
    }

    public handleMouseMove (e: MouseEvent|TouchEvent) {
        this._offsetX = NxUtilsService.calcOffsetX(e);
        this._timeUnderMouse = this.timeline.domOffsetXtoTime(this._offsetX);
        this._emit();
    }

    public handleMouseEnter (e: MouseEvent) {
        this._isMouseInside = true;
        this.handleMouseMove(e);
    }

    public handleMouseLeave (e: MouseEvent) {
        this._isMouseInside = false;
        this._timeUnderMouse = -1;
        this._offsetX = -1;
        this._emit();
    }

    public updateTime () {
        if (!this._isMouseInside) {
            return;
        }
        this._timeUnderMouse = this.timeline.domOffsetXtoTime(this._offsetX);
        this._emit();
    }
}

export default TimelineTimeUnderMouseService;
