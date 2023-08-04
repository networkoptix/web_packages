import { ms } from '@vms-client/utils/type-aliases';

import { IrregularLengthInterval } from '../IrregularLengthInterval';

export type timeStampMs = ms;
export type durationMs = ms;

export function alignTimeStamp(
    t: timeStampMs,
    d: IrregularLengthInterval,
    alignment: 'left' | 'right' = 'left',
): number {
    const date = new Date(t);
    const incIfRight = alignment === 'right' ? 1 : 0;
    const round =
        Math[
            {
                left: 'floor',
                right: 'ceil',
            }[alignment]
        ];

    switch (d) {
        case 'month':
            date.setHours(0, 0, 0, 0);
            date.setDate(1);
            if (alignment === 'right') {
                date.setMonth(date.getMonth() + 1);
            }
            break;

        case 'quarter-year':
            date.setHours(0, 0, 0, 0);
            date.setDate(1);
            const qy = Math.floor(date.getMonth() / 3);
            date.setMonth((qy + incIfRight) * 3);
            break;

        case 'half-year':
            date.setHours(0, 0, 0, 0);
            date.setDate(1);
            const hy = Math.floor(date.getMonth() / 6);
            date.setMonth((hy + incIfRight) * 6);
            break;

        case 'year':
            date.setHours(0, 0, 0, 0);
            date.setFullYear(date.getFullYear() + incIfRight, 0, 1);
            break;

        case 'decade':
            date.setHours(0, 0, 0, 0);
            date.setFullYear((round(date.getFullYear() / 10 + 0.1) + incIfRight) * 10, 0, 1);
            break;

        case 'century':
            date.setHours(0, 0, 0, 0);
            date.setFullYear((round(date.getFullYear() / 100 + 0.1) + incIfRight) * 100, 0, 1);
            break;

        case 'millenia':
            date.setHours(0, 0, 0, 0);
            date.setFullYear((round(date.getFullYear() / 1000 + 0.1) + incIfRight) * 1000, 0, 1);
            break;

        default:
            const tzoMs = date.getTimezoneOffset() * 60 * 1000;
            const result = (Math.floor((t - tzoMs) / d) + incIfRight) * d + tzoMs;
            return result;
    }
    return date.getTime();
}
