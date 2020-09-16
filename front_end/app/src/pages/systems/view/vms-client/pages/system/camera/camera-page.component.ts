import { Component, OnInit, OnDestroy } from '@angular/core'
import { ActivatedRoute } from '@angular/router'

import Camera from '../../../submodules/vms/datatypes/Camera'
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

  public id: number
  public camera: Camera

  constructor (
    private route: ActivatedRoute,
    private vms: VideoManagementSystemService,
    private playback: PlaybackService,
    public timeline: TimelineService,
    public timelineExtendToNow: TimelineExtendToNowService,
  ) {
  }

  protected _animationFrameRequestHandler: number

  public ngOnInit (): void {
    this.route.params.subscribe(params => {
      this.id = params['camera-id'];
      this.camera = this.vms.selectCamera(this.id)
      this._init()
    });

    this._animationFrameRequestHandler =
      requestAnimationFrame(this.onAnimationFrame.bind(this))
  }

  public onAnimationFrame (): void {
    if (this.camera?.isLive) {
      this.timelineExtendToNow.extendToNow()
    }

    this._animationFrameRequestHandler =
      requestAnimationFrame(this.onAnimationFrame.bind(this))
  }

  public ngOnDestroy (): void {
    cancelAnimationFrame(this._animationFrameRequestHandler)
  }

  protected _init () {
    console.log('camera page (re-)initialization', this.camera)

    this.playback.stop()

    const now = Date.now()
    const DURATION = 10 * 12 * 31 * 24 * 60 * 60 * 1000
    this.timeline.reset(now - DURATION, now)

    if (this.camera.isLive) {
      this.playback.playLive()
    }

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

}

export default CameraPageComponent
