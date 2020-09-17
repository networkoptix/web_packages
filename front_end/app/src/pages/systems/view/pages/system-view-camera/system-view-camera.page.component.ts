import { Component, OnInit } from '@angular/core'
import { INxViewCamera  } from '../../view.types'
import { ActivatedRoute, Router } from '@angular/router'
import { NxSystemService, NxSystem } from '../../../../../services/system.service'
import { NxAccountService } from '../../../../../services/account.service'
import { CookieService } from 'ngx-cookie-service'
import TimelineService from '../../vms-client/submodules/timeline/services/timeline.service'
import TimelineExtendToNowService from '../../vms-client/submodules/timeline/services/timeline.extend-to-now.service'
import VideoManagementSystemService from '../../vms-client/submodules/vms/services/vms.service'
import Camera from '../../vms-client/submodules/vms/datatypes/Camera'
import PlaybackService from '../../vms-client/submodules/playback/services/playback.service'

type int = number


@Component({
    selector: 'nx-system-view-camera-page',
    templateUrl: 'system-view-camera.page.component.html',
    styleUrls: ['system-view-camera.page.component.styl']
})

export class NxSystemViewCameraPageComponent implements OnInit {

  public system: NxSystem
  camera: INxViewCamera

  protected POLLING_DELAY_MS: int = 100

  public fake_camera: Camera

  constructor (
    protected route: ActivatedRoute,
    protected router: Router,
    private accountService: NxAccountService,
    private systemService: NxSystemService,
    protected cookieService: CookieService,

    protected timeline: TimelineService,
    protected timelineExtendToNow: TimelineExtendToNowService,
    protected vms: VideoManagementSystemService,
    protected playback: PlaybackService,
  ) {
  }

  public ngOnInit () {
    this.route.params.subscribe(params => {
      return this.accountService.get().then(account => {

        this.playback.stop()

        const now = Date.now()
        this.timeline.reset(now, now)

        this.camera = undefined
        this.fake_camera = undefined
        this.vms.resetCameraSelection()
        this.system = null

        setTimeout(() => {
          // @ts-ignore -- TODO: Need to handle account not being available
          this.system = this.systemService.createSystem(account.email, this.route.snapshot.parent.params.systemId)
          this.pollSystemForMediaServers()
        }, 200)
      })
    });

    this._animationFrameRequestHandler =
      requestAnimationFrame(this.onAnimationFrame.bind(this))
  }

  protected _animationFrameRequestHandler: number

  public onAnimationFrame (): void {
    if (this.camera) {

      if (this.fake_camera?.isLive) {
        this.timelineExtendToNow.extendToNow()
      }
    }

    this._animationFrameRequestHandler =
      requestAnimationFrame(this.onAnimationFrame.bind(this))
  }

  public ngOnDestroy (): void {
    cancelAnimationFrame(this._animationFrameRequestHandler)
  }

  protected pollSystemForMediaServers () {
    if (!this.system || !this.system.mediaservers) {
      setTimeout(this.pollSystemForMediaServers.bind(this), this.POLLING_DELAY_MS)
    } else {
      this.camera = this.system.mediaservers.reduce(
        (acc, ms) => {
          ms.cameras.map(c => acc[c.id] = c)
          return acc
        },
        {}
      )[this.route.snapshot.params.cameraId]

      const result = this.vms.selectCamera(this.camera.id)
      if (result) {
        console.log('fake camera selected')
        this.fake_camera = result
        const now = Date.now()
        const DURATION = 12 * 31 * 24 * 60 * 60 * 1000
        this.timeline.reset(now - DURATION, now)
      } else {
        console.log('fake selection failed')
      }
      // TODO: set playback source
      // TODO: provide archive range
      if (this.fake_camera.isLive) {
        this.playback.playLive()
      }

      // redirect if cameraId in the url does not match any camera of the system
      if (!this.camera) {
        this.router.navigate(['systems', this.system.id, 'view'])
      } else {
        // TODO: extract to a dedicated service
        const cookie_name = `nx_last_accessed_camera_for_system_${this.system.id}`
        this.cookieService.set(cookie_name, this.camera.id)
      }
    }
  }

}

export default NxSystemViewCameraPageComponent
