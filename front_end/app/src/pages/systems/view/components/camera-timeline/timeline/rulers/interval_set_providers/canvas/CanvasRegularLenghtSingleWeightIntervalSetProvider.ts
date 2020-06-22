import AbstractCanvasIntervalSetProvider from './AbstractCanvasIntervalSetProvider'
import RegularLengthInterval from '../../intervals/RegularLengthInterval'
import regularLengthIntervals from '../../intervals/regularLengthIntervals'
import IDuratedTimeRange from '../../../timeRanges/IDuratedTimeRange'


export class CanvasRegularLenghtSingleWeightIntervalSetProvider extends AbstractCanvasIntervalSetProvider {

  constructor (
    protected visibleRange: IDuratedTimeRange,
    protected canvas: HTMLCanvasElement,
    protected MIN_INTERVAL_WIDTH_PX = 15 * devicePixelRatio
  ) {
    super(visibleRange, canvas)
  }

  public getIntervals (): Array<RegularLengthInterval> {
    return [ this.getInterval() ]
  }

  protected getInterval (): RegularLengthInterval {
    for (let interval of regularLengthIntervals) {
      const displayWidth = interval * this.pxPerMs
      if (displayWidth >= this.MIN_INTERVAL_WIDTH_PX) {
        return interval
      }
    }
    return this.widestInterval
  }

  protected get widestInterval (): RegularLengthInterval {
    return regularLengthIntervals[regularLengthIntervals.length - 1]
  }
}

export default CanvasRegularLenghtSingleWeightIntervalSetProvider
