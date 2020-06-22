import IDuratedTimeRange from '../../../timeRanges/IDuratedTimeRange'
import AbstractIntervalSetProvider from '../AbstractIntervalSetProvider'


export abstract class AbstractCanvasIntervalSetProvider extends AbstractIntervalSetProvider {
  constructor (
    protected visibleRange: IDuratedTimeRange,
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
