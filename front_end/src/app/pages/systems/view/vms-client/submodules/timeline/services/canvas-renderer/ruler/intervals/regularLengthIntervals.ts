import { RegularLengthInterval } from './RegularLengthInterval';

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const ROUGH_MONTH = 31 * DAY;
export const ROUGH_YEAR = 366 * DAY;
export const ROUGH_DECADE = 10 * ROUGH_YEAR;
export const ROUGH_CENTURY = 100 * ROUGH_YEAR;

// assert ordered
export const regularLengthIntervals: Array<RegularLengthInterval> = [
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
    DAY,
    ROUGH_MONTH,
    3 * ROUGH_MONTH,
    6 * ROUGH_MONTH,
    ROUGH_YEAR,
    10 * ROUGH_YEAR,
    100 * ROUGH_YEAR,
    1000 * ROUGH_YEAR
];
