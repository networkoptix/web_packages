import ITimeRange from '../../../time_range/ITimeRange';
import AbstractIntervalSetProvider from '../AbstractIntervalSetProvider'


export abstract class AbstractCanvasIntervalSetProvider extends AbstractIntervalSetProvider {
  constructor (
    protected visibleRange: ITimeRange,
    protected canvas: HTMLCanvasElement,
  ) {
    super(visibleRange)
  }

  public get msPerPx () {
    return this.visibleRange.duration / this.canvas.width
  }

  public get pxPerMs () {
    return this.canvas.width / this.visibleRange.duration
  }
}

export default AbstractCanvasIntervalSetProvider
