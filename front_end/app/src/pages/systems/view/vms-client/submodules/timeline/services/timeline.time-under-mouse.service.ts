import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

import { ms, px } from '../../../utils/type-aliases';
import TimelineService from './timeline.service';

export interface TimelineTimeUnderMouseServiceStatus {
    isMouseInside: boolean,
    timeUnderMouse: ms,
    offsetX: px,
}

@Injectable({
    providedIn: 'root'
})
export class TimelineTimeUnderMouseService {
    protected _isMouseInside: boolean = false
    protected _timeUnderMouse: ms = -1
    protected _offsetX: px = -1

    protected _subject = new Subject<TimelineTimeUnderMouseServiceStatus>()

    protected _emit () {
        this._subject.next({
            isMouseInside  : this._isMouseInside,
            timeUnderMouse : this._timeUnderMouse,
            offsetX        : this._offsetX
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

    constructor(
        protected timeline: TimelineService
    ) {
    }

    public handleMouseMove (e: MouseEvent) {
        this._offsetX = e.offsetX;
        this._timeUnderMouse = this.timeline.domOffsetXtoTime(e.offsetX);
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
