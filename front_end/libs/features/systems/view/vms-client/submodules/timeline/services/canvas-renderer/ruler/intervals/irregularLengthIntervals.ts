import { IrregularLengthInterval } from './IrregularLengthInterval';
import { HOUR, MINUTE, SECOND } from './regularLengthIntervals';

// assert ordered
export const irregularLengthIntervals: Array<IrregularLengthInterval> = [
    500,
    SECOND, // double entry for SECOND is not a typo here!
    SECOND,
    5 * SECOND,
    10 * SECOND,
    30 * SECOND,
    MINUTE,
    5 * MINUTE,
    10 * MINUTE,
    30 * MINUTE,
    HOUR,
    3 * HOUR,
    6 * HOUR,
    12 * HOUR,
    24 * HOUR,
    'month',
    'quarter-year',
    'half-year',
    'year',
    'decade',
    'century',
    // 'millenia',
];
