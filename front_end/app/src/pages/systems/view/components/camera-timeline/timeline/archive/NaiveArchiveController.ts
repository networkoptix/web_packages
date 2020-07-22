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
    const prevFillStyle = this.ctx.fillStyle
    const y = this.ctx.canvas.height * 0.6
    const h = this.ctx.canvas.height * 0.23
    // background
    this.ctx.fillStyle = '#eceff1'
    this.ctx.fillRect(0, y, this.ctx.canvas.width, h)
    
    // records
    this.ctx.fillStyle = 'rgba(76,188,40)'
    eventBirdView.events.map(e => {
      const x = (e.startTime - eventBirdView.range.startTime) / msPerPx      
      const w = e.duration / msPerPx      
      this.ctx.fillRect(x, y, w, h)
    })
    this.ctx.fillStyle = prevFillStyle
  }

  protected getEventBirdView (): IEventBirdView {
    return this.eventBirdViewProvider.getEventBirdView(this.visibleRange, 0)
  }

  public getNearestTime (t: timeStampMs) {
    return this.eventBirdViewProvider.getNearestTime(t)
  }
}

export default NaiveArchiveController
