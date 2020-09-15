import { SECOND, MINUTE, HOUR } from './regularLengthIntervals'
import IrregularLengthInterval from './IrregularLengthInterval'


// assert ordered
export const irregularLengthIntervals: Array<IrregularLengthInterval> = [
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
]

export default irregularLengthIntervals
