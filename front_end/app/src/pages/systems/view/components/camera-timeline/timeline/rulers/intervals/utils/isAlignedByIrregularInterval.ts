import IrregularLengthInterval from '../IrregularLengthInterval';
import { timeStampMs } from '../../../numberTypeAliases';
import alignTimeStamp from './alignTimeStamp';

export const isAlignedByIrregularInterval = (
  when: timeStampMs,
  interval: IrregularLengthInterval
) => {
  if (typeof(interval) === 'number') {
    return when % interval === 0
  } else {
    return when === alignTimeStamp(when, interval)
  }
}
