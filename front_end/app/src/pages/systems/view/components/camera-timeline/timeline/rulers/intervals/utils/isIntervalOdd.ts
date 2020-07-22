import { timeStampMs, durationMs } from '../../../basic_types/time'
import IrregularLengthInterval from '../IrregularLengthInterval'

export function isIntervalOdd (
  t: timeStampMs,
  d: IrregularLengthInterval
) {
  const date = new Date(t)
  let v
  let result
  switch (d) {
    case 'month':
      v = date.getMonth() + 1
      break
    case 'quarter-year':
      v = (date.getMonth() + 1) % 3
      break
    case 'half-year':
      v = (date.getMonth() + 1) % 6
      break
    case 'year':
      v = date.getFullYear()
      break
    case 'decade':
      v = date.getFullYear() % 10
      break
    case 'century':
      v = date.getFullYear() % 100
      break
    // case 'millenia':
    //   v = date.getFullYear() % 1000
    //   break
    default:
      d = <durationMs>d
      return (t / d) % 2 === 1
  }
  return v % 2 === 1
}

export default isIntervalOdd
