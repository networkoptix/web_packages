import { Component, OnInit, OnDestroy, ElementRef, HostListener } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'

import { Subject, Subscription, timer } from 'rxjs'

import { ServerTimeInfo, NxSystemService, NxMediaServer, NxSystem } from '../../../../../services/system.service'
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

import sidebarLayout from '../sidebarLayout.cfg'
import { LoggerDecorator } from '../../vms-client/utils'
import { NxSystemsService } from '@services/systems.service';
import { UntilDestroy }                    from '@ngneat/until-destroy';
import { distinctUntilChanged, takeUntil } from 'rxjs/operators'
import { NxUtilsService }                  from '@services/utils.service'

@UntilDestroy({ checkProperties: true })
@Component({
  selector: 'nx-system-view-index-page',
  templateUrl: 'system-view-index.page.component.html',
  styleUrls: ['system-view-index.page.component.scss']
})
@LoggerDecorator('SYSTEM VIEW INDEX PAGE ::', true)
export class NxSystemViewIndexPageComponent implements OnInit, OnDestroy {
  _log: Function
  _warn: Function
  private systemsSubscription: Subscription;

  protected _state: VmsState
  protected _vmsStateSubscription: Subscription
  protected _routerParamsSubscription: Subscription
  protected _uxStateSubscription: Subscription

  public systemId: string
  public system: NxSystem
  public systems: NxSystem[];

  protected CONFIG: IConfig;

  public initialized: boolean = false
  public initializedWithError: boolean = false
  public isSidebarShown: boolean = false

  public hasCameras: boolean = true
  private cancelPoll$ = new Subject<string>()

  // public animated: boolean = false

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

  protected _windowWidth = 1024 // should be larger than the threshold

  @HostListener('window:resize', ['$event'])
  public onResize (event) {
    const width_threshold = sidebarLayout.sidebarOverlaysWhenWindowWidthBelowPx
    const newWidth = event.target.innerWidth
    if (newWidth <= width_threshold && this._windowWidth > width_threshold) {
      this._handleMovingFromWideInterfaceToNarrow()
    }
    if (newWidth > width_threshold && this._windowWidth <= width_threshold) {
      this._handleMovingFromNarrowInterfaceToWide()
    }
    this._windowWidth = newWidth
  }

  protected _handleMovingFromWideInterfaceToNarrow () {
    this.ux.isSidebarShown = false
  }

  protected _handleMovingFromNarrowInterfaceToWide () {
    this.ux.isSidebarShown = true
  }

  constructor (
    private self: ElementRef,
    protected router: Router,
    protected route: ActivatedRoute,
    protected accountService: NxAccountService,
    protected systemService: NxSystemService,
    protected systemsService: NxSystemsService,
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
    this.onResize({ target: { innerWidth: window.innerWidth } })

    this.systemsSubscription = this.systemsService.systemsSubject
        .pipe(distinctUntilChanged())
        .subscribe((systems) => {
          if (systems.length) {
            this.systems = systems;
          }
          this._initSystem();
        });
  }

  public ngOnDestroy (): void {
    this.cancelPoll$.next('cancel')
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
    // this._log('ux state change sidebar visibility', s.isSidebarShown)
    this.isSidebarShown = s.isSidebarShown
    setTimeout(() => this.timeline.requestCanvasGeometryUpdate(), 220)
  }

  protected _onVmsSubjectChange (s: VmsState) {
    this._state = s
  }

  protected _setInitializationState (initialized, initializedWithError) {
    // this._log('_setInitializationState', initialized, initializedWithError)
    this.initialized = initialized
    this.$self.classList[initialized ? 'add' : 'remove']('initialized')
    this.initializedWithError = initializedWithError
    this.$self.classList[initializedWithError ? 'add' : 'remove']('initialization-error')
  }

  protected _onRouteChange (params) {
      this.systemId = params.systemId || null
      this.system = undefined
      this.hasCameras = false
      this._setInitializationState(false, false)
  }

  protected _quality2resolution (q) {
    if (q === 'high') return 'hi'
    if (q === 'low') return 'lo'
    return undefined
  }

  protected _initSystem () {
    this.vms.reset()
    // this._log('initSystem entered')

    const createSystem = () => {
      return this.accountService.get().then(account => {
        if (!account) {
          this._warn('accountService returned no account')
          return Promise.reject()
        }

        if (this.CONFIG.isLocal) {
          this.system = this.systemService.createLocalSystem(this.accountService.mediaServerApi, account.id, account.email);
          this._log('local system created', this.system)
          return Promise.resolve();

        }

        // _initSystem is called on systems subscription
        if (this.systems.filter(s => s.id === this.systemId).length) {
          this.system = this.systemService.createSystem(account.email, this.systemId);
          return Promise.resolve();
        }

        return Promise.reject();
      });
    };

    let cachedMediaServers

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
        // (check archive presence mode)
        if (!this.system.userManager.permissions.viewArchives) {
          return Promise.resolve();
        }
        return this.system.getCameraRecords(cid, 0, now, now).then(response => {
          const hasArchive = parseInt(response.error) ? false : (response.reply && response.reply.length)
          // this._log('check archive presence', cid, result, response, '|', response.reply, '|', response.reply.length)
          const extractChunk = chunk => {
            let start, duration;
            // 4.3 api response changed
            if (chunk?.periods.length) {
              start = parseInt(chunk.periods[0].startTimeMs);
              duration = parseInt(chunk.periods[0].durationMs);
            } else {
              start = parseInt(chunk.startTimeMs);
              duration = parseInt(chunk.durationMs);
            }
            const now = Date.now();
            const end = (duration === -1) ? now : (start + duration);
            return [start, end];
          }
          if (hasArchive) {
            const [start, end] = extractChunk(response.reply[0]);
            archiveRanges[cid] = new SimpleTimeRange(start, end);
          }
        })
        // (full archive prefetch mode)
        // return this.system.getCameraRecords(cid, 0, now, 1).then(ar => {
        //   // this._log('got camera archive range', cid, ar)
        //   if (!ar.error || ar.error !== '0' || !ar.reply || !ar.reply.length) {
        //     // this._log('empty archive')
        //   } else try {
        //     archiveRanges[cid] = new SimpleTimeRange(
        //       parseInt(ar.reply[0].startTimeMs),
        //       parseInt(ar.reply[ar.reply.length - 1].startTimeMs) + parseInt(ar.reply[ar.reply.length - 1].durationMs),
        //     )
        //     archives[cid] = ar.reply.map(r => new SimpleTimeRange(parseInt(r.startTimeMs), parseInt(r.startTimeMs) + parseInt(r.durationMs)))
        //     this._log('non-empty archive', cid, archiveRanges[cid], archives[cid].length, 'records', ar)
        //   } catch (e) {
        //     this._warn(e, 'caught while requesting camera archive ranges')
        //   }
        // })
      })).then(() => {
        // console.log('archiveRanges', archiveRanges)
        cachedMediaServers = mediaServers.map(ms => ({
          id: ms.id,
          name: ms.name,
          url: ms.url,
          status: ms.status,
          cameras: ms.cameras.map(c => {
            this.hasCameras = true
            const result = new Camera(
              c.id,
              c.preferredServerId,
              c.name,
              c.url,
              (c.status === 'Online' ? 'Live' : c.status) as CAMERA_STATUS,
              c.scheduleEnabled,
              archiveRanges[c.id] || new SimpleTimeRange(0, 0),
              archives[c.id] || [],
              c.status === 'Recording' || c.status === 'Online' ? this.system.getCameraThumbnailUrl(c.id) : undefined,
              (transport: string, quality: string, t?: ms) => this.system.getPlaybackUrl(c.id, transport, quality, t),
              (t?: ms) => this.system.getCameraThumbnailUrl(c.id, 128, 128, t)
            )
            result.parseAdditionalParams(c.addParams)
            return result
          })
        }))

        this.vms.setMediaServers(this.systemId, cachedMediaServers)
        console.log(`system ${this.system.id} view initialized`, this.hasCameras)
        this._setInitializationState(true, false)

        if (!this.route.snapshot.children.length) {
          this._tryToRedirectToCamera()
        }

        setTimeout(() => this.timeline.requestCanvasGeometryUpdate(), 220)

        // if (!this.animated) {
        //   this.animated = true
        //   this.$self.classList.add('animated')
        // }

      })
    }).catch(e => {
      console.warn(`system ${this.system?.id || this.systemId} view initialization failed`, e);
      setTimeout(() => this._setInitializationState(true, true));
    })

    this.cancelPoll$.next('cancel')
    timer(0, VideoManagementSystemService.statusRefreshInterval).pipe(
      takeUntil(this.cancelPoll$)
    ).subscribe(async() => {
      const cameras = await this.system.cameraManager.getCameras().then(cameras => cameras.reduce((parsed, camera) => ({
        ...parsed,
        [NxUtilsService.cleanId(camera.id)]: camera
      }), {}))
      for (const serverId in cachedMediaServers) {
        const server = cachedMediaServers[serverId]
        for (const camera of server.cameras) {
          const updatedCamera = cameras[camera.id]
          if (updatedCamera) {
            camera.status = updatedCamera.status
            camera.name = updatedCamera.name
          }
        }
        this.vms.setMediaServers(this.systemId, cachedMediaServers, true)
      }
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
