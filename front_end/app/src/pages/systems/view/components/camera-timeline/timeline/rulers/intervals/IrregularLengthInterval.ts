import { durationMs } from '../../basic_types/time';

export type IrregularLengthInterval =
  'millenia' |
  'century' |
  'decade' |
  'year' |
  'half-year' |
  'quarter-year' |
  'month' |
  durationMs

export default IrregularLengthInterval
