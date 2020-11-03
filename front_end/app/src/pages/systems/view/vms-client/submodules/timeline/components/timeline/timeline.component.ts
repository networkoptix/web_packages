import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import TimelineService, { TimelineServiceStatus } from '../../services/timeline.service'
import TimelineCanvasRendererService from '../../services/canvas-renderer/timeline.canvas-renderer.service'
import TimelineWheelHandlerService from '../../services/timeline.wheel-handler.service'
import TimelineTimeUnderMouseService from '../../services/timeline.time-under-mouse.service'
import TimelineSelectionService from '../../services/timeline.selection.service'
import PlaybackService from '../../../playback/services/playback.service'
import { Subscription } from 'rxjs';

const CANVAS_SELECTION_HEIGHT = 50
// const MAX_TIMES_RENDERED = 1
// let times_rendered = 0

@Component({
  selector: 'timeline',
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.styl'],
})
export class TimelineComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild("canvas") canvasView: ElementRef;

  protected _state: TimelineServiceStatus
  protected _stateSubscription: Subscription

  constructor (
    public timeline: TimelineService,
    protected playback: PlaybackService,
    protected canvasRenderer: TimelineCanvasRendererService,
    protected wheelHandler: TimelineWheelHandlerService,
    public timeUnderMouse: TimelineTimeUnderMouseService,
    protected selection: TimelineSelectionService,
  ) {
    this._onTimelineStatusChange = this._onTimelineStatusChange.bind(this)
  }

  protected _onTimelineStatusChange (s: TimelineServiceStatus) {
    if (s.canvasGeometryUpdateRequested) {
      this._updateCanvasGeometry()
    }
  }

  protected _animationFrameRequestHandler: number

  public ngOnInit(): void {
    this._stateSubscription = this.timeline.subject.subscribe(this._onTimelineStatusChange)
    this._animationFrameRequestHandler =
      requestAnimationFrame(this.onAnimationFrame.bind(this))
  }

  public onAnimationFrame (): void {
    this._updateCanvasGeometry() // actually shouldn't happen that often

    const ctx = (this.canvasView.nativeElement as HTMLCanvasElement).getContext('2d')
    // console.log('render #', times_rendered)
    this.canvasRenderer.render(ctx)

    // if (times_rendered++ >= MAX_TIMES_RENDERED) return

    this._animationFrameRequestHandler =
      requestAnimationFrame(this.onAnimationFrame.bind(this))
  }

  public ngOnDestroy (): void {
    this._stateSubscription.unsubscribe()
    cancelAnimationFrame(this._animationFrameRequestHandler)
  }

  public ngAfterViewInit (): void {

    window.addEventListener(
      'resize',
      this._updateCanvasGeometry.bind(this)
    )

    window.matchMedia('screen and (min-resolution: 2dppx)').addListener(
      this._updateCanvasGeometry.bind(this)
    );

    setTimeout(this._updateCanvasGeometry.bind(this), 0)
  }

  protected _updateCanvasGeometry (): void {
    const rect = this.canvasView.nativeElement.getBoundingClientRect()
    const dpr = window.devicePixelRatio
    this.canvasView.nativeElement.width = rect.width * dpr
    this.canvasView.nativeElement.height = rect.height * dpr
    this.timeline.setCanvasGeometry(rect.width * dpr, rect.height * dpr, dpr)
  }

  public canvasWheelHandler (e: WheelEvent): void {
    e.preventDefault()
    this.wheelHandler.handleWheel(e)
  }

  public canvasMouseMoveHandler (e: MouseEvent): void {
    this.timeUnderMouse.handleMouseMove(e)
  }

  public canvasMouseEnterHandler (e: MouseEvent): void {
    this.timeUnderMouse.handleMouseEnter(e)
  }

  public canvasMouseLeaveHandler (e: MouseEvent): void {
    this.timeUnderMouse.handleMouseLeave(e)
  }

  public canvasClickHandler (e: MouseEvent): void {
    e.stopPropagation()
    e.preventDefault()
    if (e.offsetY > CANVAS_SELECTION_HEIGHT) {
      const time = this.timeline.domOffsetXtoTime(e.offsetX)
      this.selection.reset()
      this.playback.playArchive(time)
    }
  }

  // public canvasMouseDownHandler (e: MouseEvent): void {
  //   if (e.offsetY <= CANVAS_SELECTION_HEIGHT) {
  //     this.selection.handleBackgroundMouseDown(e)
  //   }
  // }

}

export default TimelineComponent
