import RegularLengthInterval from '../intervals/RegularLengthInterval'
import WeightedRegularIntervalSerif from '../serifs/WeightedRegularIntervalSerif'
import AbstractIntervalSetExpander from './AbstractIntervalSetExpander'
import { timeStampMs } from '../../numberTypeAliases'


export class RegularLengthIntervalSetExpander extends AbstractIntervalSetExpander {

  public expand (
    intervals: Array<RegularLengthInterval>,
    skipIntervals: Array<RegularLengthInterval> = [],
  ): Array<WeightedRegularIntervalSerif> {
    return this.getSerifTimes(intervals[0], skipIntervals).map((when: timeStampMs) => ({
      when,
      ...this.getSerifIntervalAndWeight(when, intervals),
    }))
  }

  protected getSerifIntervalAndWeight (when: timeStampMs, intervals: Array<RegularLengthInterval>) {
    for (let i = intervals.length - 1; i >= 0; i--) {
      const interval = intervals[i]
      if (when % interval === 0) {
        return {
          weight: i + 1,
          interval
        }
      }
    }
    console.error('serif misaligned', when, intervals)
    return {
      weight: 0,
      interval: -1
    }
  }

  public getSerifTimes (
    interval,
    skipIntervals: Array<RegularLengthInterval> = []
  ): Array<RegularLengthInterval> {
    // console.log('get(Regular)IntervalSerifTimes', interval, skipIntervals)
    const first = Math.floor(this.visibleRange.startTime / interval) * interval
    const last = Math.ceil(this.visibleRange.endTime / interval) * interval
    const result = [ first, ]
    let t = first + interval
    let MAX = 1000, i = 0
    while (t < last && i++ < MAX) {
      if (!this.intervalShouldBeSkipped(t, skipIntervals)) {
        result.push(t)
      }
      t += interval
    }
    if (i >= MAX) {
      console.error('too many serifs')
    }
    result.push(last)
    // console.log('get(Regular)IntervalSerifTimes result', result)
    return result
  }

  protected intervalShouldBeSkipped (
    t: timeStampMs,
    skipIntervals: Array<RegularLengthInterval> = []
  ): boolean {
    for (let i = 0; i < skipIntervals.length; i++) {
      let s = skipIntervals[i]
      if (t % s === 0) return true
    }
    return false
  }
}
export default RegularLengthIntervalSetExpander
