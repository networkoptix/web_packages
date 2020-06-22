import AbstractSerifSetProvider from './AbstractSerifSetProvider'
import WeightedSerif from '../serifs/WeightedSerif'
import { timeStampMs } from '../../numberTypeAliases'
import RegularLengthInterval from '../intervals/RegularLengthInterval'
import regularLengthIntervals from '../intervals/regularLengthIntervals'
import { SECOND, MINUTE, HOUR, DAY, ROUGH_MONTH, ROUGH_YEAR } from '../intervals/regularLengthIntervals'
import IDuratedTimeRange from '../../timeRanges/IDuratedTimeRange'


export class MuiltiWeightRegularIntervalStaticCanvasSerifSetProvider extends AbstractSerifSetProvider {

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

  protected getSerifWeight (when: timeStampMs, intervals: Array<RegularLengthInterval>) {
    for (let i = intervals.length - 1; i >= 0; i--) {
      if (when % intervals[i] === 0) {
        return i + 1
      }
    }
    console.error('serif misaligned', when, intervals)
    return 0
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
    [DAY]: [ 5, 20, 100, 200 ].map(i => i * devicePixelRatio),
    [ROUGH_MONTH]: [ 5, 60, Infinity, 600 ].map(i => i * devicePixelRatio),
    [3 * ROUGH_MONTH]: [ 5, 60, 1800, 9000 ].map(i => i * devicePixelRatio),
    [6 * ROUGH_MONTH]: [ 5, 60, 360, 3600 ].map(i => i * devicePixelRatio),
    [ROUGH_YEAR]: [ 15, 40, 120, 720 ].map(i => i * devicePixelRatio),
    [10 * ROUGH_YEAR]: [ 15, 40, 400, 9000 ].map(i => i * devicePixelRatio),
    [100 * ROUGH_YEAR]: [ 15, 40, 400, 4000 ].map(i => i * devicePixelRatio),
  }

  protected getIntervals (): Array<RegularLengthInterval> {
    const result = []
    for (let interval of regularLengthIntervals) {
      const displayWidth = interval * this.pxPerMs
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

export default MuiltiWeightRegularIntervalStaticCanvasSerifSetProvider
