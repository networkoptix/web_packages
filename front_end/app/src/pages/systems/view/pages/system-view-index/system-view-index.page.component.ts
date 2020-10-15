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


@Component({
  selector: 'nx-system-view-index-page',
  templateUrl: 'system-view-index.page.component.html',
  styleUrls: ['system-view-index.page.component.scss']
})
export class NxSystemViewIndexPageComponent implements OnInit, OnDestroy {

  protected _state: VmsState
  protected _vmsStateSubscription: Subscription
  protected _routerParamsSubscription: Subscription

  public systemId: string
  public system: NxSystem

  public initialized: boolean = false
  public initializedWithError: boolean = false

  public handleSidebarTogglingEarClick () {
    this.$self.classList.toggle('sidebarShown')
    setTimeout(() => this.timeline.requestCanvasGeometryUpdate(), 220)
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
  ) {
    this._onVmsSubjectChange = this._onVmsSubjectChange.bind(this)
    this._onRouteChange = this._onRouteChange.bind(this)
  }

  public ngOnInit(): void {
    this.vms.reset()
    this._vmsStateSubscription = this.vms.subject.subscribe(this._onVmsSubjectChange)
    this._routerParamsSubscription = this.route.params.subscribe(this._onRouteChange)
  }

  public ngOnDestroy (): void {
    this._vmsStateSubscription.unsubscribe()
    this._routerParamsSubscription.unsubscribe()
  }

  protected _onVmsSubjectChange (s: VmsState) {
    this._state = s
  }

  protected _onRouteChange (params) {
    if (params.systemId) {
      this.systemId = params.systemId
      this.system = undefined
      this.initialized = false
      this.initializedWithError = false
      this._initSystem()
    }
  }

  protected _initSystem () {
    this.vms.reset()
    this.accountService.get().then(account => {
      // @ts-ignore -- TODO: Need to handle account not being available
      this.system = this.systemService.createSystem(account.email, this.systemId)
      return this.system.getMediaServersAndCameras()
    }).then(mediaServers => {
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
        // return this.system.getCameraRecords(cid, 0, now, 1e10).then(ar => {
        //   // console.log('got camera archive range', cid, ar)
        //   if (!ar.error || ar.error !== '0' || !ar.reply || !ar.reply.length) {
        //     // console.log('empty archive')
        //   } else try {
        //     const reply = ar.reply[0]
        //     archiveRanges[cid] = {
        //       start: parseInt(reply.startTimeMs),
        //       end: parseInt(reply.startTimeMs) + parseInt(reply.durationMs) || now,
        //     }
        //     archives[cid] = ar.reply.map(r => new SimpleTimeRange(r.startTimeMs, r.startTimeMs + r.durationMs))
        //     // console.log('non-empty archive', cid, archiveRanges[cid], ar)
        //   } catch (e) {
        //     console.warn(e, 'caught while requesting camera archive ranges')
        //   }
        // })
        return this.system.getCameraRecords(cid, 0, now, 1).then(ar => {
          // console.log('got camera archive range', cid, ar)
          if (!ar.error || ar.error !== '0' || !ar.reply || !ar.reply.length) {
            // console.log('empty archive')
          } else try {
            archiveRanges[cid] = {
              start: parseInt(ar.reply[0].startTimeMs),
              end: parseInt(ar.reply[ar.reply.length - 1].startTimeMs) + parseInt(ar.reply[ar.reply.length - 1].durationMs),
            }
            archives[cid] = ar.reply.map(r => new SimpleTimeRange(r.startTimeMs, r.startTimeMs + r.durationMs))
            console.log('non-empty archive', cid, archiveRanges[cid], archives[cid].length, 'records', ar)
          } catch (e) {
            console.warn(e, 'caught while requesting camera archive ranges')
          }
        })
      })).then(() => {
        this.vms.setMediaServers(this.systemId, mediaServers.map(ms => ({
          id: ms.id,
          name: ms.name,
          url: ms.url,
          cameras: ms.cameras.map(c => new Camera(
            c.id,
            c.preferredServerId,
            c.name,
            c.url,
            c.status as CAMERA_STATUS,
            archiveRanges[c.id],
            archives[c.id],
            c.status === 'Recording' || c.status === 'Live' ? this.system.getCameraThumbnailUrl(c.id) : undefined,
            this.system.unsafeGetCameraLiveHlsUrl(c.id),
            (t: ms) => {
              return this.system.unsafeGetHlsUrl(c.id, t)
            }
          ))
        })))
        this.initialized = true
        console.log(`system ${this.system.id} view initialized`)

        if (!this.route.snapshot.children.length) {
          this._tryToRedirectToCamera()
        }

        this.$self.classList.add('sidebarShown')
        setTimeout(() => this.timeline.requestCanvasGeometryUpdate(), 220)
      })
    }).catch(e => {
      console.warn(`system ${this.system.id} view initialization failed`, e)
      this.initialized = true
      this.initializedWithError = true
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
