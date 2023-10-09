// TODO: Combine with time range in timeline folder

import { ms } from '@vms-client/utils/type-aliases';

export interface BaseTimeRange {
    start: ms;
    end: ms;
}

export function newBaseTimeRange(start: ms, end: ms): BaseTimeRange {
    return { start, end };
}

/** Utility functions for time range calculations
 *
 * For two arg methods, the method name goes between the two being compared
 *
 * e.g. rangeA contains rangeB
 */
export class TimeRangeUtils {
    static duration(r: BaseTimeRange): ms {
        return r.end - r.start;
    }

    static contains(a: BaseTimeRange, b: BaseTimeRange): boolean {
        return a.start <= b.start && a.end >= b.end;
    }

    /** i.e. No overlap */
    static isDisjointWith(a: BaseTimeRange, b: BaseTimeRange): boolean {
        return a.start > b.end || a.end < b.start;
    }
}
