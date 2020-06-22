import AbstractSerifSetProvider from './AbstractSerifSetProvider'
import WeightedSerif from '../serifs/WeightedSerif'
import { timeStampMs, durationMs } from '../../numberTypeAliases'
import IrregularLengthInterval from '../intervals/IrregularLengthInterval'
import irregularLengthIntervals from '../intervals/irregularLengthIntervals'
import { SECOND, MINUTE, HOUR } from '../intervals/regularLengthIntervals'
import IDuratedTimeRange from '../../timeRanges/IDuratedTimeRange'
import estimateIrregularLengthIntervalPessimistically from '../intervals/utils/estimateIrregularLengthIntervalPessimistically'
import alignTimeStamp from '../intervals/utils/alignTimeStamp'
import { isAlignedByIrregularInterval } from '../intervals/utils/isAlignedByIrregularInterval'


export class MuiltiWeightIrregularIntervalStaticCanvasSerifSetProvider extends AbstractSerifSetProvider {

  constructor (
    protected visibleRange: IDuratedTimeRange,
    protected canvas: HTMLCanvasElement,
    protected WEIGHT_COUNT_TO_RETURN = 4,
  ) {
    super(visibleRange, canvas)
  }

  public getSerifs (): Array<WeightedSerif> {
    const intervals = this.getIntervals()
    return this.getSerifTimes(intervals[0]).map((when: timeStampMs) => ({
      weight: this.getSerifWeight(when, intervals),
      when
    }))
  }

  protected getSerifWeight (when: timeStampMs, intervals: Array<IrregularLengthInterval>) {
    for (let i = intervals.length - 1; i >= 0; i--) {
      if (isAlignedByIrregularInterval(when, intervals[i])) {
        return i + 1
      }
    }
    console.error('serif misaligned', when, intervals)
    return 0
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

  protected MIN_WIDTH_FOR_INTERVALS = {
    [SECOND]: [ 15, 50, Infinity, Infinity ].map(i => i * devicePixelRatio),
    [5 * SECOND]: [ 15, 50, 250, Infinity ].map(i => i * devicePixelRatio),
    [10 * SECOND]: [ 15, 50, 500, 1000 ].map(i => i * devicePixelRatio),
    [30 * SECOND]: [ 15, 50, 300, 1500 ].map(i => i * devicePixelRatio),
    [MINUTE]: [ 15, 50, 100, 300 ].map(i => i * devicePixelRatio),
    [5 * MINUTE]: [ 15, 50, 250, 500 ].map(i => i * devicePixelRatio),
    [10 * MINUTE]: [ 15, 50, 500, 1000 ].map(i => i * devicePixelRatio),
    [30 * MINUTE]: [ 15, 50, 300, 1500 ].map(i => i * devicePixelRatio),
    [HOUR]: [ 15, 50, 100, 300 ].map(i => i * devicePixelRatio),
    [3 * HOUR]: [ 15, 50, 300, 900 ].map(i => i * devicePixelRatio),
    [6 * HOUR]: [ 15, 50, 600, 1800 ].map(i => i * devicePixelRatio),
    [12 * HOUR]: [ 15, 50, 200, 1200 ].map(i => i * devicePixelRatio),
    [24 * HOUR]: [ 5, 20, 100, 200 ].map(i => i * devicePixelRatio),
    'month': [ 5, 60, Infinity, 600 ].map(i => i * devicePixelRatio),
    'quarter-year': [ 5, 60, 1800, 9000 ].map(i => i * devicePixelRatio),
    'half-year': [ 5, 60, 360, 3600 ].map(i => i * devicePixelRatio),
    'year': [ 15, 40, 120, 720 ].map(i => i * devicePixelRatio),
    'decade': [ 15, 40, 400, 9000 ].map(i => i * devicePixelRatio),
    'century': [ 15, 40, 400, 4000 ].map(i => i * devicePixelRatio),
  }

  protected getIntervals (): Array<IrregularLengthInterval> {
    const result = []
    for (let interval of irregularLengthIntervals) {
      const displayWidth = estimateIrregularLengthIntervalPessimistically(interval) * this.pxPerMs
      const requiredWidth = this.MIN_WIDTH_FOR_INTERVALS[interval][result.length]
      if (displayWidth >= requiredWidth) {
        result.push(interval)
        if (result.length >= this.WEIGHT_COUNT_TO_RETURN) {
          break
        }
      }
    }
    return result
  }
}

export default MuiltiWeightIrregularIntervalStaticCanvasSerifSetProvider
