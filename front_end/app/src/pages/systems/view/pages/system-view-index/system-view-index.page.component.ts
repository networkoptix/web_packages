import { Component, OnInit, OnDestroy, ElementRef, AfterViewInit } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'

import { Subscription } from 'rxjs'

import { ServerTimeInfo, NxSystemService, NxMediaServer, NxCamera, NxSystem } from '../../../../../services/system.service'
import { NxAccountService } from '../../../../../services/account.service'

import VideoManagementSystemService from '../../vms-client/submodules/vms/services/vms.service'
import VmsState, { VMS_MODE } from '../../vms-client/submodules/vms/datatypes/VmsState'
import MediaServer from '../../vms-client/submodules/vms/datatypes/MediaServer'
import Camera from '../../vms-client/submodules/vms/datatypes/Camera'
import { CAMERA_STATUS, SimpleTimeRange } from '../../vms-client/submodules/vms/datatypes/ICamera'
import { ms } from '../../vms-client/utils/type-aliases'
import TimelineService from '../../vms-client/submodules/timeline/services/timeline.service'
import WebClientUxService, { WebclientUxState } from '../../services/webclient-ux.service'
import { exception } from 'console'
import { NxConfigService, IConfig } from '@services/nx-config'


@Component({
  selector: 'nx-system-view-index-page',
  templateUrl: 'system-view-index.page.component.html',
  styleUrls: ['system-view-index.page.component.scss']
})
export class NxSystemViewIndexPageComponent implements OnInit, OnDestroy {

  protected _state: VmsState
  protected _vmsStateSubscription: Subscription
  protected _routerParamsSubscription: Subscription
  protected _uxStateSubscription: Subscription

  public systemId: string
  public system: NxSystem

  protected CONFIG: IConfig;

  public initialized: boolean = false
  public initializedWithError: boolean = false

  public handleSidebarTogglingEarClick () {
    this.ux.isSidebarShown = !this.ux.state.isSidebarShown
  }

  public get $self (): HTMLElement {
    return this.self.nativeElement as HTMLElement
  }

  public get mediaServers (): Array<MediaServer> {
    return this._state && this._state.mode !== VMS_MODE.NOT_INITIALIZED
      ? this._state.mediaServers
      : []
  }

  constructor (
    private self: ElementRef,
    protected router: Router,
    protected route: ActivatedRoute,
    protected accountService: NxAccountService,
    protected systemService: NxSystemService,
    protected vms: VideoManagementSystemService,
    protected timeline: TimelineService,
    protected ux: WebClientUxService,
    configService: NxConfigService,
  ) {
    this.CONFIG = configService.getConfig();
    this._onVmsSubjectChange = this._onVmsSubjectChange.bind(this)
    this._onRouteChange = this._onRouteChange.bind(this)
    this._onUxStateChange = this._onUxStateChange.bind(this)
  }

  public ngOnInit(): void {
    this.vms.reset()
    this._vmsStateSubscription = this.vms.subject.subscribe(this._onVmsSubjectChange)
    this._routerParamsSubscription = this.route.params.subscribe(this._onRouteChange)
    this._uxStateSubscription = this.ux.subject.subscribe(this._onUxStateChange)
  }

  public ngOnDestroy (): void {
    this._vmsStateSubscription.unsubscribe()
    this._routerParamsSubscription.unsubscribe()
    this._uxStateSubscription.unsubscribe()
  }

  protected _onUxStateChange (s: WebclientUxState) {
    if (s.isSidebarShown) {
      this.$self.classList.add('sidebarShown')
    } else {
      this.$self.classList.remove('sidebarShown')
    }
    setTimeout(() => this.timeline.requestCanvasGeometryUpdate(), 220)
  }

  protected _onVmsSubjectChange (s: VmsState) {
    this._state = s
  }

  protected _setInitializationState (initialized, initializedWithError) {
    // console.log('_setInitializationState', initialized, initializedWithError)
    this.initialized = initialized
    this.$self.classList[initialized ? 'add' : 'remove']('initialized')
    this.initializedWithError = initializedWithError
    this.$self.classList[initializedWithError ? 'add' : 'remove']('initialization-error')
  }

  protected _onRouteChange (params) {
    // if (params.systemId) {
      this.systemId = params.systemId || null
      this.system = undefined
      this._setInitializationState(false, false)
      this._initSystem()
    // }
  }

  protected _quality2resolution (q) {
    if (q === 'high') return 'hi'
    if (q === 'low') return 'lo'
    return undefined
  }

  protected _initSystem () {
    this.vms.reset()
    // console.log('initSystem entered')

    const createSystem = () => {
      return this.accountService.get().then(account => {
        if (!account) {
          console.warn('accountService returned no account')
          return Promise.reject()
        }
        if (this.CONFIG.isLocal) {
          this.system = this.systemService.createLocalSystem(this.accountService.mediaServerApi, account.id, account.email);
          console.log('local system created', this.system)
          return Promise.resolve()
        } else {
          this.system = this.systemService.createSystem(account.email, this.systemId)
          return Promise.resolve()
        }
      })
    }

    createSystem()
    .then(() => this.system.getMediaServersAndCameras())
    .then(mediaServers => {
      return this.system.getServerTimes().then(
        (serverTimeInfos: Array<ServerTimeInfo>) => {
          serverTimeInfos.map(sti => {
            mediaServers.find(ms => ms.id === sti.serverId).timeInfo = sti
          })
          return mediaServers
        }
      )
    }).then((mediaServers: Array<NxMediaServer>) => {
      const cameraIds = mediaServers.reduce((acc, ms) => acc.concat(ms.cameras.map(c => c.id)), [])
      const archiveRanges = {}
      const archives = {}
      const now = Date.now()
      Promise.all(cameraIds.map(cid => {
        // return this.system.getCameraRecords(cid, 0, now, 1).then(ar => {
        //   // console.log('got camera archive range', cid, ar)
        //   if (!ar.error || ar.error !== '0' || !ar.reply || !ar.reply.length) {
        //     // console.log('empty archive')
        //   } else try {
        //     archiveRanges[cid] = new SimpleTimeRange(
        //       parseInt(ar.reply[0].startTimeMs),
        //       parseInt(ar.reply[ar.reply.length - 1].startTimeMs) + parseInt(ar.reply[ar.reply.length - 1].durationMs),
        //     )
        //     archives[cid] = ar.reply.map(r => new SimpleTimeRange(parseInt(r.startTimeMs), parseInt(r.startTimeMs) + parseInt(r.durationMs)))
        //     console.log('non-empty archive', cid, archiveRanges[cid], archives[cid].length, 'records', ar)
        //   } catch (e) {
        //     console.warn(e, 'caught while requesting camera archive ranges')
        //   }
        // })
      })).then(() => {
        this.vms.setMediaServers(this.systemId, mediaServers.map(ms => ({
          id: ms.id,
          name: ms.name,
          url: ms.url,
          cameras: ms.cameras.map(c => {
            const result = new Camera(
              c.id,
              c.preferredServerId,
              c.name,
              c.url,
              (c.status === 'Online' ? 'Live' : c.status) as CAMERA_STATUS,
              c.scheduleEnabled,
              new SimpleTimeRange(0, 0), // archiveRanges[c.id],
              [], // archives[c.id],
              c.status === 'Recording' || c.status === 'Online' ? this.system.getCameraThumbnailUrl(c.id) : undefined,
              (quality: string) => {
                return this.system.unsafeGetCameraLiveHlsUrl(c.id, this._quality2resolution(quality))
              },
              (t: ms, quality: string) => {
                return this.system.unsafeGetHlsUrl(c.id, t, this._quality2resolution(quality))
              }
            )
            result.parseAdditionalParams(c.addParams)
            return result
          })
        })))
        console.log(`system ${this.system.id} view initialized`)
        this._setInitializationState(true, false)

        if (!this.route.snapshot.children.length) {
          this._tryToRedirectToCamera()
        }

        setTimeout(() => this.timeline.requestCanvasGeometryUpdate(), 220)

      })
    }).catch(e => {
      console.warn(`system ${this.system.id} view initialization failed`, e)
      this._setInitializationState(true, true)
    })
  }

  protected _tryToRedirectToCamera () {
    const cid = this.vms.getLastAccessedCameraId()
    if (cid) {
      this.router.navigate([ cid ], { relativeTo: this.route })
    }
  }

}

export default NxSystemViewIndexPageComponent
