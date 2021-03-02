import { Component, OnInit, OnDestroy, ElementRef, HostListener } from '@angular/core';
import { Subscription } from 'rxjs'
import { float, int, ms } from '../../../../utils/type-aliases';
import { VmsState, VMS_MODE } from '../../../vms/datatypes/VmsState';
import VideoManagementSystemService from '../../../vms/services/vms.service';
import TimelineService, { TimelineServiceStatus } from '../../services/timeline.service';


type signType = int // -1 | 0 | 1

@Component({
  selector: 'zoom-controls',
  templateUrl: './zoom-controls.component.html',
  styleUrls: ['./zoom-controls.component.scss'],
})
export class ZoomControlsComponent implements OnInit, OnDestroy {

  protected timelineSubscription: Subscription
  protected vmsSubscription: Subscription
  protected state: TimelineServiceStatus
  public disabled: boolean = true

  constructor (
    public timeline: TimelineService,
    public vms: VideoManagementSystemService,
    protected self: ElementRef,
  ) {
    this.onTimelineSubjectChange = this.onTimelineSubjectChange.bind(this)
    this.onVmsSubjectChange = this.onVmsSubjectChange.bind(this)
  }

  public get $self (): HTMLElement {
    return this.self.nativeElement as HTMLElement
  }

  protected _animationFrameRequestHandler: number

  public onAnimationFrame (): void {
    this.performZoomingStep()
    this._animationFrameRequestHandler =
      requestAnimationFrame(this.onAnimationFrame.bind(this))
  }

  public ngOnInit (): void {
    this.timelineSubscription = this.timeline.subject.subscribe(this.onTimelineSubjectChange)
    this.vmsSubscription = this.vms.subject.subscribe(this.onVmsSubjectChange)
    this._animationFrameRequestHandler =
      requestAnimationFrame(this.onAnimationFrame.bind(this))
  }

  public ngOnDestroy (): void {
    this.timelineSubscription.unsubscribe()
    this.vmsSubscription.unsubscribe()
    cancelAnimationFrame(this._animationFrameRequestHandler)
  }

  public onTimelineSubjectChange (s: TimelineServiceStatus) {
    this.state = s
  }

  public onVmsSubjectChange (s: VmsState) {
    switch (s.mode) {
      case VMS_MODE.CAMERA_SELECTED:
        this.disabled = !s.selectedCamera.hasArchive
        break;
      default:
        this.disabled = true
    }
    console.log('vms subject change, Disabled:', this.disabled)
    this.$self.classList[!this.disabled ? 'add' : 'remove']('enabled')
  }

  public get canZoomIn (): boolean {
    return this.state && this.state.zoom && this.state.zoom.canZoomIn
  }

  public get canZoomOut (): boolean {
    return this.state && this.state.zoom && this.state.zoom.canZoomOut
  }

  protected _zoomingSign: signType = 0
  protected _zoomingStartedTimestamp: ms

  public startZooming ($event: MouseEvent, sign: signType) {
    if ($event.button !== 0) {
      return
    }
    this._zoomingSign = sign
    this._zoomingStartedTimestamp = Date.now()
  }

  public stopZooming () {
    const sinceZoomingStarted = Date.now() - this._zoomingStartedTimestamp
    const fastClickEdge: ms = 200
    if (sinceZoomingStarted < fastClickEdge) {
      this.wheelZoom(40 * this._zoomingSign)
    }
    this._zoomingSign = 0
  }

  @HostListener('document:mouseup')
  public onMouseUp () {
    this.stopZooming()
  }

  public performZoomingStep () {
    if (this._zoomingSign) {
      this.wheelZoom(this._zoomingSign)
    }
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

  public fullZoomOut () {
    this.timeline.fullZoomOut()
  }

  public strongZoomIn () {
    this.wheelZoom(80)
  }
}

export default ZoomControlsComponent
