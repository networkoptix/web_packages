import { Injectable } from '@angular/core'
import { BehaviorSubject } from 'rxjs'

import TimelineService from './timeline.service'
import { float, ms, px, sign } from '../../../utils/type-aliases'


export interface TimelineScrollbarServiceStatus {
  magnification: float,
  offset: float,
  isBarGrabbed: boolean,
  canScrollLeft: boolean,
  canScrollRight: boolean,
}

@Injectable({
  providedIn: 'root',
 })
export class TimelineScrollbarService {

  constructor (
    protected timeline: TimelineService
  ) {
    this.timeline.subject.subscribe(this._emit.bind(this))
  }

  protected _subject = new BehaviorSubject<TimelineScrollbarServiceStatus>(
    {
      magnification: 1.0,
      offset: 0.0,
      isBarGrabbed: false,
      canScrollLeft: false,
      canScrollRight: false,
    }
  )

  protected _emit () {
    this._subject.next({
      magnification: this.magnification,
      offset: this.offset,
      isBarGrabbed: this.isBarGrabbed,
      canScrollLeft: this.canScrollLeft,
      canScrollRight: this.canScrollRight,
    })
  }

  public get subject (): BehaviorSubject<TimelineScrollbarServiceStatus> {
    return this._subject
  }

  public get offset (): px {
    return (this.timeline.targetScrollMs - this.timeline.fullRange.start) / this.timeline.fullRange.duration
  }

  public get magnification (): float {
    return this.timeline.fullRange.duration / this.timeline.visibleRange.duration
  }

  public get isBarGrabbed (): boolean {
    return this._isBarGrabbed
  }

  public get canScrollLeft (): boolean {
    return this.timeline.visibleRange.start > this.timeline.fullRange.start
  }

  public get canScrollRight (): boolean {
    return this.timeline.visibleRange.end < this.timeline.fullRange.end
  }

  public handleBarDoubleClick (e: MouseEvent) {
    e.preventDefault()
    this.timeline.fullZoomOut()
    this._emit()
  }


  protected _isBarGrabbed: boolean = false
  protected barDragAnchor: px = -1
  // protected honestBarWidthPx: px = null

  public handleBarMouseDown (e: MouseEvent) { // , honestBarWidthPx?: px, visibleWidth?: px) {
    this._isBarGrabbed = true
    this.barDragAnchor = e.offsetX
    // this.honestBarWidthPx = honestBarWidthPx
    // console.log('got honest bar width', honestBarWidthPx)
    e.stopPropagation()
    e.preventDefault()
    this._emit()
  }

  public handleBarMouseUp (e: MouseEvent) {
    this._isBarGrabbed = false
    this.barDragAnchor = -1
    this._emit()
  }

  public handleBarDragMouseMove (e: MouseEvent, $bar: HTMLDivElement) {
    if (this._isBarGrabbed) {
      const boundingRect = $bar.parentElement.getBoundingClientRect()
      const relativeX = Math.max(Math.min((e.clientX - boundingRect.left) / boundingRect.width, 1.0), 0.0)
      const targetTime = this.timeline.fullRange.start + relativeX * this.timeline.fullRange.duration
      // const fix = this.barDragAnchor / (this.honestBarWidthPx || $bar.clientWidth)
      const fix = this.barDragAnchor / $bar.clientWidth
      // console.log('fix', fix, fix * this.timeline.visibleRange.duration)
      this.timeline.jumpScrollTo(Math.round(targetTime - this.timeline.visibleRange.duration * fix), true)
      this._emit()
    }
  }

  protected isBackgroundMouseDown: boolean = false
  private holdScrollTargetTime: ms = -1
  protected _timestampMouseDown: ms
  protected _scrollDirection: sign = 0

  public handleBackgroundMouseDown (e: MouseEvent) {
    this.isBackgroundMouseDown = true
    this._timestampMouseDown = Date.now()
    this.holdScrollTargetTime = this._targetTimeFromMouseEvent(e)
    this._scrollDirection = e.offsetX < (this.offset * this.timeline.canvasGeometry.width / this.timeline.canvasGeometry.dpr) ? -1 : +1
  }

  public handleBackgroundMouseUp (e: MouseEvent) {
    this.isBackgroundMouseDown = false
    this.holdScrollTargetTime = -1
    const sinceMouseDown: ms = Date.now() - this._timestampMouseDown
    const edgeTimeSinceMouseDown: ms = 200
    if (sinceMouseDown < edgeTimeSinceMouseDown) {
      // console.log(sinceMouseDown, 'jump one screen', this._scrollDirection)
      this.timeline.jumpScrollTo(
        (
          this.timeline.visibleRange.start +
          this.timeline.visibleRange.duration * this._scrollDirection
        ),
        true
      )
    } else {
      // console.log('normal mouse up')
    }
  }

  public handleButtonLeftMouseDown () {
    this.isBackgroundMouseDown = true
    this.holdScrollTargetTime = this.timeline.fullRange.start
  }

  public handleButtonRightMouseDown () {
    this.isBackgroundMouseDown = true
    this.holdScrollTargetTime = this.timeline.fullRange.end - this.timeline.visibleRange.duration
  }

  public updateIfMouseIsDown () {
    if (this.isBackgroundMouseDown) {
      this.timeline.stepScrollToStartTime(this.holdScrollTargetTime)
      this._emit()
    }
  }

  public handleBackgroundDblClick (e: MouseEvent) {
    this.isBackgroundMouseDown = false
    const targetTime = this._targetTimeFromMouseEvent(e)
    this.timeline.jumpScrollTo(targetTime, true)
    this._emit()
  }

  public handleButtonLeftDblClick () {
    this.timeline.jumpScrollTo(this.timeline.fullRange.start, true)
    this._emit()
  }

  public handleButtonRightDblClick () {
    this.timeline.jumpScrollTo(this.timeline.fullRange.end - this.timeline.visibleRange.duration, true)
    this._emit()
  }

  protected _targetTimeFromMouseEvent (e: MouseEvent): ms {
    return Math.round(
      this.timeline.fullRange.start +
      this.timeline.fullRange.duration * (
        e.offsetX / (e.target as HTMLElement).clientWidth
      ) -
      this.timeline.visibleRange.duration * 0.5
    )
  }
}

export default TimelineScrollbarService
