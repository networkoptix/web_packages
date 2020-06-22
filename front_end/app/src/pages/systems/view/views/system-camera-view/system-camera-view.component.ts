import { Component, OnInit } from '@angular/core'
import { INxViewCamera  } from '../../view.types'
import { ActivatedRoute, Router } from '@angular/router'
import { NxSystemService, NxSystem } from '../../../../../services/system.service'
import { NxAccountService } from '../../../../../services/account.service'
import { int } from '../../components/camera-timeline/timeline/numberTypeAliases'
import { CookieService } from 'ngx-cookie-service'

@Component({
    selector: 'nx-system-camera-view',
    templateUrl: 'system-camera-view.component.html',
    styleUrls: ['system-camera-view.component.scss']
})
export class NxSystemCameraViewComponent implements OnInit {

  public system: NxSystem
  camera: INxViewCamera

  protected POLLING_DELAY_MS: int = 100

  constructor (
    protected route: ActivatedRoute,
    protected router: Router,
    private accountService: NxAccountService,
    private systemService: NxSystemService,
    protected cookieService: CookieService,
  ) {
  }

  public ngOnInit () {
    this.route.params.subscribe(params => {
      return this.accountService.get().then(account => {
        this.system = this.systemService.createSystem(account.email, this.route.snapshot.parent.params.systemId)
        this.pollSystemForMediaServers()
      })
    });
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

export default NxSystemCameraViewComponent
