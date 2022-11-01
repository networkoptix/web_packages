import { SECOND, MINUTE, HOUR, DAY } from '../intervals/regularLengthIntervals';
// import { ROUGH_CENTURY, ROUGH_YEAR, ROUGH_MONTH } from '../intervals/regularLengthIntervals'

import { LABEL_FORMATS as LF } from './label_formats';

export const topRulerDateFormats = {

    [SECOND]: { top: 'd mmm HH:MM:ss', serif: 'ss"s"' },
    [5 * SECOND]: { top: 'd mmm HH:MM:ss', serif: 'ss"s"' },
    [10 * SECOND]: { top: 'd mmm HH:MM:ss', serif: 'ss"s"' },
    [30 * SECOND]: { top: 'd mmm HH:MM:ss', serif: 'ss"s"' },

    [MINUTE]: { top: 'd mmmm yyyy HH:MM', serif: 'MM' },
    [MINUTE]: { top: 'd mmmm yyyy HH:MM', serif: 'MM' },
    [5 * MINUTE]: { top: 'd mmmm yyyy HH:MM', serif: 'MM' },
    [10 * MINUTE]: { top: 'd mmmm yyyy HH:MM', serif: 'MM' },
    [30 * MINUTE]: { top: 'd mmmm yyyy HH:MM', serif: 'MM' },
    [HOUR]: { top: 'd mmmm yyyy HH:MM', serif: 'MM' },

    // [3 * HOUR]: { top: 'd mmmm yyyy', serif: 'MM', }, // should never happen
    // [6 * HOUR]: { top: 'd mmmm yyyy', serif: 'MM', }, // should never happen
    // [12 * HOUR]: { top: 'd mmmm yyyy', serif: 'MM', }, // should never happen

    [DAY]: { top: LF.DAY_OF_YEAR, serif: 'd' },

    // [ROUGH_MONTH]: { top: LF.MONTH_AND_YEAR, serif: LF.MONTH, },
    month: { top: LF.MONTH_AND_YEAR, serif: LF.MONTH },
    // [3 * ROUGH_MONTH]: { top: LF.MONTH_AND_YEAR, serif: LF.MONTH, },
    'quarter-year': { top: LF.MONTH_AND_YEAR, serif: LF.MONTH },
    // [6 * ROUGH_MONTH]: { top: LF.MONTH_AND_YEAR, serif: LF.MONTH, },
    'half-year': { top: LF.MONTH_AND_YEAR, serif: LF.MONTH },

    // [ROUGH_YEAR]: { top: LF.YEAR, serif: LF.YEAR, },
    year: { top: LF.YEAR, serif: LF.YEAR },

    // [ROUGH_CENTURY]: { top: LF.YEAR, serif: LF.YEAR, },
    century: { top: LF.YEAR, serif: LF.YEAR }
};
