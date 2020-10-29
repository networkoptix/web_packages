import LABEL_FORMATS from './label_formats'
import { SECOND, MINUTE, HOUR, DAY, ROUGH_CENTURY, ROUGH_YEAR, ROUGH_MONTH } from '../intervals/regularLengthIntervals'

export const topRulerDateFormats = {

  [SECOND]: { top: 'd mmm HH:MM:ss', serif: 'ss"s"', },
  [5 * SECOND]: { top: 'd mmm HH:MM:ss', serif: 'ss"s"', },
  [10 * SECOND]: { top: 'd mmm HH:MM:ss', serif: 'ss"s"', },
  [30 * SECOND]: { top: 'd mmm HH:MM:ss', serif: 'ss"s"', },

  [MINUTE]: { top: 'd mmmm yyyy HH:MM', serif: 'MM', },
  [MINUTE]: { top: 'd mmmm yyyy HH:MM', serif: 'MM', },
  [5 * MINUTE]: { top: 'd mmmm yyyy HH:MM', serif: 'MM', },
  [10 * MINUTE]: { top: 'd mmmm yyyy HH:MM', serif: 'MM', },
  [30 * MINUTE]: { top: 'd mmmm yyyy HH:MM', serif: 'MM', },
  [HOUR]: { top: 'd mmmm yyyy HH:MM', serif: 'MM', },

  // [3 * HOUR]: { top: 'd mmmm yyyy', serif: 'MM', }, // should never happen
  // [6 * HOUR]: { top: 'd mmmm yyyy', serif: 'MM', }, // should never happen
  // [12 * HOUR]: { top: 'd mmmm yyyy', serif: 'MM', }, // should never happen

  [DAY]: { top: LABEL_FORMATS.DAY_OF_YEAR, serif: 'd' },

  // [ROUGH_MONTH]: { top: LABEL_FORMATS.MONTH_AND_YEAR, serif: LABEL_FORMATS.MONTH, },
  'month': { top: LABEL_FORMATS.MONTH_AND_YEAR, serif: LABEL_FORMATS.MONTH, },
  // [3 * ROUGH_MONTH]: { top: LABEL_FORMATS.MONTH_AND_YEAR, serif: LABEL_FORMATS.MONTH, },
  'quarter-year': { top: LABEL_FORMATS.MONTH_AND_YEAR, serif: LABEL_FORMATS.MONTH, },
  // [6 * ROUGH_MONTH]: { top: LABEL_FORMATS.MONTH_AND_YEAR, serif: LABEL_FORMATS.MONTH, },
  'half-year': { top: LABEL_FORMATS.MONTH_AND_YEAR, serif: LABEL_FORMATS.MONTH, },

  // [ROUGH_YEAR]: { top: LABEL_FORMATS.YEAR, serif: LABEL_FORMATS.YEAR, },
  year: { top: LABEL_FORMATS.YEAR, serif: LABEL_FORMATS.YEAR, },

  // [ROUGH_CENTURY]: { top: LABEL_FORMATS.YEAR, serif: LABEL_FORMATS.YEAR, },
  century: { top: LABEL_FORMATS.YEAR, serif: LABEL_FORMATS.YEAR, },
}

export default topRulerDateFormats
