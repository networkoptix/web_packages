import {
    DAY,
    HOUR,
    MINUTE,
    ROUGH_MONTH,
    ROUGH_YEAR,
    SECOND,
} from '../intervals/regularLengthIntervals';

import { LABEL_FORMATS as LF } from './label_formats';

export const primaryRulerDateFormats = {
    [SECOND]: LF.SECONDS_ONLY,
    [5 * SECOND]: LF.SECONDS_ONLY,
    [10 * SECOND]: LF.SECONDS_ONLY,
    [30 * SECOND]: LF.SECONDS_ONLY,
    [MINUTE]: LF.HOURS_24_SECONDS,
    [5 * MINUTE]: LF.HOURS_24,
    [10 * MINUTE]: LF.HOURS_24,
    [30 * MINUTE]: LF.HOURS_24,
    [HOUR]: LF.HOURS_24,
    [3 * HOUR]: LF.HOURS_24,
    [6 * HOUR]: LF.HOURS_24,
    [12 * HOUR]: LF.HOURS_24,
    [DAY]: LF.DAY,

    [ROUGH_MONTH]: LF.MONTH,
    [3 * ROUGH_MONTH]: LF.MONTH,
    [6 * ROUGH_MONTH]: LF.MONTH,
    [ROUGH_YEAR]: LF.YEAR,
    [10 * ROUGH_YEAR]: LF.YEAR,
    [100 * ROUGH_YEAR]: LF.YEAR,

    month: LF.MONTH,
    'quarter-year': LF.MONTH,
    'half-year': LF.MONTH,
    year: LF.YEAR,
    decade: LF.YEAR,
    century: LF.YEAR,
};
