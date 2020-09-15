import { int } from '../../basic_types/numbers'
import IrregularIntervalSerif from './IrregularIntervalSerif'

export interface WeightedIrregularIntervalSerif extends IrregularIntervalSerif {
  weight: int
}

export default WeightedIrregularIntervalSerif
