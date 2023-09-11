import { ms } from '@vms-client/utils/type-aliases';

export type CAMERA_STATUS =
    | 'Live'
    | 'Archive'
    | 'Recording'
    | 'Online'
    | 'Offline'
    | 'Unauthorized';

export class SimpleTimeRange {
    constructor(
        // public start: ms,
        // public end: ms
        public readonly start: ms,
        public readonly end: ms,
    ) {}

    public get duration(): ms {
        return this.end - this.start;
    }

    public clone(): SimpleTimeRange {
        return new SimpleTimeRange(this.start, this.end);
    }

    // public static fromISTR(tr: ISimpleTimeRange): SimpleTimeRange {
    //     return new SimpleTimeRange(tr.start, tr.end);
    // }

    public contains(r: SimpleTimeRange): boolean {
        return this.start <= r.start && this.end >= r.end;
    }

    public isContained(r: SimpleTimeRange): boolean {
        return r.contains(this);
    }

    public isDisjointWith(r: SimpleTimeRange): boolean {
        return this.start > r.end || this.end < r.start;
    }

    public overlapsWith(r: SimpleTimeRange): boolean {
        return !this.isDisjointWith(r);
    }
}

/* It looks like shallow copy was used to pick and/or make writable */
export type sTimeRangeCopy = { start: ms; end: ms };
