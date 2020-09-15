import { Injectable } from '@angular/core'

import TimelineService from '../timeline.service'
import TimelineRecordsService from '../timeline.records.service'


@Injectable({
  providedIn: 'root',
 })
export class TimelineRecordsCanvasRendererService {

  constructor (
    protected timeline: TimelineService,
    protected records: TimelineRecordsService,
  ) {
  }

  public render (ctx: CanvasRenderingContext2D) {
    const oldFill = ctx.fillStyle

    const RECORDS_OFFSET_RELATIVE = 0.6
    const RECORDS_HEIGHT_RELATIVE = 0.24

    // background
    ctx.fillStyle = '#eceff1'
    ctx.fillRect(
      0, Math.round(RECORDS_OFFSET_RELATIVE * this.timeline.canvasGeometry.height),
      this.timeline.canvasGeometry.width,
      Math.round(RECORDS_HEIGHT_RELATIVE * this.timeline.canvasGeometry.height),
    )

    // records
    ctx.fillStyle = '#6cb943'
    ctx.fillRect(
      0, Math.round(RECORDS_OFFSET_RELATIVE * this.timeline.canvasGeometry.height),
      this.timeline.canvasGeometry.width * 0.8,
      Math.round(RECORDS_HEIGHT_RELATIVE * this.timeline.canvasGeometry.height),
    )

    ctx.fillStyle = oldFill
  }
}

export default TimelineRecordsCanvasRendererService
