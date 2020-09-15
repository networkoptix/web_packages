import { int } from '../../basic_types/numbers'
import Serif from './Serif'

export interface WeightedSerif extends Serif {
  weight: int
}

export default WeightedSerif
