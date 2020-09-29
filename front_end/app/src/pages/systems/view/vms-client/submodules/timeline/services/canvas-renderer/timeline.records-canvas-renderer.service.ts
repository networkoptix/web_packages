import { Injectable } from '@angular/core'

import TimelineService from '../timeline.service'
import TimelineRecordsService from '../timeline.records.service'
import VideoManagementSystemService from '../../../vms/services/vms.service'
import { float, ms, px } from '../../../../utils/type-aliases'


@Injectable({
  providedIn: 'root',
 })
export class TimelineRecordsCanvasRendererService {

  constructor (
    protected timeline: TimelineService,
    protected vms: VideoManagementSystemService
  ) {
  }

  public render (ctx: CanvasRenderingContext2D) {
    const oldFill = ctx.fillStyle

    const RECORDS_OFFSET_RELATIVE = 0.6
    const RECORDS_HEIGHT_RELATIVE = 0.24

    // background
    ctx.fillStyle = '#ebeff1'
    ctx.fillRect(
      0, Math.round(RECORDS_OFFSET_RELATIVE * this.timeline.canvasGeometry.height),
      this.timeline.canvasGeometry.width,
      Math.round(RECORDS_HEIGHT_RELATIVE * this.timeline.canvasGeometry.height),
    )

    // records
    ctx.fillStyle = '#4cbd27'
    if (this.vms.selectedCamera) {
      const minT: ms = this.timeline.visibleRange.start
      const maxT: ms = this.timeline.visibleRange.end
      const pxPerMs: float = 1 / this.timeline.msPerCanvasPx
      const MIN_WIDTH: px = 2
      this.vms.selectedCamera.archive.filter(r => r.start < maxT && r.end > minT).map(r => {
        const x0 = Math.round((r.start - minT) * pxPerMs)
        let x1 = Math.round((r.end - minT) * pxPerMs)
        if (x1 - x0 < MIN_WIDTH) {
          x1 = x0 + MIN_WIDTH
        }
        const y = Math.round(RECORDS_OFFSET_RELATIVE * this.timeline.canvasGeometry.height)
        const h = Math.round(RECORDS_HEIGHT_RELATIVE * this.timeline.canvasGeometry.height)
        const w = x1 - x0
        ctx.fillRect(x0, y, w, h)
      })
    }

    ctx.fillStyle = oldFill
  }
}

export default TimelineRecordsCanvasRendererService
