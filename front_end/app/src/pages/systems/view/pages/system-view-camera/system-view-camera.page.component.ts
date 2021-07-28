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
import { BehaviorSubject, Subject, Subscription, timer } from 'rxjs';
import VmsState, { VMS_MODE }                     from '../../vms-client/submodules/vms/datatypes/VmsState';
import FpsMeterService                            from '@services/fps-meter.service';
import WebClientUxService, { WebclientUxState }   from '../../services/webclient-ux.service';
import { NxConfigService, IConfig }               from '../../../../../services/nx-config';
import { CameraQualityStorageService }            from '../../services/cameraQualityStorage.service';
import { CameraTransportStorageService } from '../../services/cameraTransportStorage.service';
import sidebarLayout                     from '../sidebarLayout.cfg';
import { NxUtilsService }                from '@services/utils.service';
import fullscreen                        from './fullscreen';
import { LoggerDecorator }               from '../../vms-client/utils';
import PlaybackState, { PLAYBACK_MODE }  from '../../vms-client/submodules/playback/datatypes/PlaybackState';
import { filter, takeUntil }             from 'rxjs/operators';
import { UntilDestroy }                  from '@ngneat/until-destroy';
import { NxLanguageProviderService }     from '../../../../../services/nx-language-provider';
import { LanguageI18NStaticTypes }       from '../../../../../../language_i18n_static_types';
import Hls                               from 'hls.js';
import { NxDialogsService }              from '../../../../../dialogs/dialogs.service';

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
    private readonly isChrome: boolean;
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
    public qualities$ = new BehaviorSubject<any>({});
    public visibleQualities$ = new BehaviorSubject<PlaybackQuality[]>([]);
    public selectedTransport$ = new BehaviorSubject<PlaybackTransport>(undefined)
    public selectedQuality$ = new BehaviorSubject<PlaybackQuality>(undefined)

    public drawQualityDivider$ = new BehaviorSubject<string>('');

    public controlsShown: boolean = false
    public canViewArchives = false;
    public showPlayerSection = false;
    public cameraError: string;
    private status = false;
    private cameraCurrentState: PlaybackState;
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
        private dialogs: NxDialogsService,
        @Inject(DOCUMENT) private document: any
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;

        this.fullscreenMode = false;
        this.showElementsInFSM = true;
        this.isMobile = utilsService.isMobile() || utilsService.isTablet();
        this.isChrome = utilsService.isChrome();
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
                this.$self.classList.remove('is-full-screen');
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
                    ogg   : 'video/ogg',
                    mp4   : 'video/mp4',
                    mjpeg : 'video/webm',
                    webm  : 'video/webm',
                    hls   : 'application/x-mpegURL',
                    rtsp  : 'video/webm'
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
        });

        this.qualities$.subscribe((qualities) => {
            if (!qualities[this.selectedQuality]) {
                this.selectedQuality = undefined;
            } else {
                this.selectedQuality$.next(this.selectedQuality);
            }
        });
        this.accountService.get().then(async(account) => {
            if (!account) {
                this._warn('accountService returned no account');
                return Promise.reject();
            }
            if (this.CONFIG.isLocal) {
                this.system = this.systemService.createLocalSystem(this.accountService.mediaServerApi, account.id, account.email);
                this._log('local system created', this.system);
            } else {
                this.system = await this.systemService.createSystem(account.email, this.vms.systemId);
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

    private get qualities() {
        return this.qualities$.getValue();
    }

    private set qualities (qualities) {
        qualities = qualities || {};
        const qualityKeys = Object.keys(qualities);
        this.visibleQualities$.next(qualityKeys.map((quality) => this.qualityToVerbose(quality)) || []);
        const lowIndex = qualityKeys.includes('low');
        const highIndex = qualityKeys.includes('high');

        let divider = '';
        // If high and low with other options draw the divider after low.
        if (lowIndex && highIndex && qualityKeys.length > 2) {
            divider = 'low';
        // If high or low with at least 2 option draw for high or low depending on which exists.
        } else if (lowIndex !== highIndex && qualityKeys.length > 1) {
            divider = lowIndex ? 'low' : 'high';
        }
        this.drawQualityDivider$.next(divider);
        this.qualities$.next(qualities);
    }

    get selectedQuality (): PlaybackQuality {
        return this.selectedQuality$.getValue();
    }

    set selectedQuality (initialQuality: PlaybackQuality) {
        let quality = (initialQuality || '').toLowerCase();
        if (quality === '') {
            if (this.selectedTransport === 'hls') {
                quality = 'high';
            } else {
                const qualities = this.visibleQualities$.getValue();
                if (this.qualities.low) {
                    quality = 'low';
                } else if (this.qualities.high) {
                    quality = 'high';
                } else if (qualities.length) {
                    quality = qualities[qualities.length - 1];
                }
            }
        }

        this._log('setQuality', quality);
        this.cameraQualityStorage.set(this.id, quality);
        this._log('quality change', quality);
        this.playback.changeQuality(this.qualityFromVerbose(this.qualities[quality]));
        this.selectedQuality$.next(quality);
    }

    public qualityToVerbose (q: PlaybackQuality) {
        switch (q) {
            case 'hi':
            case 'high':
                return 'High';
            case 'lo':
            case 'low':
                return 'Low';
            default:
                return q;
        }
    }

    public qualityFromVerbose (q: PlaybackQuality) {
        q = q?.toLowerCase();
        switch (q) {
            case 'high':
                return 'hi';
            case 'low':
                return 'lo';
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
        this.unsub$.next('done');
        this.getRecordsInProgress = this.id;
        this.previewUrl = `url(${this.system.getPreviewUrl(this.id, null)})`;
        if (!this.system?.userManager.permissions.viewArchives) {
            this.getRecordsInProgress = undefined;
            this._initSelectedCamera();
            this.playback.restore(false);
        } else {
            this.system.getCameraRecords(this.id, 0, now, 1).then(async(ar) => {
                const records = this._extractPeriodsFromServerResponse(ar)
                this._log('got camera archive range', this.id, ar);
                if (!ar.error || ar.error !== '0' || !records.length) {
                    this._log('empty archive', ar);
                    this.playback.restore(false);
                } else {
                    try {
                        const firstRecordStartTimeMs = parseInt(records[0].startTimeMs);
                        const lastRecordStartTimeMs = parseInt(records[records.length - 1].startTimeMs);
                        const lastRecordDuration = parseInt(records[records.length - 1].durationMs);
                        const showToLive = this.camera.isLive || this.camera.isScheduleEnabled || this.camera.hasArchive;
                        const now = Date.now();
                        const range = new SimpleTimeRange(firstRecordStartTimeMs, showToLive ? now : (lastRecordStartTimeMs + lastRecordDuration));
                        const archive = records.map(r => new SimpleTimeRange(parseInt(r.startTimeMs), parseInt(r.startTimeMs) + parseInt(r.durationMs)));
                        if (lastRecordDuration === -1) {
                            archive[archive.length - 1] = new SimpleTimeRange(lastRecordStartTimeMs, now);
                            this._log('still recording', archive[archive.length - 1], archive[archive.length - 1].duration);
                        }
                        this._log('non-empty archive', ar, this.id, range, archive);
                        this.vms.setCameraRecords(this.id, range, archive);
                        this.playback.restore(true);
                    } catch (e) {
                        this._warn(e, 'caught while requesting camera archive ranges');
                    }
                }
            }).then(() => {
                this._initSelectedCamera();
                this._log('polling started')
                this.startPollingForNewlyRecordedChunks();
                this.getRecordsInProgress = undefined;
            });
        }

        this.system.userManager.getUsersDataFromTheSystem().then(_ => {
            this.canViewArchives = this.system.userManager.permissions.viewArchives;
        });
    }

    protected _newlyRecordedIntervalHandle

    public startPollingForNewlyRecordedChunks () {
        timer(0, 10 * 1000).pipe(takeUntil(this.unsub$)).subscribe(() => {
            const since = this.vms.selectedCamera.archiveRange.end;
            const now = Date.now();
            const cameraId = this.id;
            this._log('requesting new records', since, now, cameraId, now - since)
            this.system.getCameraRecords(this.id, since, now, 1).then(async (ar) => {
                const records = this._extractPeriodsFromServerResponse(ar)
                if (!ar.error || ar.error !== '0' || !records.length) {
                    this._log('no newly recorded', ar);
                } else {
                    this._log('newly recorded', ar, records);
                    const prepared = records.map(r => {
                        // the server has a weird habit of sending strings instead of numbers every now and then
                        const start = Math.max(parseInt(r.startTimeMs), since);
                        const duration = parseInt(r.durationMs);
                        const tr = new SimpleTimeRange(
                            start,
                            r.durationMs < 0
                                ? now
                                : start + duration
                        );
                        this._log('record candidate', r, start, duration, tr)
                        return tr
                    }).filter(tr => tr.duration > 0);
                    if (prepared.length > 0) {
                        this._log('adding records', prepared)
                        this.vms.addRecordsToSelectedCamera(cameraId, prepared);
                    } else {
                        this._log('no records to add', prepared)
                    }
                }
            }, () => {
                this._log('failed to fetch camera records');
            });
        });
    }

    protected _extractPeriodsFromServerResponse (response) {
        return response.reply[0]?.periods || []
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
    }

    protected _onRouteChange (params) {
        this._log('ROUTE CHANGE: NEW CAMERA', this.id, '->', params.cameraId);
        this.id = params.cameraId;
        this.playback.save();
        this.vms.clearCameraSelection();
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
                if (this.camera?.id !== s.selectedCamera.id) {
                    this.camera = s.selectedCamera;
                    this._updateAvailableTransportsAndResolutions();
                } else {
                    this.camera.name = s.selectedCamera.name;
                    this.camera.status = s.selectedCamera.status;
                    this.camera.isScheduleEnabled = s.selectedCamera.isScheduleEnabled;
                }
        }
    }

    public _onAnimationFrame (): void {
        if (this.camera?.isLive) {
            this.timelineExtendToNow.extendToNow();
        }

        setTimeout(() => {
            this._animationFrameRequestHandler = requestAnimationFrame(() => this._onAnimationFrame());
        }, this.timeline.renderFps);
    }

    public get showTimeline (): boolean {
        return this.camera && this.camera.hasArchive && this.canViewArchives;
    }

    public get enableControls (): boolean {
        return this.camera && ((this.camera.isOnline && !this.camera.isUnauthorized) || (this.camera.hasArchive && this.canViewArchives));
    }

    showPlayer () {
        this.status = this.cameraError === '' && (this.camera?.isAuthorized && this.camera?.isOnline && (this.cameraCurrentState.mode === PLAYBACK_MODE.STOPPED || this.cameraCurrentState.mode === PLAYBACK_MODE.LIVE) ||
            this.camera?.hasArchive && this.cameraCurrentState.mode === PLAYBACK_MODE.ARCHIVE);

        return this.status;
    }

    protected _initSelectedCamera () {
        this._log('_initSelectedCamera');
        this.resetTransport();
        this.resetQuality();

        this.unsub$.next('done');
        this.playback.subject.pipe(takeUntil(this.unsub$)).subscribe((state: PlaybackState) => {
            this.cameraCurrentState = state;
            this.cameraError = state.error;
            // Moved into a function to detect camera's state change Offline<->Online ..etc.
            // this.showPlayerSection = state.error === '' && (this.camera?.isAuthorized && this.camera?.isOnline && (state.mode === PLAYBACK_MODE.STOPPED || state.mode === PLAYBACK_MODE.LIVE) ||
            //     this.camera?.hasArchive && state.mode === PLAYBACK_MODE.ARCHIVE);
        });

        if (this.camera?.hasArchive) {
            this._log('timeline reset time', this.camera);
            this.timeline.reset(this.camera.archiveRange.start, this.camera.archiveRange.end);
        }

        if (this.playback.state.mode === PLAYBACK_MODE.LIVE) {
            this.playback.stop();
            setTimeout(() => this.playback.playLive());
        }
    }

    public toggleFullScreen ($event?) {
        this._log('toggleFullScreen');
        $event?.stopPropagation();

        if (fullscreen.getElement() == null) { // if browser is currently not in full screen
            fullscreen.request().call(this.$self.parentElement);
            setTimeout(() => {
                this.$self.classList.add('is-full-screen');
            }, 250);
        } else {
            fullscreen.exit().call(document);
            setTimeout(() => {
                this.$self.classList.remove('is-full-screen');
            }, 250);
        }
        // isFullScreen is updated by onFSC on document events
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
        this.selectedQuality = this.cameraQualityStorage.get(this.id) || '';
    }

    public resetTransport () {
        let transport;

        if (this.isChrome && this.isMobile) {
            transport = 'webm'; /// force mobile chrome to webm as it's more reliable
        } else {
            transport = this.cameraTransportStorage.get(this.id);
            if (!transport) {
                if (this.transports.includes('hls')) {
                    transport = 'hls';
                } else if (this.transports.includes('webm')) {
                    transport = 'webm';
                } else {
                    transport = this.transports[0];
                }
            }
        }

        if (!this.transports.includes(transport)) {
            transport = this.transports[0];
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
