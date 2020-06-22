import AbstractSerifSetProvider from './AbstractSerifSetProvider'
import { timeStampMs } from '../../numberTypeAliases'
import RegularLengthInterval from '../intervals/RegularLengthInterval'
import regularLengthIntervals from '../intervals/regularLengthIntervals'
import IDuratedTimeRange from '../../timeRanges/IDuratedTimeRange'
import WeightedRegularIntervalSerif from '../serifs/WeightedRegularIntervalSerif'


export class SingleWeightRegularIntervalStaticSerifSetProvider extends AbstractSerifSetProvider {

  constructor (
    protected visibleRange: IDuratedTimeRange,
    protected canvas: HTMLCanvasElement,
    protected MIN_WIDTH = 15 * devicePixelRatio
  ) {
    super(visibleRange, canvas)
  }

  public getSerifs (): Array<WeightedRegularIntervalSerif> {
    const interval = this.getInterval()
    return this.getSerifTimes(interval).map((when: timeStampMs) => ({
      weight: 1,
      when,
      interval,
    }))
  }

  protected getSerifTimes (interval: RegularLengthInterval): Array<timeStampMs> {
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

  protected getInterval (): RegularLengthInterval {
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

export default SingleWeightRegularIntervalStaticSerifSetProvider
