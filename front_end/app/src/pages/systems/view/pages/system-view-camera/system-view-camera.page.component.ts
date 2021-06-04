import { DOCUMENT }                               from '@angular/common';
import {
    Component, OnInit, OnDestroy, ElementRef,
    AfterViewInit, HostListener, Inject
}                                                 from '@angular/core';
import { PlaybackQuality, PlaybackTransport }     from '../../view.types';
import { ActivatedRoute }                         from '@angular/router';
import { NxSystemService, NxSystem }              from '../../../../../services/system.service';
import { NxAccountService }                       from '../../../../../services/account.service';
import TimelineService                            from '../../vms-client/submodules/timeline/services/timeline.service';
import TimelineExtendToNowService                 from '../../vms-client/submodules/timeline/services/timeline.extend-to-now.service';
import VideoManagementSystemService               from '../../vms-client/submodules/vms/services/vms.service';
import ICamera, {
    AvailableTransportsAndResolutions,
    SimpleTimeRange
}                                                 from '../../vms-client/submodules/vms/datatypes/ICamera';
import PlaybackService                            from '../../vms-client/submodules/playback/services/playback.service';
import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import VmsState, { VMS_MODE }                     from '../../vms-client/submodules/vms/datatypes/VmsState';
import FpsMeterService                            from '@services/fps-meter.service';
import WebClientUxService, { WebclientUxState }   from '../../services/webclient-ux.service';
import { NxConfigService, IConfig }               from '../../../../../services/nx-config';
import { CameraQualityStorageService }            from '../../services/cameraQualityStorage.service';
import { CameraTransportStorageService }          from '../../services/cameraTransportStorage.service';
import sidebarLayout                              from '../sidebarLayout.cfg';
import { NxUtilsService }                         from '@services/utils.service';
import fullscreen                                 from './fullscreen';
import { LoggerDecorator }              from '../../vms-client/utils';
import PlaybackState, { PLAYBACK_MODE } from '../../vms-client/submodules/playback/datatypes/PlaybackState';
import { filter, takeUntil }            from 'rxjs/operators';
import { UntilDestroy }                           from '@ngneat/until-destroy';
import { NxLanguageProviderService }              from '../../../../../services/nx-language-provider';
import { LanguageI18NStaticTypes }                from '../../../../../../language_i18n_static_types';
import Hls from 'hls.js';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-system-view-camera-page',
    templateUrl : 'system-view-camera.page.component.html',
    styleUrls   : ['system-view-camera.page.component.scss']
})
@LoggerDecorator('SYSTEM VIEW CAMERA PAGE ::', true)
export class NxSystemViewCameraPageComponent implements OnInit, OnDestroy, AfterViewInit {
    _log: Function
    _warn: Function

    private readonly isMobile: boolean;
    public id: string
    public camera: ICamera
    public system: NxSystem
    public previewUrl = ''

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    fullscreenMode: boolean;
    showElementsInFSM: boolean;
    onShowElements: any;
    onMoveShowElements: any;

    protected _routeSubscription: Subscription
    protected _vmsStateSubscription: Subscription
    protected _uxStateSubscription: Subscription

    protected _animationFrameRequestHandler: number

    public settingsShown: boolean = false

    public availableTransportsAndResolutions$ = new BehaviorSubject<AvailableTransportsAndResolutions>({})
    public transports$ = new BehaviorSubject<PlaybackTransport[]>([])
    public qualities$ = new BehaviorSubject<PlaybackQuality[]>([])
    public selectedTransport$ = new BehaviorSubject<PlaybackTransport>(undefined)
    public selectedQuality$ = new BehaviorSubject<PlaybackQuality>(undefined)

    public controlsShown: boolean = false
    public canViewArchives = false;
    public showPlayerSection = false;
    public cameraError: string;
    private status = false;
    private cameraCurrentState: PlaybackState;
    public transportError: boolean;
    private unsub$ = new Subject();

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        utilsService: NxUtilsService,
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
        protected cameraQualityStorage: CameraQualityStorageService,
        protected cameraTransportStorage: CameraTransportStorageService,
        @Inject(DOCUMENT) private document: any
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;

        this.fullscreenMode = false;
        this.showElementsInFSM = true;
        this.isMobile = this.isMobile = utilsService.isMobile() || utilsService.isTablet();
    }

    public handleControlsTogglingEarClick () {
        this.ux.isTimelineShown = !this.ux.state.isTimelineShown;
    }

    public get $self (): HTMLElement {
        return this.self.nativeElement as HTMLElement;
    }

    public ngOnInit (): void {
        this._routeSubscription = this.route.params
            .subscribe((params) => this._onRouteChange(params));
        this._vmsStateSubscription = this.vms.subject
            .subscribe((vmsState) => this._onVmsStateChange(vmsState));
        this._uxStateSubscription = this.ux.subject
            .subscribe((clientUxState) => this._onUxStateChange(clientUxState));

        this._animationFrameRequestHandler =
            requestAnimationFrame(() => this._onAnimationFrame());

        const onFSC = e => {
            const fse = fullscreen.getElement();
            this._log('fullscreenchange', e, fse);
            this.fullscreenMode = !!fse;
            if (this.fullscreenMode) {
                this.onShowElements = setTimeout(() => {
                    this.showElementsInFSM = false;
                }, 3000);
            } else {
                clearTimeout(this.onShowElements);
                clearTimeout(this.onMoveShowElements);
                this.showElementsInFSM = true;
            }

            if (this.ux.state.isFullScreen !== !!fse) {
                this.ux.isFullScreen = !!fse;
                this.self.nativeElement.classList.remove('is-full-screen');
            }
        };

        document.addEventListener('fullscreenchange', onFSC);
        document.addEventListener('webkitfullscreenchange', onFSC);
        document.addEventListener('mozfullscreenchange', onFSC);

        this._updateAvailableTransportsAndResolutions();

        this.$self.classList.add('animated');
        this.availableTransportsAndResolutions$
            .pipe(filter((TaR) => TaR !== undefined))
            .subscribe((transportsAndResolutions: AvailableTransportsAndResolutions) => {
                const videoTypes = {
                    ogg  : 'video/ogg',
                    mp4  : 'video/mp4',
                    webm : 'video/webm',
                    hls  : 'application/x-mpegURL',
                    rtsp : 'video/webm'
                };
                const video = this.document.createElement('video');
                const isHlsSupported = Hls.isSupported();
                this.transports = <PlaybackTransport[]>Object.keys(transportsAndResolutions)
                    .filter((transport) => (
                        transport === 'hls' && !this.isMobile
                            ? isHlsSupported
                            : video.canPlayType(videoTypes[transport] || transport) !== '')
                    );
            });

        this.transports$.subscribe((transports) => {
            if (!transports.length) {
                this.selectedTransport = undefined;
                this.qualities = undefined;
            } else if (!transports.includes(this.selectedTransport)) {
                this.resetTransport();
            }
            this.qualities = this.availableTransportsAndResolutions[this.selectedTransport];
            this.transportError = (this.selectedTransport === undefined);
        });

        this.qualities$.subscribe((qualities) => {
            if (!qualities.includes(this.selectedQuality)) {
                this.selectedQuality = <PlaybackQuality>qualities.slice().shift();
            } else {
                this.selectedQuality$.next(this.selectedQuality);
            }
        });
        this.accountService.get().then((account) => {
            if (!account) {
                this._warn('accountService returned no account');
                return Promise.reject();
            }
            if (this.CONFIG.isLocal) {
                this.system = this.systemService.createLocalSystem(this.accountService.mediaServerApi, account.id, account.email);
                this._log('local system created', this.system);
            } else {
                this.system = this.systemService.createSystem(account.email, this.vms.systemId);
            }
            this._getRecords();
        });
    }

    public get availableTransportsAndResolutions () {
        return this.availableTransportsAndResolutions$.getValue();
    }

    public set availableTransportsAndResolutions (transportsAndResolutions: AvailableTransportsAndResolutions) {
        this.availableTransportsAndResolutions$.next(transportsAndResolutions);
    }

    private get transports () {
        return this.transports$.getValue();
    }

    private set transports (transports) {
        this.transports$.next(transports || []);
    }

    get selectedTransport (): PlaybackTransport {
        return this.selectedTransport$.getValue();
    }

    set selectedTransport (transport: PlaybackTransport) {
        this._log('setTransport', transport);
        if (transport && this.selectedTransport !== transport) {
            this.qualities = this.availableTransportsAndResolutions[transport];
            this.cameraTransportStorage.set(this.id, transport);
            this._log('actual selectedTransport change', transport);
            this.playback.changeTransport(transport);
        }
        this.selectedTransport$.next(transport);
    }

    private set qualities (qualities) {
        this.qualities$.next(qualities?.map((quality) => this.qualityToVerbose(quality)) || []);
    }

    get selectedQuality (): PlaybackQuality {
        return this.selectedQuality$.getValue();
    }

    set selectedQuality (initialQuality: PlaybackQuality) {
        const quality = (initialQuality || 'auto').toLowerCase();
        this._log('setQuality', quality);
        if (this.selectedQuality !== initialQuality) {
            this.cameraQualityStorage.set(this.id, quality);
            this._log('quality change', quality);
            this.playback.changeQuality(this.qualityFromVerbose(quality));
        }
        this.selectedQuality$.next(quality);
    }

    public qualityToVerbose (q: PlaybackQuality) {
        switch (q) {
            case 'hi':
                return 'High';
            case 'lo':
                return 'Low';
            case '':
                return 'Auto';
            default:
                return q;
        }
    }

    public qualityFromVerbose (q: PlaybackQuality) {
        switch (q) {
            case 'high':
                return 'hi';
            case 'low':
                return 'lo';
            case 'auto':
                return !this.camera?.disableDualStreaming ? 'lo' : 'hi';
            default:
                return q;
        }
    }

    public getRecordsInProgress: string // cameraId

    protected _updateAvailableTransportsAndResolutions () {
        this.availableTransportsAndResolutions =
            this.camera ? this.camera.availableTransportsAndResolutions : {};
    }

    protected _getRecords () {
        this._log('_getRecords', this.id);

        const now = Date.now();
        if (this.getRecordsInProgress === this.id) {
            this._log('getRecords ALREADY in progress');
            return;
        }
        this.getRecordsInProgress = this.id;
        this.previewUrl = `url(${this.system.getPreviewUrl(this.id, null)})`;
        if (!this.system.userManager.permissions.viewArchives) {
            this.getRecordsInProgress = undefined;
        } else {
            this.system.getCameraRecords(this.id, 0, now, 1).then(async(ar) => {
                ar = await this._prepareArchiveRecords(ar);
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
                        const range = new SimpleTimeRange(firstRecordStartTimeMs, stillRecording ? now : (lastRecordStartTimeMs + lastRecordDuration));
                        const archive = ar.reply.map(r => new SimpleTimeRange(parseInt(r.startTimeMs), parseInt(r.startTimeMs) + parseInt(r.durationMs)));
                        if (stillRecording) {
                            archive[archive.length - 1] = new SimpleTimeRange(lastRecordStartTimeMs, now);
                            this._log('still recording', archive[archive.length - 1], archive[archive.length - 1].duration);
                        }
                        this._log('non-empty archive', this.id, range, archive);
                        this.vms.setCameraRecords(this.id, range, archive);
                        this.startPollingForNewlyRecordedChunks();
                    } catch (e) {
                        this._warn(e, 'caught while requesting camera archive ranges');
                    }
                }
            });
        }
        this.getRecordsInProgress = undefined;
        this._initSelectedCamera();
        this.system.userManager.getUsersDataFromTheSystem().then(_ => {
            this.canViewArchives = this.system.userManager.permissions.viewArchives;
        });
    }

    protected _newlyRecordedIntervalHandle

    public startPollingForNewlyRecordedChunks () {
        const since = this.vms.selectedCamera.archiveRange.end;
        if (this._newlyRecordedIntervalHandle) {
            clearInterval(this._newlyRecordedIntervalHandle);
        }
        this._newlyRecordedIntervalHandle = setInterval(() => {
            const now = Date.now();
            const cameraId = this.id;
            this.system.getCameraRecords(this.id, since, now, 1).then(async (ar) => {
                ar = await this._prepareArchiveRecords(ar);
                if (!ar.error || ar.error !== '0' || !ar.reply || !ar.reply.length) {
                    this._log('no newly recorded');
                } else {
                    this._log('newly recorded', ar);
                    const prepared = ar.reply.map(r => {
                        // the server has a weird habit of sending strings instead of numbers every now and then
                        let start = parseInt(r.startTimeMs);
                        start = Math.max(start, since);
                        const duration = parseInt(r.durationMs);
                        return new SimpleTimeRange(
                            start,
                            r.durationMs < 0
                                ? now
                                : start + duration
                        );
                    });
                    this.vms.setCameraNewlyRecordedChunks(cameraId, prepared);
                }
            });
        }, 10 * 1000);
    }

    protected async _getServerTimes () {
        // TODO: caching?
        this.vms.serverTimes = await this.system.getServerTimes();
        return this.vms.serverTimes;
    }

    protected async _prepareArchiveRecords (ar) {
        const [{
            // osTimeOffset,
            serverId,
            // timeZoneOffset,
            // vmsTime,
            vmsTimeOffset
        }] = await this._getServerTimes();

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
        return ar;
    }

    public ngAfterViewInit () {
        this.$self.classList.add('controls-shown');

        // this.fpsMeter.install()
        // @ts-ignore
        document.fpsMeter = this.fpsMeter;
        // allows calling document.fpsMeter.install() from the developer console, if needed

        this.ux.isFullScreen = !!fullscreen.getElement();
    }

    public ngOnDestroy (): void {
        this._routeSubscription?.unsubscribe();
        this._vmsStateSubscription?.unsubscribe();
        this._uxStateSubscription?.unsubscribe();

        cancelAnimationFrame(this._animationFrameRequestHandler);
    }

    protected _onUxStateChange (s: WebclientUxState) {
        this._log('change');
        if (s.isTimelineShown) {
            this.$self.classList.add('controls-shown');
        } else {
            this.$self.classList.remove('controls-shown');
        }
        this.controlsShown = s.isTimelineShown;
        // setTimeout(() => this.timeline.requestCanvasGeometryUpdate(), 220)

        if (s.isSidebarShown) {
            this.$self.classList.add('sidebar-shown');
        } else {
            this.$self.classList.remove('sidebar-shown');
        }

        // don't try going fullscreen until the document is ready
        if (document.readyState !== 'complete') {
            this._log('not ready');
            return;
        }

        setTimeout(() => {
            if (s.isFullScreen && !fullscreen.getElement()) {
                this._log('+');
                fullscreen.request(this.self.nativeElement.parentElement);
                this.self.nativeElement.classList.add('is-full-screen');
            } else if (!s.isFullScreen && !!fullscreen.getElement()) {
                this._log('-');
                fullscreen.exit();
                this.self.nativeElement.classList.remove('is-full-screen');
            }
        });
    }

    protected _onRouteChange (params) {
        this.id = params.cameraId;
        this._log('ROUTE CHANGE: NEW CAMERA', this.id);
        this.vms.selectCamera(this.id);
        this.resetTransport();
        this.resetQuality();

        if (this.vms.selectedCamera && this.system) {
            this._getRecords();
        }

        if (window.innerWidth <= sidebarLayout.cameraClickHidesSidebarWhenWindowWidthBelowPx) {
            this.ux.isSidebarShown = false;
        }
    }

    protected _onVmsStateChange (s: VmsState) {
        this._log('VMS state change', { ...s });
        switch (s.mode) {
            case VMS_MODE.NOT_INITIALIZED:
                this._log('-> NOT_INITIALIZED');
                this.camera = undefined;
                break;
            case VMS_MODE.CAMERA_NOT_SELECTED:
                this._log('-> CAMERA_NOT_SELECTED');
                this.vms.selectCamera(this.id);
                break;
            case VMS_MODE.CAMERA_SELECTED:
                this._log('-> CAMERA_SELECTED');
                this.camera = s.selectedCamera;
                this._updateAvailableTransportsAndResolutions();
                this._initSelectedCamera();
        }
    }

    public _onAnimationFrame (): void {
        if (this.camera?.isLive) {
            this.timelineExtendToNow.extendToNow();
        }

        this._animationFrameRequestHandler =
            requestAnimationFrame(() => this._onAnimationFrame());
    }

    public get showTimeline (): boolean {
        return this.camera && this.camera.hasArchive && this.canViewArchives;
    }

    showPlayer() {
        const currentStatus = this.cameraError === '' && (this.camera?.isAuthorized && this.camera?.isOnline && (this.cameraCurrentState.mode === PLAYBACK_MODE.STOPPED || this.cameraCurrentState.mode === PLAYBACK_MODE.LIVE) ||
            this.camera?.hasArchive && this.cameraCurrentState.mode === PLAYBACK_MODE.ARCHIVE);

        if (!this.status && currentStatus) {
            if (this.camera?.hasArchive) {
                this._log('timeline reset time', this.camera);
                this.timeline.reset(this.camera.archiveRange.start, this.camera.archiveRange.end);
            }

            if (this.camera?.isLive) {
                setTimeout(() => this.playback.playLive());
            }
        }

        this.status = currentStatus;
        return this.status;
    }

    protected _initSelectedCamera () {
        this._log('_initSelectedCamera');
        this.playback.stop();
        this.resetTransport();
        this.resetQuality();

        if (this.camera?.isLive) {
            setTimeout(() => this.playback.playLive());
        }

        this.unsub$.next('done');
        this.playback.subject.pipe(takeUntil(this.unsub$)).subscribe((state: PlaybackState) => {
            this.cameraCurrentState = state;
            this.cameraError = state.error;
            // Moved into a function to detect camera's state change Offline<->Online ..etc.
            // this.showPlayerSection = state.error === '' && (this.camera?.isAuthorized && this.camera?.isOnline && (state.mode === PLAYBACK_MODE.STOPPED || state.mode === PLAYBACK_MODE.LIVE) ||
            //     this.camera?.hasArchive && state.mode === PLAYBACK_MODE.ARCHIVE);
        });

        // if (this.camera?.hasArchive) {
        //     this._log('timeline reset time', this.camera);
        //     this.timeline.reset(this.camera.archiveRange.start, this.camera.archiveRange.end);
        // }
        //
        // if (this.camera?.isLive) {
        //     setTimeout(() => this.playback.playLive());
        // }
    }

    public toggleFullScreen ($event?) {
        this._log('toggleFullScreen');
        $event?.stopPropagation();
        // this.ux.isFullScreen = !fullscreen.getElement()
        const canRequestFullscreen = fullscreen.request(this.self.nativeElement.parentElement);
        if (!canRequestFullscreen) {
            this.ux.alternateFullScreen$.next(!this.ux.alternateFullScreen$.value);
            // Resets the alternateFullScreen to allow opening once fullscreen is closed
            this.ux.alternateFullScreen$.next(false);
        }
        this.ux.isFullScreen = canRequestFullscreen && !fullscreen.getElement();
    }

    public stopSettingsClickPropagation ($event) {
        $event?.stopPropagation();
    }

    public toggleSettings ($event?) {
        $event?.stopPropagation();
        this.settingsShown = !this.settingsShown;
    }

    public hideSettings () {
        this.settingsShown = false;
    }

    public showSettings () {
        this.settingsShown = true;
    }

    public resetQuality () {
        this.selectedQuality = this.cameraQualityStorage.get(this.id) || 'auto';
    }

    public resetTransport () {
        const transports = this.transports;
        let transport = this.cameraTransportStorage.get(this.id);
        if (!transport) {
            if (transports.includes('hls')) {
                transport = 'hls';
            } else if (transports.includes('webm')) {
                transport = 'webm';
            } else {
                transport = transports[0];
            }
        }
        this.selectedTransport = transport;
    }

    public onVideoDblClick (_: boolean) {
        this.toggleFullScreen();
    }

    @HostListener('document:click', ['$event'])
    public clickOutside ($event) {
        this.hideSettings();
    }

    @HostListener('mousemove', ['$event'])
    @HostListener('touch', ['$event'])
    @HostListener('touchmove', ['$event'])
    onEvent(event: Event) {
        if (this.fullscreenMode && !this.showElementsInFSM) {
            this.showElementsInFSM = true;
            clearTimeout(this.onMoveShowElements);
            this.onMoveShowElements = setTimeout(() => {
                this.showElementsInFSM = false;
            }, 3000);
        }
    }
}

export default NxSystemViewCameraPageComponent;
