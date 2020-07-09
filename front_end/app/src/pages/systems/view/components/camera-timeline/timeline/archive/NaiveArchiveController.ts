import AbstractArchiveController from './AbstractArchiveController'
import AbstractEventBirdViewProvider from './birdViews/providers/AbstractEventBirdViewProvider'
import IEventBirdView from './birdViews/IEventBirdView'
import ITimeRange from '../time_range/ITimeRange';
import { timeStampMs } from '../basic_types/time';


export class NaiveArchiveController extends AbstractArchiveController {
  

  constructor (
    protected archiveRange: ITimeRange,
    protected visibleRange: ITimeRange,
    protected ctx: CanvasRenderingContext2D,
    protected eventBirdViewProvider: AbstractEventBirdViewProvider
  ) {
    super(archiveRange, visibleRange)
  }

  public dispose () {
  }

  public render (debug: boolean = false) {
    const eventBirdView = this.getEventBirdView()
    const msPerPx = this.visibleRange.duration / this.ctx.canvas.width
    eventBirdView.events.map(e => {
      const x = (e.startTime - eventBirdView.range.startTime) / msPerPx
      const y = this.ctx.canvas.height * 0.6
      const h = this.ctx.canvas.height * 0.2
      const w = e.duration / msPerPx
      const prevFillStyle = this.ctx.fillStyle
      this.ctx.fillStyle = '#6cb844'
      this.ctx.fillRect(x, y, w, h)
      this.ctx.fillStyle = prevFillStyle
    })
  }

  protected getEventBirdView (): IEventBirdView {
    return this.eventBirdViewProvider.getEventBirdView(this.visibleRange, 0)
  }

  public getNearestTime (t: timeStampMs) {
    return this.eventBirdViewProvider.getNearestTime(t)
  }
}

export default NaiveArchiveController
