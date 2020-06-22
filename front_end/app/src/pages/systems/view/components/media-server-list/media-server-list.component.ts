import { Component, Input, OnChanges } from '@angular/core'
import { INxViewMediaServer } from '../../view.types'
import { NxSystem } from '../../../../../services/system.service'
import { CookieService } from 'ngx-cookie-service'


interface ServerVisibilityDict {
  [serverId: string]: boolean
}

interface CameraThumbnailUrlsDict {
  [cameraId: string]: string
}

@Component({
    selector: 'nx-system-media-server-list',
    templateUrl: 'media-server-list.component.html',
    styleUrls: ['media-server-list.component.scss']
})
export class NxSystemMediaServerListComponent implements OnChanges {

    @Input() systemId: string
    @Input() system: NxSystem
    @Input() mediaServers: Array<INxViewMediaServer>

    filteredMediaServers: Array<INxViewMediaServer>
    showIP: boolean = false
    
    isServerExpanded: ServerVisibilityDict = {}

    cameraThumbnailUrls: CameraThumbnailUrlsDict = {}    

    constructor (
      protected cookieService: CookieService,
    ) {
      this.filteredMediaServers = this.mediaServers
      this.resetServersVisibility()
      this.resetCameraThumbnailUrls()
    }

    ngOnChanges () {
      this.filteredMediaServers = this.mediaServers
      this.resetServersVisibility()
      this.resetCameraThumbnailUrls()
    }    

    protected resetServersVisibility () {
      if (this.mediaServers) {
        this.isServerExpanded = this.mediaServers.reduce(
          (acc, ms) => {
            const cookieName = `nx_system_${this.systemId}_server_${ms.id}_expansion_status`            
            acc[ms.id] = this.cookieService.check(cookieName) ? JSON.parse(this.cookieService.get(cookieName)) : true
            return acc
          },
          {}
        )
      } else {
        this.isServerExpanded = {}
      }
    }

    protected resetCameraThumbnailUrls () {
      this.cameraThumbnailUrls = {}
      if (!this.system || !this.mediaServers) return
      this.system.ensureSystemAuth().then(() => {
        this.mediaServers.map(ms => {
          ms.cameras.filter(c => c.status === 'Online' || c.status === 'Recording').map(c => {
            this.cameraThumbnailUrls[c.id] = this.system.getCameraThumbnailUrl(c.id)
          })
        })
      })
    }

    public updateShowIP (newValue: boolean) {
      this.showIP = newValue
    }

    public updateFilteredList (token: string) {
      if (!token) {
        this.filteredMediaServers = this.mediaServers
        return
      }
      token = token.toLocaleLowerCase()
      this.filteredMediaServers = this.mediaServers.reduce((acc: any[], ms) => {
        const cameras = ms.cameras.filter(c => c.name.toLocaleLowerCase().includes(token) || c.url.toLocaleLowerCase().includes(token))
        if (cameras.length || ms.name.toLocaleLowerCase().includes(token) || ms.url.toLocaleLowerCase().includes(token)) {
          acc.push({ ...ms, cameras })
        }
        return acc
      }, [])
    }

    public changeServerVisibility (serverId: string) {
      if (!(serverId in this.isServerExpanded)) return
      this.isServerExpanded[serverId] = !this.isServerExpanded[serverId]
      const cookieName = `nx_system_${this.systemId}_server_${serverId}_expansion_status`
      this.cookieService.set(cookieName, JSON.stringify(this.isServerExpanded[serverId]))
    }    
}

export default NxSystemMediaServerListComponent
