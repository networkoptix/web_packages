import AbstractRanger from "../abstract/AbstractRanger"
import IRangerControls from "../abstract/IRangerControls"
import IRangerStatus from "../abstract/IRangerStatus"
import AbsoluteRangerControls from "./AbsoluteRangerControls"
import AbsoluteRangerStatus from "./AbsoluteRangerStatus"
// import DebugRenderer from "../../renderers/DebugRenderer"
import { float, durationMs } from "../../numberTypeAliases"
// import RulerRenderer from "../../renderers/RulerRenderer"
// import ScrollBarRenderer from '../../renderers/ScrollBarRenderer'
// import ScrollButtonsRenderer from '../../renderers/ScrollButtonsRenderer'
// import EmbeddedScrollBar from '../../embedded/EmbeddedScrollBar'
// import EmbeddedScrollButtons from '../../embedded/EmbeddedScrollButtons'
import IScrollTask from '../abstract/IScrollTask'
import IZoomTask from '../abstract/IZoomTask'

import TimeRange from "../../timeRanges/TimeRange"
import AbstractAdvancedTimeRange from '../../timeRanges/AbstractAdvancedTimeRange'
import AnimatedTimeRange from '../../timeRanges/animations/AnimatedTimeRange'

// import RulerRenderer from "../../rulers/RulerRenderer"
import EmbeddedWheelZoom from '../embeddedWheelHandlers/EmbeddedWheelZoom'
import EmbeddedWheelScroll from '../embeddedWheelHandlers/EmbeddedWheelScroll'


export class AbsoluteRanger extends AbstractRanger {

  protected cfg = {
    FINE_SCROLL_STEP: 0.005,
    FINE_ZOOM_STEP: 0.005,
    SCROLL_BUTTONS_WIDTH: 50,
    SCROLL_BAR_RELATIVE_Y: 0.9,
    SCROLL_BAR_RELATIVE_HEIGHT: 0.1,
    SCROLL_BAR_AS_FINE_STEPS: 3,
    SCROLL_BUTTON_AS_FINE_STEPS: 5,
    MIN_SCROLL_WIDTH: 50 * devicePixelRatio,
  }

  public readonly fullRange: TimeRange
  public readonly visibleRange: AbstractAdvancedTimeRange

  public readonly controls: IRangerControls
  public readonly status: IRangerStatus

  protected embeddedWheelZoom: EmbeddedWheelZoom
  protected embeddedWheelScroll: EmbeddedWheelScroll

  constructor (
    protected archiveRange: TimeRange,
    protected ctx: CanvasRenderingContext2D,
    protected isAutonomous: boolean = true,
    protected animate: boolean = false,
  ) {

    super()

    this.fullRange = archiveRange

    this.visibleRange = (this.animate ? AnimatedTimeRange : TimeRange).fromRange(this.fullRange)

    this.controls = new AbsoluteRangerControls(this)

    this.status = new AbsoluteRangerStatus(this)

    if (this.isAutonomous) {

      this.embeddedWheelZoom = new EmbeddedWheelZoom(
        this.canvas,
        this.status,
        this.controls,
      )

      this.embeddedWheelScroll = new EmbeddedWheelScroll(
        this.canvas,
        this.status,
        this.controls,
      )
    }
  }

  dispose () {
    this.embeddedWheelZoom && this.embeddedWheelZoom.dispose()
    this.embeddedWheelScroll && this.embeddedWheelScroll.dispose()
  }

  public zoom ({ position, steps, mode }: IZoomTask, skipAnimation: boolean = false): boolean {
    if (steps > 0 && this.status.zoom.isMax || steps < 0 && this.status.zoom.isMin) {
      return false
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
        this.visibleRange.contract(
          this.visibleRange.duration * this.cfg.FINE_ZOOM_STEP * steps,
          position
        )
        break
      case 'screens':
        this.visibleRange.contract(
          this.visibleRange.duration * 0.5 * steps,
          position
      )
      case 'max':
        // TODO
        return false;
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
    switch (mode) {
      case 'fine':
        this.visibleRange.shift(this.visibleRange.duration * this.cfg.FINE_SCROLL_STEP * steps)
        break
      case 'screens':
        this.visibleRange.shift(this.visibleRange.duration * steps)
        break
      case 'max':
        if (steps > 0) {
          this.visibleRange.moveToEnd(this.fullRange.endTime)
        } else {
          this.visibleRange.moveToStart(this.fullRange.startTime)
        }
    }
    this.vetVisibleRange()
    return true
  }

  public scrollJumpRelative (targetRelativeOffset: float, skipAnimation: boolean = false) {
    if (targetRelativeOffset < 0) {
      targetRelativeOffset = 0
    }
    this.visibleRange.moveToStart(this.fullRange.startTime + this.fullRange.duration * targetRelativeOffset)
    if (this.visibleRange.endTime > this.fullRange.endTime) {
      this.visibleRange.moveToEnd(this.fullRange.endTime)
    }
    return true
  }

  public scrollJumpDuration (duration: durationMs, skipAnimation) {
    this.visibleRange.shift(duration, skipAnimation)
    this.vetVisibleRange()
    return true
  }

  protected vetVisibleRange () {
    this.visibleRange.trim(this.fullRange)
  }

  protected get canvas () {
    return this.ctx.canvas
  }
}

export default AbsoluteRanger
