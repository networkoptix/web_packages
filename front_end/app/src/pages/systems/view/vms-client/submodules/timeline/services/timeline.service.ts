import { Injectable } from '@angular/core'
import { Subject } from 'rxjs'

import TimeRange from './TimeRange'
import { int, float, ms, px, CanvasGeometry } from '../../../utils/type-aliases'
import cfg from './timeline.config'


export interface TimelineServiceStatus {
  fullRange: TimeRange,
  visibleRange: TimeRange,
  canvasGeometry: CanvasGeometry,
  // TODO: extract into a separate zoom service?
  zoom: {
    canZoomIn: boolean,
    canZoomOut: boolean,
  },
  canvasGeometryUpdateRequested: boolean,
}


@Injectable({
  providedIn: 'root',
 })
export class TimelineService {
  protected _fullRange: TimeRange = new TimeRange(0, 0)
  protected _visibleRange: TimeRange = new TimeRange(0, 0)
  protected _canvasGeometry: CanvasGeometry = { width: 0, height: 0, dpr: 1 }

  protected _subject = new Subject<TimelineServiceStatus>()
  protected _canvasGeometryUpdateRequested: boolean = true

  public constructor () {
    this._onAnimationFrame = this._onAnimationFrame.bind(this)
    requestAnimationFrame(this._onAnimationFrame)
  }

  public get canvasGeometryUpdateRequested () {
    return this._canvasGeometryUpdateRequested
  }

  public requestCanvasGeometryUpdate () {
    this._canvasGeometryUpdateRequested = true
  }

  protected _emit () {
    this._subject.next({
      fullRange: this.fullRange,
      visibleRange: this.visibleRange,
      canvasGeometry: this.canvasGeometry,
      zoom: this.zoomStatus,
      canvasGeometryUpdateRequested: this.canvasGeometryUpdateRequested,
    })
  }

  public get zoomStatus () {
    return {
      canZoomIn: (this._visibleRange.duration / this.canvasGeometry.dpr) > this.canvasGeometry.width,
      canZoomOut: this._visibleRange.duration < this._fullRange.duration,
    }
  }

  public get subject () {
    return this._subject
  }

  public get fullRange (): TimeRange {
    return this._fullRange.clone()
  }

  public get visibleRange (): TimeRange {
    return this._visibleRange.clone()
  }

  public get canvasGeometry (): CanvasGeometry {
    return { ...this._canvasGeometry }
  }

  public reset (start: ms, end: ms): void {
    this._fullRange.start = start
    this._fullRange.end = end
    this._visibleRange.start = start
    this._visibleRange.end = end
  }

  public extendToNow (): void {
    const now = Date.now()
    if (this._fullRange.end - this._visibleRange.end < cfg.STICK_TO_LIVE_TRESHOLD) {
      const visibleRangeDurationWas = this._visibleRange.duration
      this._visibleRange.end = now
      if (this._visibleRange.start - this._fullRange.start > cfg.STICK_TO_LIVE_TRESHOLD) {
        this._visibleRange.start = this._visibleRange.end - visibleRangeDurationWas
      }
    }
    this._fullRange.end = now
    this._emit()
  }

  public setCanvasGeometry (width: px, height: px, dpr: int): void {
    this._canvasGeometry.width = width
    this._canvasGeometry.height = height
    this._canvasGeometry.dpr = dpr
    this._canvasGeometryUpdateRequested = false
    this._emit()
  }

  public get msPerCanvasPx (): float {
    return this._visibleRange.duration / this._canvasGeometry.width
  }

  public domOffsetXtoTime (x: px): ms {
    return this.canvasOffsetXtoTime(x * this._canvasGeometry.dpr)
  }

  public canvasOffsetXtoTime (x: px): ms {
    return Math.round(this._visibleRange.start + this.msPerCanvasPx * x)
  }


  public timeToDomOffsetX (t: ms): px {
    return Math.round((t - this._visibleRange.start) / (this.msPerCanvasPx * this._canvasGeometry.dpr))
  }

  public timeToCanvasOffsetX (t: ms): px {
    return Math.round((t - this._visibleRange.start) / this.msPerCanvasPx)
  }

  public durationToCanvasWidth (d: ms): px {
    return Math.round(d / this.msPerCanvasPx)
  }

  public durationToDomWidth (d: ms): px {
    return Math.round(this.durationToCanvasWidth(d) / this._canvasGeometry.dpr)
  }

  public domWidthToDuration (w: px): ms {
    return this.canvasWidthToDuration(w * this._canvasGeometry.dpr)
  }

  public canvasWidthToDuration (w: px): ms {
    return Math.round(w * this.msPerCanvasPx)
  }

  public shiftVisibleRange (offset: ms) {
    this._visibleRange.shift(offset)
    this._emit()
  }

  public zoom (durationDelta: ms, offset: float) {
    const MIN_DURATION = this.canvasGeometry.width * this.canvasGeometry.dpr
    const duration = this.visibleRange.duration
    if (duration - durationDelta < MIN_DURATION) {
        durationDelta = duration - MIN_DURATION
    }
    this._visibleRange.zoom(durationDelta, offset, this._fullRange)
    this._emit()
  }

  public fullZoomOut () {
    this._visibleRange.start = this._fullRange.start
    this._visibleRange.end = this._fullRange.end
    this._emit()
  }

  public stepScrollToStartTime (targetT: ms) {
    if (targetT > this._fullRange.end - this._visibleRange.duration) {
      targetT = this._fullRange.end - this._visibleRange.duration
    }
    if (targetT < this._fullRange.start) {
      targetT = this._fullRange.start
    }
    const dt = targetT - this._visibleRange.start
    const offset = Math.round(dt)
    this._visibleRange.shift(offset)
  }

  protected _scrollAnimationDurationMs = 200
  protected _scrollAnimationStartTime: ms
  protected _initialScrollMs: ms
  protected _targetScrollMs: ms

  public jumpScrollTo (targetT: ms, animate: boolean = false) {
    if (animate) {
      this._scrollAnimationStartTime = Date.now()
      this._initialScrollMs = this._visibleRange.start
      this._targetScrollMs = targetT
    }
    else {
      this.stepScrollToStartTime(targetT)
    }
  }

  protected _onAnimationFrame () {
    const now = Date.now()
    const diff = now - this._scrollAnimationStartTime
    if (diff < this._scrollAnimationDurationMs) {
      const percentage = diff / this._scrollAnimationDurationMs
      const diffMs = (this._targetScrollMs - this._initialScrollMs)
      const current = this._initialScrollMs + diffMs * percentage
      this.stepScrollToStartTime(current)
      // console.log(
      //   'animation progress',
      //   percentage,
      //   current,
      //   new Date(current),
      //   this._scrollAnimationDurationMs,
      //   this._scrollAnimationStartTime,
      //   this._initialScrollMs,
      //   this._targetScrollMs,
      // )
    } else if (this._targetScrollMs) {
      this.stepScrollToStartTime(this._targetScrollMs)
      this._targetScrollMs = undefined
    }
    requestAnimationFrame(this._onAnimationFrame)
  }
}

export default TimelineService
