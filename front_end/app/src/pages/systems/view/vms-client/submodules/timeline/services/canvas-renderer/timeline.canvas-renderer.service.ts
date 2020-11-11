import { Injectable } from '@angular/core'
import TimelineRulerCanvasRendererService from './ruler/timeline.ruler-canvas-renderer.service'
import TimelineRecordsCanvasRendererService from './timeline.records-canvas-renderer.service'
import TimelineService from '../timeline.service'


@Injectable({
  providedIn: 'root',
 })
export class TimelineCanvasRendererService {

  constructor (
    protected timeline: TimelineService,
    protected rulerRenderer: TimelineRulerCanvasRendererService,
    protected recordsRenderer: TimelineRecordsCanvasRendererService,
  ) {
  }

  public render (ctx: CanvasRenderingContext2D) {
    // // @ts-ignore
    // console.log('render', this.timeline._canvasGeometry, this.timeline.canvasGeometry)

    ctx.clearRect(0, 0, this.timeline.canvasGeometry.width, this.timeline.canvasGeometry.height)
    this.rulerRenderer.render(ctx)
    this.recordsRenderer.render(ctx)
  }

}

export default TimelineCanvasRendererService
