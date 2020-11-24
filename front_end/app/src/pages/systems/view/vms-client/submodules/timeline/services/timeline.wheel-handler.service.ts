import { Injectable } from '@angular/core'

import { int, float } from '../../../utils/type-aliases'
import TimelineService from './timeline.service'
import TimelineTimeUnderMouseService from './timeline.time-under-mouse.service'


@Injectable({
  providedIn: 'root',
 })
export class TimelineWheelHandlerService {

  constructor (
    protected timeline: TimelineService,
    protected timeUnderMouse: TimelineTimeUnderMouseService
  ) {
  }

  public handleWheel (e: WheelEvent) {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      this.wheelScroll(e.deltaX)
    } else {
      this.wheelZoom(-e.deltaY, e.offsetX / (this.timeline.canvasGeometry.width / this.timeline.canvasGeometry.dpr))
    }
    this.timeUnderMouse.handleMouseMove(e)
  }

  public wheelScroll (delta: int) {
    const step = 0.01
    let offset = Math.round(delta * step * this.timeline.visibleRange.duration)
    if (delta > 0) {
        if (this.timeline.visibleRange.end + offset > this.timeline.fullRange.end) {
          offset = this.timeline.fullRange.end - this.timeline.visibleRange.end
        }
    } else {
        if (this.timeline.visibleRange.start + offset < this.timeline.fullRange.start) {
          offset = this.timeline.fullRange.start - this.timeline.visibleRange.start
        }
    }
    this.timeline.shiftVisibleRange(offset)
  }

  public wheelZoom (delta: int, offset: float) {
    const duration = this.timeline.visibleRange.duration
    const MIN_DURATION = this.timeline.canvasGeometry.width * this.timeline.canvasGeometry.dpr
    const step = 0.002
    let durationDelta = duration * step * delta
    if (duration - durationDelta < MIN_DURATION) {
        durationDelta = duration - MIN_DURATION
    }
    this.timeline.zoom(durationDelta, offset)
  }
}

export default TimelineWheelHandlerService
