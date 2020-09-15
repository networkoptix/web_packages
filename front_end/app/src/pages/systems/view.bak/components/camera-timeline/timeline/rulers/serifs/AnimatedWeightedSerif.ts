import { float } from '../../basic_types/numbers'
import Serif from './Serif'

export interface AnimatedWeightedSerif extends Serif {
  weight: float
}

export default AnimatedWeightedSerif
