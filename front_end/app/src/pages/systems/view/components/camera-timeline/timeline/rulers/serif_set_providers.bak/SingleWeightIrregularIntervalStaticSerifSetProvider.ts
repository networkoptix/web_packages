import AbstractSerifSetProvider from './AbstractSerifSetProvider'
import WeightedIrregularIntervalSerif from '../serifs/WeightedIrregularIntervalSerif'
import { timeStampMs, durationMs } from '../../numberTypeAliases'
import IrregularLengthInterval from '../intervals/IrregularLengthInterval'
import irregularLengthIntervals from '../intervals/irregularLengthIntervals'
import IDuratedTimeRange from '../../timeRanges/IDuratedTimeRange'
import estimateIrregularLengthIntervalPessimistically from '../intervals/utils/estimateIrregularLengthIntervalPessimistically'
import alignTimeStamp from '../intervals/utils/alignTimeStamp'


export class SingleWeightIrregularIntervalStaticSerifSetProvider extends AbstractSerifSetProvider {

  constructor (
    protected visibleRange: IDuratedTimeRange,
    protected canvas: HTMLCanvasElement,
    protected MIN_WIDTH = 15
  ) {
    super(visibleRange, canvas)
  }

  public getSerifs (): Array<WeightedIrregularIntervalSerif> {
    const interval = this.getInterval()
    return this.getSerifTimes(interval).map((when: timeStampMs) => ({
      weight: 1,
      when,
      interval,
    }))
  }

  protected getSerifTimes (interval: IrregularLengthInterval): Array<timeStampMs> {
    return typeof(interval) === 'string' ?
      this.getIrregularIntervalSerifTimes(interval) :
      this.getRegularIntervalSerifTimes(interval)
  }

  protected getIrregularIntervalSerifTimes (interval: IrregularLengthInterval) {
    const first = alignTimeStamp(this.visibleRange.startTime, interval, 'left')
    const last = alignTimeStamp(this.visibleRange.endTime, interval, 'right')
    const result = [ first, ]
    let t = alignTimeStamp(first, interval, 'right')
    let i = 0, max = 300;
    while (t < last) {
      result.push(t)
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
    return result
  }

  protected getRegularIntervalSerifTimes (interval: durationMs) {
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

  protected getInterval (): IrregularLengthInterval {
    for (let interval of irregularLengthIntervals) {
      const displayWidth = estimateIrregularLengthIntervalPessimistically(interval) * this.pxPerMs
      if (displayWidth >= this.MIN_WIDTH) {
        return interval
      }
    }
    return this.widestInterval
  }

  protected get widestInterval (): IrregularLengthInterval {
    return irregularLengthIntervals[irregularLengthIntervals.length - 1]
  }
}

export default SingleWeightIrregularIntervalStaticSerifSetProvider
