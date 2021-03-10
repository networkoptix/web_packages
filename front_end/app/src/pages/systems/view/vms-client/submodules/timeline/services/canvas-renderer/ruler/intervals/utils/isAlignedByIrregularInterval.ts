import IrregularLengthInterval from '../IrregularLengthInterval'
import { timeStampMs, alignTimeStamp } from './alignTimeStamp'


export const isAlignedByIrregularInterval = (
  when: timeStampMs,
  interval: IrregularLengthInterval
) => {
  const result = typeof(interval) === 'number'
    ? (when - (new Date()).getTimezoneOffset() * 60 * 1000) % interval === 0
      // ? when % interval === 0
    : when === alignTimeStamp(when, interval)
  // console.log('isAbII', new Date(when), when, interval, result)
  return result
}

export default isAlignedByIrregularInterval
