import { Component, OnInit, OnDestroy } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { Subscription } from 'rxjs'
import { ServerTimeInfo, NxSystemService, NxMediaServer, NxCamera, NxSystem } from '../../../../../services/system.service'
import { NxAccountService } from '../../../../../services/account.service'
import { CookieService } from 'ngx-cookie-service'
import VideoManagementSystemService from '../../vms-client/submodules/vms/services/vms.service'
import { CAMERA_STATUS } from '../../vms-client/submodules/vms/datatypes/ICamera'
import Camera from '../../vms-client/submodules/vms/datatypes/Camera'


@Component({
    selector: 'nx-system-view-index-page',
    templateUrl: 'system-view-index.page.component.html',
    styleUrls: ['system-view-index.page.component.scss']
})
export class NxSystemViewIndexPageComponent implements OnInit, OnDestroy {

  public systemId: string
  public system: NxSystem
  public mediaServers: Array<NxMediaServer>

  constructor (
    protected router: Router,
    protected route: ActivatedRoute,
    protected accountService: NxAccountService,
    protected systemService: NxSystemService,
    protected cookieService: CookieService,

    protected vms: VideoManagementSystemService,
  ) {
  }

  protected routerParamsSubscription: Subscription

  public ngOnInit (): void {
    this.init()
  }

  protected init (): void {
    this.routerParamsSubscription = this.route.params.subscribe(params => {
      if (params.systemId) {
        this.systemId = params.systemId
        this.system = undefined
        this.initSystem()
      }
    })
  }

  public ngOnDestroy() {
    if (this.routerParamsSubscription) {
        this.routerParamsSubscription.unsubscribe()
    }
  }

  private initSystem (): Promise<any> {
    this.vms.cleanMediaServers()
    return this.accountService.get().then(account => {
      // @ts-ignore -- TODO: Need to handle account not being available
        this.system = this.systemService.createSystem(account.email, this.systemId)
        return this.system.getMediaServersAndCameras().then(mediaServers => {
          this._setMediaServers(mediaServers)
          return this.system.getServerTimes().then(
              (serverTimeInfos:Array<ServerTimeInfo>) => {
                  serverTimeInfos.map(sti => {
                      mediaServers.find(ms => ms.id === sti.serverId).timeInfo = sti
                  })
                  this._setMediaServers(mediaServers)
                  this.updateNoCamerasFlag()
                  if (!this.route.snapshot.children.length) {
                    this.redirectToCameraIfPossible()
                  }
                  console.log('MSs', this.mediaServers)
                  return this.mediaServers
              }
          )
        })
    })
  }

  protected _setMediaServers (mediaServers) {
    this.mediaServers = mediaServers
    this.vms.setMediaServers(mediaServers.map(ms => ({
      ...ms,
      cameras: ms.cameras.map((c: NxCamera) => new Camera(
        c.id,
        c.preferredServerId,
        c.name,
        c.url,
        c.status as CAMERA_STATUS,
        true,
      ))
    })))
  }

  noCameras: boolean = false

  protected updateNoCamerasFlag () {
    let total = 0
    if (this.mediaServers) {
      this.mediaServers.map(ms => {
        ms.cameras.map(c => {
          total += 1
        })
      })
      this.noCameras = !total
    }
  }

  protected redirectToCameraIfPossible () {
    if (this.noCameras) return;

    // first try to find a cookie-stored camera id
    // TODO: extract to a dedicated service
    const cookie_name = `nx_last_accessed_camera_for_system_${this.systemId}`
    const cookieCameraId = this.cookieService.get(cookie_name)
    if (cookieCameraId) {
      const thisCameraExists = !!this.mediaServers.find(ms => ms.cameras.find(c => c.id === cookieCameraId))
      if (thisCameraExists) {
        this.router.navigate([ cookieCameraId ], { relativeTo: this.route })
        return
      }
    }

    // fallback one: first online camera
    const cameraChecker = c => c.status === 'Online' || c.status === 'Recording'
    const firstMediaServerWithAnOnlineCamera = this.mediaServers.find(ms => ms.cameras.find(cameraChecker))
    if (firstMediaServerWithAnOnlineCamera) {
      const firstOnlineCameraId = firstMediaServerWithAnOnlineCamera.cameras.find(cameraChecker)
      this.router.navigate([ firstOnlineCameraId ], { relativeTo: this.route })
      return
    }

    // fallback two: simply first camera available
    const firstMediaServer = this.mediaServers.find(ms => ms.cameras.length)
    const firstCameraId = firstMediaServer.cameras[0].id
    this.router.navigate([ firstCameraId ], { relativeTo: this.route })

    // case of no cameras at all was guarded against in the beginning of this method
  }
}

export default NxSystemViewIndexPageComponent
