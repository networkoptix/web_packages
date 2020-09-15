import AbstractCanvasIntervalSetProvider from './AbstractCanvasIntervalSetProvider'
import RegularLengthInterval from '../../intervals/RegularLengthInterval'
import regularLengthIntervals from '../../intervals/regularLengthIntervals'
import ITimeRange from '../../../time_range/ITimeRange';
import { SECOND, MINUTE, HOUR, DAY, ROUGH_MONTH, ROUGH_YEAR } from '../../intervals/regularLengthIntervals'


export class CanvasRegularLenghtMultipleWeighstIntervalSetProvider extends AbstractCanvasIntervalSetProvider {

  constructor (
    protected visibleRange: ITimeRange,
    protected canvas: HTMLCanvasElement,
    protected WEIGHT_COUNT_TO_RETURN = 4,
  ) {
    super(visibleRange, canvas)
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

  public getIntervals (): Array<RegularLengthInterval> {
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

export default CanvasRegularLenghtMultipleWeighstIntervalSetProvider
