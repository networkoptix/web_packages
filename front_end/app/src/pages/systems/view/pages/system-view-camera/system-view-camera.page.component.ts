import { Component, OnInit, OnDestroy, ElementRef, AfterViewInit, HostListener } from '@angular/core'
import { PlaybackQuality, PlaybackTransport  } from '../../view.types'
import { ActivatedRoute } from '@angular/router'
import { NxSystemService, NxSystem } from '../../../../../services/system.service'
import { NxAccountService } from '../../../../../services/account.service'
import TimelineService from '../../vms-client/submodules/timeline/services/timeline.service'
import TimelineExtendToNowService from '../../vms-client/submodules/timeline/services/timeline.extend-to-now.service'
import VideoManagementSystemService from '../../vms-client/submodules/vms/services/vms.service'
import ICamera, { SimpleTimeRange } from '../../vms-client/submodules/vms/datatypes/ICamera'
import PlaybackService from '../../vms-client/submodules/playback/services/playback.service'
import { Subscription } from 'rxjs'
import VmsState, { VMS_MODE } from '../../vms-client/submodules/vms/datatypes/VmsState'
import FpsMeterService from '@services/fps-meter.service'
import WebClientUxService, { WebclientUxState } from '../../services/webclient-ux.service'
import { NxConfigService, IConfig } from '../../../../../services/nx-config'
import { CameraQualityStorageService } from '../../services/cameraQualityStorage.service'
import { CameraTransportStorageService } from '../../services/cameraTransportStorage.service'
import sidebarLayout from '../sidebarLayout.cfg'
import { NxUtilsService } from '@services/utils.service'
import fullscreen from './fullscreen'
import { LoggerDecorator } from '../../vms-client/utils'


@Component({
    selector: 'nx-system-view-camera-page',
    templateUrl: 'system-view-camera.page.component.html',
    styleUrls: ['system-view-camera.page.component.scss']
})
@LoggerDecorator('SYSTEM VIEW CAMERA PAGE ::', true)
export class NxSystemViewCameraPageComponent implements OnInit, OnDestroy, AfterViewInit {
    _log: Function
    _warn: Function

    public id: string
    public camera: ICamera
    public system: NxSystem
    public previewUrl = ''

    protected CONFIG: IConfig;

    protected _routeSubscription: Subscription
    protected _vmsStateSubscription: Subscription
    protected _uxStateSubscription: Subscription

    protected _animationFrameRequestHandler: number

    public settingsShown: boolean = false

    public qualitiesAvailable: Array<PlaybackQuality> = []
    public qualitySelected: PlaybackQuality

    public transportsAvailable: Array<PlaybackTransport> = []
    public transportSelected: PlaybackTransport

    public controlsShown: boolean = false
    public canViewArchives = false;

    constructor (
      protected self: ElementRef,
      protected route: ActivatedRoute,
      protected vms: VideoManagementSystemService,
      protected playback: PlaybackService,
      public timeline: TimelineService,
      public timelineExtendToNow: TimelineExtendToNowService,
      protected fpsMeter: FpsMeterService,
      protected ux: WebClientUxService,
      protected accountService: NxAccountService,
      protected systemService: NxSystemService,
      configService: NxConfigService,
      protected cameraQualityStorage: CameraQualityStorageService,
      protected cameraTransportStorage: CameraTransportStorageService,
    ) {
      this.CONFIG = configService.getConfig();
      this._onRouteChange = this._onRouteChange.bind(this)
      this._onVmsStateChange = this._onVmsStateChange.bind(this)
      this._onAnimationFrame = this._onAnimationFrame.bind(this)
      this._onUxStateChange = this._onUxStateChange.bind(this)
    }

    public handleControlsTogglingEarClick () {
      this.ux.isTimelineShown = !this.ux.state.isTimelineShown
    }

    public get $self (): HTMLElement {
      return this.self.nativeElement as HTMLElement
    }

    public ngOnInit (): void {
      this._routeSubscription = this.route.params.subscribe(this._onRouteChange)
      this._vmsStateSubscription = this.vms.subject.subscribe(this._onVmsStateChange)
      this._uxStateSubscription = this.ux.subject.subscribe(this._onUxStateChange)

      this._animationFrameRequestHandler =
        requestAnimationFrame(this._onAnimationFrame)

      const onFSC = e => {
        const fse = fullscreen.getElement()
        this._log('fullscreenchange', e, fse)
        if (this.ux.state.isFullScreen !== !!fse) {
          this.ux.isFullScreen = !!fse
          this.self.nativeElement.classList.remove('is-full-screen')
        }
      }

      document.addEventListener('fullscreenchange', onFSC)
      document.addEventListener('webkitfullscreenchange', onFSC)
      document.addEventListener('mozfullscreenchange', onFSC)

      this._getRecords()
      this._updateStreamsAndQualitiesAvailable()

      this.$self.classList.add('animated')
    }

    protected _updateStreamsAndQualitiesAvailable () {
      this.qualitiesAvailable = []
      this.transportsAvailable = []
      if (!this.camera) {
        return
      }
      if (this.camera.hasHlsStream) {
        this.transportsAvailable.push('hls')
        this.qualitiesAvailable.indexOf('auto') === -1 && this.qualitiesAvailable.push('auto')
        if (this.camera.hasHighQualityHlsStream) {
          this.qualitiesAvailable.indexOf('high') === -1 && this.qualitiesAvailable.push('high')
        }
        if (this.camera.hasLowQualityHlsStream) {
          this.qualitiesAvailable.indexOf('low') === -1 && this.qualitiesAvailable.push('low')
        }
      }
      if (this.camera.hasWebmStream) {
        this.transportsAvailable.push('webm')
        this.qualitiesAvailable.indexOf('auto') === -1 && this.qualitiesAvailable.push('auto')
        if (this.camera.hasHighQualityHlsStream) {
          this.qualitiesAvailable.indexOf('high') === -1 && this.qualitiesAvailable.push('high')
        }
        if (this.camera.hasLowQualityHlsStream) {
          this.qualitiesAvailable.indexOf('low') === -1 && this.qualitiesAvailable.push('low')
        }
      }
    }

    public getRecordsInProgress: string

    protected _getRecords () {
      this._log('_getRecords', this.id)

      const createSystem = () => {
        return this.accountService.get().then(account => {
          if (!account) {
            console.warn('accountService returned no account')
            return Promise.reject()
          }
          if (this.CONFIG.isLocal) {
            this.system = this.systemService.createLocalSystem(this.accountService.mediaServerApi, account.id, account.email);
            this._log('local system created', this.system)
            return Promise.resolve()
          } else {
            this.system = this.systemService.createSystem(account.email, this.vms.systemId)
            return Promise.resolve()
          }
        })
      }

      const now = Date.now()
      if (this.getRecordsInProgress === this.id) {
        this._log('getRecords ALREADY in progress')
        return
      }
      this.getRecordsInProgress = this.id
      createSystem().then(() => {
            this.previewUrl = `url(${this.system.getPreviewUrl(this.id, null)})`;
            if (!this.system.userManager.permissions.viewArchives) {
                this.getRecordsInProgress = undefined;
            } else {
                this.system.getCameraRecords(this.id, 0, now, 1).then(async (ar) => {
                    const [{ vmsTimeOffset, serverId }] = await this.system.getServerTimes();
                    const offsetsByServer = this.system.mediaservers.reduce((
                        reduced, { id, addParams, timeInfo = {} }: any
                    ) => ({
                        ...reduced,
                        [id]: serverId === id ? 0 : parseInt(
                          timeInfo?.timeZoneOffset ??
                          (<any[]>addParams).find(({ name }) => name === 'timezoneUtcOffset')?.value ??
                          vmsTimeOffset
                        ) - vmsTimeOffset
                    }), {});

                    const timezoneAdjusted = [];
                    ar.reply.forEach(({ guid, periods }) => {
                        const cleanId = NxUtilsService.cleanId(guid);
                        periods.forEach(period => {
                            timezoneAdjusted.push({
                                ...period,
                                startTimeMs: parseInt(period.startTimeMs) - offsetsByServer[cleanId]
                            });
                        });
                    });
                    ar.reply = timezoneAdjusted.sort((a, b) => a.startTimeMs - b.startTimeMs);
                    this._log('got camera archive range', this.id, ar);
                    if (!ar.error || ar.error !== '0' || !ar.reply || !ar.reply.length) {
                        this._log('empty archive');
                    } else {
                        try {
                            const firstRecordStartTimeMs = parseInt(ar.reply[0].startTimeMs);
                            const lastRecordStartTimeMs = parseInt(ar.reply[ar.reply.length - 1].startTimeMs);
                            const lastRecordDuration = parseInt(ar.reply[ar.reply.length - 1].durationMs);
                            const stillRecording = lastRecordDuration === -1;
                            const now = Date.now();
                            const archiveEndMs = stillRecording ? now : (lastRecordStartTimeMs + lastRecordDuration);
                            const range = new SimpleTimeRange(firstRecordStartTimeMs, archiveEndMs);
                            const archive = ar.reply.map(r => new SimpleTimeRange(parseInt(r.startTimeMs), parseInt(r.startTimeMs) + parseInt(r.durationMs)));
                            if (stillRecording) {
                                archive[archive.length - 1] = new SimpleTimeRange(lastRecordStartTimeMs, now);
                                this._log('still recording', archive[archive.length - 1], archive[archive.length - 1].duration);
                            }
                            this._log('non-empty archive', this.id, range, archive);
                            this.vms.setCameraRecords(this.id, range, archive);
                            this._initSelectedCamera();
                        } catch (e) {
                            console.warn(e, 'caught while requesting camera archive ranges');
                        }
                    }
                    this.getRecordsInProgress = undefined;
                });
            }
        }).finally(() => {
          this.system.userManager.getUsersDataFromTheSystem().then(() => {
            this.canViewArchives = this.system.userManager.permissions.viewArchives;
          });
        });
    }

    public ngAfterViewInit () {
      this.$self.classList.add('controls-shown')

      // this.fpsMeter.install()
      document['fpsMeter'] = this.fpsMeter

      this.ux.isFullScreen = !!fullscreen.getElement()
    }

    public ngOnDestroy (): void {
      this._routeSubscription.unsubscribe()
      this._vmsStateSubscription.unsubscribe()
      this._uxStateSubscription.unsubscribe()

      cancelAnimationFrame(this._animationFrameRequestHandler)
    }

    protected _onUxStateChange (s: WebclientUxState) {
      this._log('change')
      if (s.isTimelineShown) {
        this.$self.classList.add('controls-shown')
      } else {
        this.$self.classList.remove('controls-shown')
      }
      this.controlsShown = s.isTimelineShown
      // setTimeout(() => this.timeline.requestCanvasGeometryUpdate(), 220)

      if (s.isSidebarShown) {
        this.$self.classList.add('sidebar-shown')
      } else {
        this.$self.classList.remove('sidebar-shown')
      }

      // don't try going fullscreen until the document is ready
      if (document.readyState !== 'complete') {
        this._log('not ready')
        return
      }

      setTimeout(() => {
        if (s.isFullScreen && !fullscreen.getElement()) {
          this._log('+')
          fullscreen.request(this.self.nativeElement.parentElement)
          this.self.nativeElement.classList.add('is-full-screen')
        } else if (!s.isFullScreen && !!fullscreen.getElement()) {
          this._log('-')
          fullscreen.exit()
          this.self.nativeElement.classList.remove('is-full-screen')
        }
      }, 0)
    }

    protected _onRouteChange (params) {
      this.id = params['cameraId'];
      this._log('ROUTE CHANGE: NEW CAMERA', this.id)
      this.vms.selectCamera(this.id)
      this.resetTransport()
      this.resetQuality()
      this._getRecords()
      this._updateStreamsAndQualitiesAvailable()

      if (window.innerWidth <= sidebarLayout.cameraClickHidesSidebarWhenWindowWidthBelowPx) {
        this.ux.isSidebarShown = false
      }
    }

    protected _onVmsStateChange (s: VmsState) {
      switch (s.mode) {
        case VMS_MODE.NOT_INITIALIZED:
        case VMS_MODE.CAMERA_NOT_SELECTED:
          this.camera = undefined
          this.vms.selectCamera(this.id)
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
      this._log('_initSelectedCamera')
      this.playback.stop()

      if (this.camera.hasArchive) {
        this._log('timeline reset time', this.camera)
        this.timeline.reset(this.camera.archiveRange.start, this.camera.archiveRange.end)
      }

      if (this.camera.isLive) {
        this.playback.playLive()
      }
    }

    public toggleFullScreen ($event?) {
      this._log('toggleFullScreen')
      $event?.stopPropagation()
      // this.ux.isFullScreen = !fullscreen.getElement()
      const canRequestFullscreen = fullscreen.request(this.self.nativeElement.parentElement)
      if (!canRequestFullscreen) {
        this.ux.alternateFullScreen$.next(!this.ux.alternateFullScreen$.value)
        // Resets the alternateFullScreen to allow opening once fullscreen is closed
        this.ux.alternateFullScreen$.next(false)
      }
      this.ux.isFullScreen =  canRequestFullscreen && !fullscreen.getElement()()
    }

    public stopSettingsClickPropagation ($event) {
      $event?.stopPropagation()
    }

    public toggleSettings ($event?) {
      $event?.stopPropagation()
      this.settingsShown = !this.settingsShown
    }

    public hideSettings () {
      this.settingsShown = false
    }

    public showSettings () {
      this.settingsShown = true
    }

    public resetQuality () {
      this.setQuality(this.cameraQualityStorage.get(this.id) || 'auto')
    }

    public setQuality (q: PlaybackQuality) {
      this._log('setQuality', q)
      if (this.qualitySelected === q) {
        return
      }
      this.qualitySelected = q
      this.cameraQualityStorage.set(this.id, q)
      this._log('quality change', q)
      this.playback.changeQuality(q)
    }

    public resetTransport () {
      this.setTransport(this.cameraTransportStorage.get(this.id) || 'webm')
    }

    public setTransport (st: PlaybackTransport) {
      this._log('setTransport', st)
      if (this.transportSelected === st) {
        return
      }
      this.transportSelected = st
      this.cameraTransportStorage.set(this.id, st)
      this.playback.changeTransport(st)
    }

    public onVideoDblClick (_: boolean) {
      this.toggleFullScreen()
    }

    @HostListener('document:click', ['$event'])
    public clickOutside ($event) {
      this.hideSettings()
    }
}

export default NxSystemViewCameraPageComponent
