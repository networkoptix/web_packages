import { Component, OnInit, OnDestroy } from '@angular/core'
// import { INxViewMediaServer } from '../../view.types'
import { ActivatedRoute, Router } from '@angular/router'
import { Subscription } from 'rxjs'
import { ServerTimeInfo, NxSystemService, NxMediaServer, NxSystem } from '../../../../../services/system.service'
import { NxAccountService } from '../../../../../services/account.service'
import { CookieService } from 'ngx-cookie-service'


@Component({
    selector: 'nx-system-view',
    templateUrl: 'system-view.component.html',
    styleUrls: ['system-view.component.scss']
})
export class NxSystemViewComponent implements OnInit, OnDestroy {

  public systemId: string
  public system: NxSystem
  public mediaServers: Array<NxMediaServer>

  constructor (
    protected router: Router,
    protected route: ActivatedRoute,
    protected accountService: NxAccountService,
    protected systemService: NxSystemService,
    protected cookieService: CookieService,
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
    return this.accountService.get().then(account => {
        this.system = this.systemService.createSystem(account.email, this.systemId)
        return this.system.getMediaServersAndCameras().then(mediaServers => {
          this.mediaServers = mediaServers
          return this.system.getServerTimes().then(
              (serverTimeInfos:Array<ServerTimeInfo>) => {
                  serverTimeInfos.map(sti => {
                      mediaServers.find(ms => ms.id === sti.serverId).timeInfo = sti
                  })
                  this.mediaServers = mediaServers
                  this.updateNoCamerasFlag()
                  if (!this.route.snapshot.children.length) {
                    this.redirectToCameraIfPossible()
                  }
                  return this.mediaServers
              }
          )
        })
    })
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

export default NxSystemViewComponent
