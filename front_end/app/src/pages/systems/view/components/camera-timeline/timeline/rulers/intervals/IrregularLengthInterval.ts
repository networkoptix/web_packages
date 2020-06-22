import { durationMs } from '../../numberTypeAliases';

export type IrregularLengthInterval =
  // 'millenia' |
  'century' |
  'decade' |
  'year' |
  'half-year' |
  'quarter-year' |
  'month' |
  // 'week' |
  durationMs

export default IrregularLengthInterval
