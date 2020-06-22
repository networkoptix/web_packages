import RegularLengthInterval from '../intervals/RegularLengthInterval'
import WeightedRegularIntervalSerif from '../serifs/WeightedRegularIntervalSerif'
import AbstractIntervalSetExpander from './AbstractIntervalSetExpander'
import IDuratedTimeRange from '../../timeRanges/IDuratedTimeRange'
import RegularLengthIntervalSetExpander from './RegularLengthIntervalSetExpander'
import WeightedIrregularIntervalSerif from '../serifs/WeightedIrregularIntervalSerif'
import IrregularLengthInterval from '../intervals/IrregularLengthInterval'
import { isAlignedByIrregularInterval } from '../intervals/utils/isAlignedByIrregularInterval'
import { timeStampMs } from '../../numberTypeAliases'
import alignTimeStamp from '../intervals/utils/alignTimeStamp'


export class IrregularLengthIntervalSetExpander extends AbstractIntervalSetExpander {

  protected regularExpander: RegularLengthIntervalSetExpander

  constructor (
    protected visibleRange: IDuratedTimeRange
  ) {
    super(visibleRange)
    this.regularExpander = new RegularLengthIntervalSetExpander(visibleRange)
  }

  public expand (
    intervals: Array<IrregularLengthInterval>,
    skipIntervals: Array<RegularLengthInterval> = []
  ): Array<WeightedIrregularIntervalSerif> {
    // console.log('(TOP) expand', intervals)
    if (!intervals || !intervals.length) {
      console.error('IrregularLengthIntervalSetExpander::expand empty intervals', intervals, skipIntervals)
      return
    }
    return this.getSerifTimes(intervals[0], skipIntervals).map((when: timeStampMs) => ({
      when,
      ...this.getSerifIntervalAndWeight(when, intervals),
    }))
  }

  protected getSerifIntervalAndWeight (when: timeStampMs, intervals: Array<IrregularLengthInterval>) {
    if (isNaN(when)) {
      console.error('getSerifIntervalAndWeight: `when` is NaN')
      return {
        weight: 0,
        interval: -1,
      }
    }
    for (let i = intervals.length - 1; i >= 0; i--) {
      const interval = intervals[i]
      if (isAlignedByIrregularInterval(when, interval)) {
        return {
          weight: i + 1,
          interval,
        }
      }
    }
    console.error('serif misaligned', when, intervals)
    return {
      weight: 0,
      interval: -1,
    }
  }

  protected getSerifTimes (
    interval: IrregularLengthInterval,
    skipIntervals: Array<RegularLengthInterval> = []
  ): Array<timeStampMs> {
    // console.log('(TOP) getSerifTimes', interval, skipIntervals)
    return typeof(interval) === 'string' ?
      this.getIrregularIntervalSerifTimes(interval, skipIntervals) :
      this.regularExpander.getSerifTimes(interval, skipIntervals)
  }

  protected getIrregularIntervalSerifTimes (
    interval: IrregularLengthInterval,
    skipIntervals: Array<RegularLengthInterval> = []
  ) {
    // console.log('getIrregularIntervalSerifTimes', interval, skipIntervals)
    const first = alignTimeStamp(this.visibleRange.startTime, interval, 'left')
    const last = alignTimeStamp(this.visibleRange.endTime, interval, 'right')
    const result = [ first, ]
    let t = alignTimeStamp(first, interval, 'right')
    let i = 0, max = 300;
    while (t < last) {
      if (!this.intervalShouldBeSkipped(t, skipIntervals)) {
        result.push(t)
      }
      const newT = alignTimeStamp(t, interval, 'right')
      if (newT === t) {
        console.error('definitely an infinite loop at getIrregularIntervalSerifTimes', t, interval)
        break
      }
      t = newT
      if (i++ > max) {
        console.error('looks like an infinite loop at getIrregularIntervalSerifTimes', t, interval, result)
        break;
      }
    }
    result.push(last)
    // console.log('getIrregularIntervalSerifTimes result', result) 
    return result
  }

  protected intervalShouldBeSkipped (
    t: timeStampMs,
    skipIntervals: Array<RegularLengthInterval> = []
  ): boolean {
    for (let i = 0; i < skipIntervals.length; i++) {
      let s = skipIntervals[i]
      if (isAlignedByIrregularInterval(t, s)) return true
    }
    return false
  }

}
export default IrregularLengthIntervalSetExpander
