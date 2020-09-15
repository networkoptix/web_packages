import Serif from './Serif'
import IrregularLengthInterval from '../intervals/IrregularLengthInterval'

export interface IrregularIntervalSerif extends Serif {
  interval: IrregularLengthInterval,
}

export default IrregularIntervalSerif
