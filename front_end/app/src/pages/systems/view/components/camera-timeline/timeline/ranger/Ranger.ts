import AbstractRanger from "./AbstractRanger"
import IRangerControls from "./IRangerControls"
import IRangerStatus from "./IRangerStatus"
import RangerControls from "./RangerControls"
import RangerStatus from "./RangerStatus"
import { float, int } from "../basic_types/numbers"
import { durationMs } from "../basic_types/time"
import IScrollTask from './IScrollTask'
import IZoomTask from './IZoomTask'

import ITimeRange from "../time_range/ITimeRange"
import TimeRange from "../time_range/TimeRange"
import AnimatedTimeRange from "../time_range/AnimatedTimeRange"

export class Ranger extends AbstractRanger {

  static DEFAULT_CFG = {
    FINE_SCROLL_STEP: 0.005,
    FINE_ZOOM_STEP: 0.005,
    SCROLL_BUTTONS_WIDTH: 50,
    SCROLL_BAR_RELATIVE_Y: 0.9,
    SCROLL_BAR_RELATIVE_HEIGHT: 0.1,
    SCROLL_BAR_AS_FINE_STEPS: 3,
    SCROLL_BUTTON_AS_FINE_STEPS: 5,
    MIN_SCROLL_WIDTH: 50 * (typeof(window) === 'object' ? window.devicePixelRatio : 1),
  }

  public readonly fullRange: ITimeRange
  public readonly visibleRange: ITimeRange

  public readonly controls: IRangerControls
  public readonly status: IRangerStatus

  protected _canvasWidth: int

  constructor (
    fullRange: ITimeRange,
    canvasWidth: int = 1000,
    protected animate: boolean = false,
    protected cfg = Ranger.DEFAULT_CFG
  ) {

    super()    

    this.fullRange = fullRange.clone()
    this.canvasWidth = canvasWidth

    if (this.animate) {
      this.visibleRange = AnimatedTimeRange.fromRange(this.fullRange)  
    } else {
      this.visibleRange = TimeRange.fromRange(this.fullRange)  
    }

    this.controls = new RangerControls(this)

    this.status = new RangerStatus(this)

  }

  public set canvasWidth (newWidth: int) {
    this._canvasWidth = newWidth
  }

  public get canvasWidth (): int {
    return this._canvasWidth
  }

  dispose () {
  }

  public zoom ({ position, steps, mode }: IZoomTask, skipAnimation: boolean = false): boolean {
    if (steps > 0 && this.status.zoom.isMax || steps < 0 && this.status.zoom.isMin) {
      return false
    }
    if (steps === 0) {
      return true
    }
    switch (position) {
      case 'center':
        position = 0.5
        break
      case 'left':
        position = 0.0
        break
      case 'right':
        position = 1.0
        break
    }

    switch (mode) {
      case 'fine':
        if (steps > 0) {
          this.visibleRange.contract(
            this.visibleRange.duration * this.cfg.FINE_ZOOM_STEP * steps,
            position,
            skipAnimation
          )
        } else {
          this.visibleRange.expand(
            this.visibleRange.duration * this.cfg.FINE_ZOOM_STEP * -steps,
            position,
            skipAnimation
          )
        }
        break
      case 'screens':
        if (steps > 0) {
          this.visibleRange.contract(
            this.visibleRange.duration * 0.5 * steps,
            position,
            skipAnimation
          )
        } else {
          this.visibleRange.expand(
            this.visibleRange.duration * -steps,
            position,
            skipAnimation
          )
        }
        break
      case 'max':
        const anchor = this.visibleRange.startTime + position * this.visibleRange.duration
        const trimmer = new TimeRange(anchor, anchor).expand(this.canvasWidth, position, true)
        this.visibleRange.trim(trimmer, skipAnimation)        
    }

    this.vetVisibleRange()
    return true
  }

  public zoomReset (): boolean {
    this.visibleRange.reset(this.fullRange)
    return true
  }

  public scroll ({ mode, steps }: IScrollTask, skipAnimation: boolean = false): boolean {
    if (steps > 0 && this.status.scroll.isMax || steps < 0 && this.status.scroll.isMin) {
      return false
    }
    if (steps === 0) {
      return true
    }
    let offset
    if (mode === 'fine' || mode === 'screens') {
      offset = this.visibleRange.duration * (mode === 'screens' ? 1 : this.cfg.FINE_SCROLL_STEP) * steps
      if (offset > 0 && this.visibleRange.endTime + offset > this.fullRange.endTime) {
        offset = this.fullRange.endTime - this.visibleRange.endTime
      } else if (offset < 0 && this.visibleRange.startTime + offset < this.fullRange.startTime) {
        offset = this.fullRange.startTime - this.visibleRange.startTime
      }
    }
    switch (mode) {
      case 'screens':
      case 'fine':
        this.visibleRange.shift(offset, skipAnimation)
        break
      case 'max':
        if (steps > 0) {
          this.visibleRange.moveToEnd(this.fullRange.endTime, skipAnimation)
        } else {
          this.visibleRange.moveToStart(this.fullRange.startTime, skipAnimation)
        }
    }
    this.vetVisibleRange()
    return true
  }

  public scrollJumpRelative (targetRelativeOffset: float, skipAnimation: boolean = false) {
    if (targetRelativeOffset < 0) {
      targetRelativeOffset = 0
    }
    this.visibleRange.moveToStart(this.fullRange.startTime + this.fullRange.duration * targetRelativeOffset, skipAnimation)
    if (this.visibleRange.endTime > this.fullRange.endTime) {
      this.visibleRange.moveToEnd(this.fullRange.endTime, skipAnimation)
    }
    return true
  }

  public scrollJumpDuration (duration: durationMs, skipAnimation) {
    this.visibleRange.shift(duration, skipAnimation)
    this.vetVisibleRange()
    return true
  }

  protected vetVisibleRange () {
    this.visibleRange.trim(this.fullRange, true)
  }

}

export default Ranger
