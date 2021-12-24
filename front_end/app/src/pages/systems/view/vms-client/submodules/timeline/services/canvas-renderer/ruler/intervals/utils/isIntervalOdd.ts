import IrregularLengthInterval from '../IrregularLengthInterval';

import { timeStampMs, durationMs } from './alignTimeStamp';

export function isIntervalOdd (
    t: timeStampMs,
    d: IrregularLengthInterval
) {
    const date = new Date(t);
    let v;
    switch (d) {
        case 'month':
            v = date.getMonth() + 1;
            break;
        case 'quarter-year':
            v = (date.getMonth() + 1) % 3;
            break;
        case 'half-year':
            v = (date.getMonth() + 1) % 6;
            break;
        case 'year':
            v = date.getFullYear();
            break;
        case 'decade':
            v = Math.floor(date.getFullYear() / 10);
            break;
        case 'century':
            v = Math.floor(date.getFullYear() / 100);
            break;
            // case 'millenia':
            //   v = Math.floor(date.getFullYear()) % 1000
            //   break
        default:
            return !!(Math.floor(t / <durationMs>d) % 2);
    }
    return !!(v % 2);
}

export default isIntervalOdd;
