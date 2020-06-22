import { int } from '../../numberTypeAliases'
import IrregularIntervalSerif from './IrregularIntervalSerif'

export interface WeightedIrregularIntervalSerif extends IrregularIntervalSerif {
  weight: int
}

export default WeightedIrregularIntervalSerif
