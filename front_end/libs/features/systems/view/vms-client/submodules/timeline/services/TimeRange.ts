import { float, ms } from '@view/datatypes/type-aliases';

import { IrregularLengthInterval } from './canvas-renderer/ruler/intervals/IrregularLengthInterval';
import { alignTimeStamp } from './canvas-renderer/ruler/intervals/utils/alignTimeStamp';

export class TimeRange {
    constructor(public start: ms, public end: ms) {}

    get duration(): ms {
        return this.end - this.start;
    }

    shift(offset: ms): void {
        this.start += offset;
        this.end += offset;
    }

    // public moveStartTo(s: ms): void {
    //     const duration = this.duration;
    //     this.start = s;
    //     this.end = s + duration;
    // }

    zoom(durationDelta: ms, offset: float = 0.5, limitingRange: TimeRange): void {
        this.start += Math.round(durationDelta * offset);
        this.end -= Math.round(durationDelta * (1.0 - offset));
        if (this.start < limitingRange.start) {
            this.start = limitingRange.start;
        }
        if (this.end > limitingRange.end) {
            this.end = limitingRange.end;
        }
    }

    fitStart(enclosingRange: TimeRange): void {
        this.start = enclosingRange.start;
    }

    fitEnd(enclosingRange: TimeRange): void {
        this.end = enclosingRange.end;
    }

    // public contains(t: ms): boolean {
    //     return this.start <= t && t <= this.end;
    // }

    clone(): TimeRange {
        return new TimeRange(this.start, this.end);
    }

    iterate(interval: IrregularLengthInterval, tzOffset: ms = 0): Array<ms> {
        const start = alignTimeStamp(this.start + tzOffset, interval, 'left');
        const end = alignTimeStamp(this.end + tzOffset, interval, 'right');
        const result: number[] = [];
        for (let i = start; i <= end; i = alignTimeStamp(i, interval, 'right')) {
            result.push(i - tzOffset);
        }
        return result;
    }
}
