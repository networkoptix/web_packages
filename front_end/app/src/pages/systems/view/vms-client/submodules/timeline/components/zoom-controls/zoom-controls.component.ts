import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs'
import { float, int } from '../../../../utils/type-aliases';
import TimelineService, { TimelineServiceStatus } from '../../services/timeline.service';


@Component({
  selector: 'zoom-controls',
  templateUrl: './zoom-controls.component.html',
  styleUrls: ['./zoom-controls.component.scss'],
})
export class ZoomControlsComponent implements OnInit, OnDestroy {

  protected subscription: Subscription
  protected state: TimelineServiceStatus

  constructor (
    public timeline: TimelineService,
  ) {
    this.onTimelineSubjectChange = this.onTimelineSubjectChange.bind(this)
  }

  protected _animationFrameRequestHandler: number

  public onAnimationFrame (): void {
    this.performZoomingStep()
    this._animationFrameRequestHandler =
      requestAnimationFrame(this.onAnimationFrame.bind(this))
  }

  public ngOnInit (): void {
    this.subscription = this.timeline.subject.subscribe(this.onTimelineSubjectChange)
    this._animationFrameRequestHandler =
      requestAnimationFrame(this.onAnimationFrame.bind(this))
  }

  public ngOnDestroy (): void {
    this.subscription.unsubscribe()
    cancelAnimationFrame(this._animationFrameRequestHandler)
  }

  public onTimelineSubjectChange (s: TimelineServiceStatus) {
    this.state = s
  }

  public get canZoomIn (): boolean {
    return this.state && this.state.zoom && this.state.zoom.canZoomIn
  }

  public get canZoomOut (): boolean {
    return this.state && this.state.zoom && this.state.zoom.canZoomOut
  }

  protected _zoomingSign: -1 | 0 | 1 = 0

  public startZooming (sign: -1 | 1) {
    this._zoomingSign = sign
  }

  public stopZooming () {
    this._zoomingSign = 0
  }

  public performZoomingStep () {
    if (this._zoomingSign)
      this.wheelZoom(this._zoomingSign)
  }

  public wheelZoom (delta: int, offset: float = 0.5) {
    const duration = this.timeline.visibleRange.duration
    const MIN_DURATION = this.timeline.canvasGeometry.width * this.timeline.canvasGeometry.dpr
    const step = 0.01
    let durationDelta = duration * step * delta
    if (duration - durationDelta < MIN_DURATION) {
        durationDelta = duration - MIN_DURATION
    }
    this.timeline.zoom(durationDelta, offset)
  }
}

export default ZoomControlsComponent
