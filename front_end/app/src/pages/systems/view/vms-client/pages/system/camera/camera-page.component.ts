import { Component, OnInit, OnDestroy } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { Subscription } from 'rxjs'

import ICamera from '../../../submodules/vms/datatypes/ICamera'
import { VmsState, VMS_MODE } from '../../../submodules/vms/datatypes/VmsState'
import VideoManagementSystemService from '../../../submodules/vms/services/vms.service'

import PlaybackService from '../../../submodules/playback/services/playback.service'
import TimelineService from '../../../submodules/timeline/services/timeline.service'
import TimelineExtendToNowService from '../../../submodules/timeline/services/timeline.extend-to-now.service'


@Component({
  selector: 'camera-page',
  templateUrl: './camera-page.component.html',
  styleUrls: ['./camera-page.component.styl']
})
export class CameraPageComponent implements OnInit, OnDestroy {

  public id: string
  public camera: ICamera

  protected _routeSubscription: Subscription
  protected _vmsStateSubscription: Subscription
  protected _animationFrameRequestHandler: number

  constructor (
    private route: ActivatedRoute,
    private vms: VideoManagementSystemService,
    private playback: PlaybackService,
    public timeline: TimelineService,
    public timelineExtendToNow: TimelineExtendToNowService,
  ) {
    this._onRouteChange = this._onRouteChange.bind(this)
    this._onVmsStateChange = this._onVmsStateChange.bind(this)
    this._onAnimationFrame = this._onAnimationFrame.bind(this)
  }

  public ngOnInit (): void {
    this._routeSubscription = this.route.params.subscribe(this._onRouteChange)
    this._vmsStateSubscription = this.vms.subject.subscribe(this._onVmsStateChange)
    this._animationFrameRequestHandler =
      requestAnimationFrame(this._onAnimationFrame)
  }

  public ngOnDestroy (): void {
    this._routeSubscription.unsubscribe()
    this._vmsStateSubscription.unsubscribe()
    cancelAnimationFrame(this._animationFrameRequestHandler)
  }

  protected _onRouteChange (params) {
    this.id = params['camera-id'];
    this.vms.selectCamera(this.id)
  }

  protected _onVmsStateChange (s: VmsState) {
    switch (s.mode) {
      case VMS_MODE.NOT_INITIALIZED:
      case VMS_MODE.CAMERA_NOT_SELECTED:
        this.camera = undefined
        break
      case VMS_MODE.CAMERA_SELECTED:
        this.camera = s.selectedCamera
        this._initSelectedCamera()
    }
  }

  public _onAnimationFrame (): void {
    if (this.camera?.isLive) {
      this.timelineExtendToNow.extendToNow()
    }

    this._animationFrameRequestHandler =
      requestAnimationFrame(this._onAnimationFrame)
  }

  public get showPlayer (): boolean {
    return this.camera && this.camera.isLive || this.camera.hasArchive
  }

  public get showPlaybackControls (): boolean {
    return this.showPlayer
  }

  public get showTimeline (): boolean {
    return this.camera && this.camera.hasArchive
  }

  protected _initSelectedCamera () {
    this.playback.stop()

    this._setFakeTimeLine()

    if (this.camera.isLive) {
      this.playback.playLive()
    }
  }

  protected _setFakeTimeLine () {
    const now = Date.now()
    const DURATION = 10 * 12 * 31 * 24 * 60 * 60 * 1000
    this.timeline.reset(now - DURATION, now)
  }

}

export default CameraPageComponent
