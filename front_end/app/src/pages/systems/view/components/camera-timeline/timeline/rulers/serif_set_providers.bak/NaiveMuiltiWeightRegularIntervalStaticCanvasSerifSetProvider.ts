import AbstractSerifSetProvider from './AbstractSerifSetProvider'
import WeightedRegularIntervalSerif from '../serifs/WeightedRegularIntervalSerif'
import { timeStampMs } from '../../numberTypeAliases'
import RegularLengthInterval from '../intervals/RegularLengthInterval'
import regularLengthIntervals from '../intervals/regularLengthIntervals'
import IDuratedTimeRange from '../../timeRanges/IDuratedTimeRange'


export class NaiveMuiltiWeightRegularIntervalStaticCanvasSerifSetProvider extends AbstractSerifSetProvider {

  constructor (
    protected visibleRange: IDuratedTimeRange,
    protected canvas: HTMLCanvasElement,
    protected MIN_WIDTH = 15 * devicePixelRatio,
    protected WEIGHT_COUNT_TO_RETURN = 4,
  ) {
    super(visibleRange, canvas)
  }

  public getSerifs (): Array<WeightedRegularIntervalSerif> {
    const intervals = this.getIntervals()
    return this.getSerifTimes(intervals[0]).map((when: timeStampMs) => ({
      ...this.getSerifWeightAndInterval(when, intervals),
      when,
    }))
  }

  protected getSerifWeightAndInterval (when: timeStampMs, intervals: Array<RegularLengthInterval>) {
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
      interval: undefined
    }
  }

  protected getSerifTimes (interval): Array<timeStampMs> {
    const first = Math.floor(this.visibleRange.startTime / interval) * interval
    const last = Math.ceil(this.visibleRange.endTime / interval) * interval
    const result = [ first, ]
    let t = first + interval
    while (t < last) {
      result.push(t)
      t += interval
    }
    result.push(last)
    return result
  }

  protected getIntervals (): Array<RegularLengthInterval> {
    const smallestInterval = this.getSmallestInterval()
    const index = regularLengthIntervals.findIndex((rli => rli === smallestInterval))
    return regularLengthIntervals.slice(index, index + this.WEIGHT_COUNT_TO_RETURN)
  }

  protected getSmallestInterval (): RegularLengthInterval {
    for (let interval of regularLengthIntervals) {
      const displayWidth = interval * this.pxPerMs
      if (displayWidth >= this.MIN_WIDTH) {
        return interval
      }
    }
    return this.widestInterval
  }

  protected get widestInterval (): RegularLengthInterval {
    return regularLengthIntervals[regularLengthIntervals.length - 1]
  }
}

export default NaiveMuiltiWeightRegularIntervalStaticCanvasSerifSetProvider
