import { timeStampMs, durationMs } from '../../../numberTypeAliases'
import IrregularLengthInterval from '../IrregularLengthInterval'


export function alignTimeStamp (
  t: timeStampMs,
  d: IrregularLengthInterval,
  alignment: 'left' | 'right' = 'left'
) {
  const date = new Date(t)
  const incIfRight = alignment === 'right' ? 1 : 0
  const round = Math[{
    left: 'floor',
    right: 'ceil'
  }[alignment]]

  // console.log('ATS', t, d, alignment)

  switch (d) {
    // case 'day':
    //   date.setHours(0, 0, 0, 0)
    //   break
    case 'month':
      date.setHours(0, 0, 0, 0)
      date.setDate(1)
      if (alignment === 'right') {
        date.setMonth(date.getMonth() + 1)
      }
      break
    case 'quarter-year':
      date.setHours(0, 0, 0, 0)
      date.setMonth(round(date.getMonth() / 3 + 0.1) * 3)
      break
    case 'half-year':
      date.setHours(0, 0, 0, 0)
      date.setMonth(round(date.getMonth() / 6 + 0.1) * 6)
      break
    case 'year':
      date.setHours(0, 0, 0, 0)
      date.setFullYear(date.getFullYear() + incIfRight, 0, 1)
      break
    case 'decade':
      date.setHours(0, 0, 0, 0)
      date.setFullYear((round(date.getFullYear() / 10 + 0.1) + incIfRight) * 10, 0, 1)
      break
    case 'century':
      date.setHours(0, 0, 0, 0)
      date.setFullYear((round(date.getFullYear() / 100 + 0.1) + incIfRight) * 100, 0, 1)
      break
    // case 'millenia':
    //   date.setHours(0, 0, 0, 0)
    //   date.setFullYear((round(date.getFullYear() / 1000 + 0.1) + incIfRight) * 1000, 0, 1)
    //   break
    default:
      d = <durationMs>d
      return round(t / d + 0.1) * d
  }
  // console.log('ATS', t, d, alignment, date)
  return date.getTime()
}

export default alignTimeStamp
