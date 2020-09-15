import AbstractCanvasIntervalSetProvider from './AbstractCanvasIntervalSetProvider'
import IrregularLengthInterval from '../../intervals/IrregularLengthInterval'
import irregularLengthIntervals from '../../intervals/irregularLengthIntervals'
import ITimeRange from '../../../time_range/ITimeRange';
import estimateIrregularLengthIntervalPessimistically from '../../intervals/utils/estimateIrregularLengthIntervalPessimistically'


export class CanvasIrregularLenghtSingleWeightIntervalSetProvider extends AbstractCanvasIntervalSetProvider {

  constructor (
    protected visibleRange: ITimeRange,
    protected canvas: HTMLCanvasElement,
    protected MIN_INTERVAL_WIDTH_PX = 15 * devicePixelRatio
  ) {
    super(visibleRange, canvas)
  }

  public getIntervals (): Array<IrregularLengthInterval> {
    return [ this.getInterval() ]
  }

  protected getInterval (): IrregularLengthInterval {
    for (let interval of irregularLengthIntervals) {
      const displayWidth: estimateIrregularLengthIntervalPessimistically(interval) * this.pxPerMs
      if (displayWidth >= this.MIN_INTERVAL_WIDTH_PX) {
        return interval
      }
    }
    return this.widestInterval
  }

  protected get widestInterval (): IrregularLengthInterval {
    return irregularLengthIntervals[irregularLengthIntervals.length - 1]
  }
}

export default CanvasIrregularLenghtSingleWeightIntervalSetProvider
