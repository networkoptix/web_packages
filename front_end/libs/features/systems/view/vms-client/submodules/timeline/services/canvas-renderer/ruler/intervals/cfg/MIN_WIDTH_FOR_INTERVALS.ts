import { SECOND, MINUTE, HOUR, DAY } from '../regularLengthIntervals';

export const MIN_WEIGHT = 0;
export const MAX_WEIGHT = 4;

export const MIN_WIDTHS_FOR_INTERVALS = {
    500: [15, Infinity, Infinity, Infinity],
    [SECOND]: [15, 50, Infinity, Infinity],
    [5 * SECOND]: [15, 50, 250, Infinity],
    [10 * SECOND]: [15, 50, 500, 1000],
    [30 * SECOND]: [15, 50, 300, 1500],
    [MINUTE]: [15, 50, 100, 300],
    [5 * MINUTE]: [15, 50, 250, 500],
    [10 * MINUTE]: [15, 50, 500, 1000],
    [30 * MINUTE]: [15, 50, 300, 1500],
    [HOUR]: [15, 50, 100, 300],
    [3 * HOUR]: [15, 50, 300, 900],
    [6 * HOUR]: [15, 50, 600, 1800],
    [12 * HOUR]: [15, 50, 200, 1200],
    [DAY]: [5, 20, 100, 200],

    month: [5, 60, Infinity, 600],
    'quarter-year': [5, 60, 1800, 9000],
    'half-year': [5, 60, 360, 3600],
    year: [15, 40, 120, 720],
    decade: [15, 40, 400, 9000],
    century: [15, 40, 400, 4000],
};
