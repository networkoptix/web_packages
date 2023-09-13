import { DOCUMENT, Location } from '@angular/common';
import {
    AfterViewInit,
    Component,
    effect,
    ElementRef,
    HostListener,
    Inject,
    OnDestroy,
    OnInit,
    Renderer2,
} from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { DeviceDetectorService } from 'ngx-device-detector';
import { animationFrameScheduler, BehaviorSubject, interval, Subject, timer } from 'rxjs';
import { filter, takeUntil, throttleTime } from 'rxjs/operators';

import { environment } from '@environments/environment';
import staticLang from '@language_static';
import { pollingTimeout } from '@pages/static-variables-features';
import { FpsMeterService } from '@services/fps-meter.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import type { Ec2RecordedTimePeriodsResp } from '@services/system-api.types';
import { DeviceType } from '@services/system.service/camera-manager/camera-manager-types';
import type { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';
import { WINDOW } from '@services/window-provider';
import { icons } from '@static-variables';
import { PlaybackQuality, PlaybackTransport } from '@view/view.types';
import {
    PLAYBACK_MODE,
    PlaybackState,
} from '@vms-client/submodules/playback/datatypes/PlaybackState';
import { PlaybackService } from '@vms-client/submodules/playback/services/playback.service';
import { TimelineExtendToNowService } from '@vms-client/submodules/timeline/services/timeline.extend-to-now.service';
import { TimelineSelectionService } from '@vms-client/submodules/timeline/services/timeline.selection.service';
import { TimelineService } from '@vms-client/submodules/timeline/services/timeline.service';
import { SimpleTimeRange } from '@vms-client/submodules/vms/datatypes/ICamera';
import { VMS_MODE, VmsState } from '@vms-client/submodules/vms/datatypes/VmsState';
import { VideoManagementSystemService } from '@vms-client/submodules/vms/services/vms.service';

import { CameraQualityStorageService } from '../../services/cameraQualityStorage.service';
import { CameraTransportStorageService } from '../../services/cameraTransportStorage.service';
import { WebClientUxService } from '../../services/webclient-ux.service';
import type { WebClientUxState } from '../../view.types';
import { Resolutions, ViewCamera } from '../../vms-client/submodules/vms/datatypes/Camera';
import { fullscreenInactivityCfg } from '../fullscreenInactivity.cfg';
import { sidebarLayout } from '../sidebarLayout.cfg';

import { fullscreen } from './fullscreen';

type Period = Ec2RecordedTimePeriodsResp['reply'][number]['periods'][number];

const TIMESTAMP_UPDATE_THROTTLE_MS = 1000;

type AvailableTransportsAndResolutions = ViewCamera['availableTransportsAndResolutions'];

@UntilDestroy()
@Component({
    selector: 'nx-system-view-camera-page',
    templateUrl: 'system-view-camera.page.component.html',
    styleUrls: ['system-view-camera.page.component.scss'],
})
export class NxSystemViewCameraPageComponent implements OnInit, OnDestroy, AfterViewInit {
    private readonly isMobile: boolean;
    private readonly isChrome: boolean;
    public readonly isMobileSafari: boolean;
    public id: string;
    public camera: ViewCamera;
    public system: NxSystem;

    CONFIG: IConfig;
    LANG = staticLang;
    fullscreenMode: boolean;
    showElementsInFSM: boolean;
    onShowElements: number;
    onMoveShowElements: number;
    icons = icons;

    public settingsShown: boolean = false;

    public availableTransportsAndResolutions$ =
        new BehaviorSubject<AvailableTransportsAndResolutions>({});
    public transports$ = new BehaviorSubject<PlaybackTransport[]>([]);
    public qualities$ = new BehaviorSubject<Resolutions>({});
    public visibleQualities$ = new BehaviorSubject<PlaybackQuality[]>([]);
    public selectedTransport$ = new BehaviorSubject<PlaybackTransport>(undefined);
    public selectedQuality$ = new BehaviorSubject<PlaybackQuality>(undefined);

    public drawQualityDivider$ = new BehaviorSubject<string>('');

    public controlsShown: boolean = false;
    public canViewArchives = false;
    public showPlayerSection = true;
    public cameraError: string;
    // private cameraCurrentState: PlaybackState;
    private unsub$ = new Subject<string>();
    public isLocal: boolean = false;
    public cameraDetailsShown: boolean = false;
    public isNvr: boolean = false;

    constructor(
        configService: NxConfigService,
        deviceService: DeviceDetectorService,
        private renderer: Renderer2,
        private location: Location,
        private self: ElementRef,
        private route: ActivatedRoute,
        private vms: VideoManagementSystemService,
        private playback: PlaybackService,
        public timeline: TimelineService,
        private selection: TimelineSelectionService,
        public timelineExtendToNow: TimelineExtendToNowService,
        private fpsMeter: FpsMeterService,
        private cameraQualityStorage: CameraQualityStorageService,
        private cameraTransportStorage: CameraTransportStorageService,
        private systemService: NxSystemService,
        public ux: WebClientUxService,
        @Inject(DOCUMENT) private document: Document,
        @Inject(WINDOW) private window: Window & typeof globalThis,
    ) {
        this.CONFIG = configService.getConfig();

        this.fullscreenMode = false;
        this.showElementsInFSM = true;
        this.isMobile = deviceService.isMobile() || deviceService.isTablet();
        this.isChrome = deviceService.browser === 'Chrome';
        this.isMobileSafari = deviceService.browser === 'Safari' && deviceService.isMobile();

        this.archiveSelectionEnabled = configService.flagsEnabled('archiveSelection');

        this.isLocal = environment.isLocal;
        effect(() => {
            this._onVmsStateChange(this.vms.state());
        });
    }

    public ngOnInit(): void {
        this.initSubscriptions();
        this.initEvents();
        this.startAnimation();
        this._updateAvailableTransportsAndResolutions();

        this.$self.classList.add('animated');

        this.system = this.systemService.getCurrentSystem();
        this._getRecords();
    }

    public ngAfterViewInit(): void {
        this.$self.classList.add('controls-shown');

        // this.fpsMeter.install()
        // @ts-expect-error: Old debugging thing? Should probably remove
        this.document.fpsMeter = this.fpsMeter;
        // allows calling document.fpsMeter.install() from the developer console, if needed

        this.ux.isFullScreen = !!fullscreen.getElement();
    }

    public ngOnDestroy(): void {
        this.unsub$.next('done');

        this.unListenFullScreenChange();
        this.unListenWebkitFSChange();
        this.unListenMozFSChange();
    }

    private startAnimation(): void {
        interval(0, animationFrameScheduler)
            .pipe(untilDestroyed(this))
            .subscribe(() => {
                this._onAnimationFrame();
            });
    }

    private initSubscriptions(): void {
        this.playback._subject
            .pipe(throttleTime(TIMESTAMP_UPDATE_THROTTLE_MS), untilDestroyed(this))
            .subscribe(s => {
                this.onPlaybackChange(s);
            });

        this.route.params.pipe(untilDestroyed(this)).subscribe(params => {
            this._onRouteChange(params);
        });

        this.ux.subject.pipe(untilDestroyed(this)).subscribe(clientUxState => {
            this._onUxStateChange(clientUxState);
        });

        this.availableTransportsAndResolutions$
            .pipe(
                filter(TaR => TaR !== undefined),
                untilDestroyed(this),
            )
            .subscribe(transportsAndResolutions => {
                const videoTypes = {
                    ogg: 'video/ogg',
                    mp4: 'video/mp4',
                    mjpeg: 'video/webm',
                    webm: 'video/webm',
                    hls: 'application/x-mpegURL',
                    rtsp: 'video/webm',
                };
                const video = this.document.createElement('video');
                const isHlsSupported = this.isSupported();
                this.transports = <PlaybackTransport[]>(
                    Object.keys(transportsAndResolutions).filter(transport =>
                        transport === 'hls' && !this.isMobile
                            ? isHlsSupported
                            : video.canPlayType(videoTypes[transport] || transport) !== '',
                    )
                );
            });

        this.transports$.pipe(untilDestroyed(this)).subscribe(transports => {
            if (!transports.length) {
                this.selectedTransport = undefined;
                this.qualities = undefined;
            } else if (!transports.includes(this.selectedTransport)) {
                this.resetTransport();
            }
            this.qualities = this.availableTransportsAndResolutions[this.selectedTransport];
        });

        this.qualities$.pipe(untilDestroyed(this)).subscribe(qualities => {
            if (!qualities[this.selectedQuality]) {
                this.selectedQuality = undefined;
            } else {
                this.selectedQuality$.next(this.selectedQuality);
            }
        });
    }

    private initEvents(): void {
        this.unListenFullScreenChange = this.renderer.listen(
            'document',
            'fullscreenchange',
            (event: MouseEvent) => {
                this.onFullScreenChange(event);
            },
        );

        this.unListenWebkitFSChange = this.renderer.listen(
            'document',
            'webkitfullscreenchange',
            (event: MouseEvent) => {
                this.onFullScreenChange(event);
            },
        );

        this.unListenMozFSChange = this.renderer.listen(
            'document',
            'mozfullscreenchange',
            (event: MouseEvent) => {
                this.onFullScreenChange(event);
            },
        );
    }

    private getMediaSource(): typeof MediaSource | undefined {
        // https://developer.mozilla.org/en-US/docs/Web/API/MediaSource
        // @ts-expect-error: https://caniuse.com/mdn-api_mediasource
        return this.window.MediaSource || this.window.WebKitMediaSource;
    }

    private isSupported(): boolean {
        const mediaSource = this.getMediaSource();
        if (!mediaSource) {
            return false;
        }

        const isTypeSupported =
            mediaSource &&
            typeof mediaSource.isTypeSupported === 'function' &&
            mediaSource.isTypeSupported('video/mp4; codecs="avc1.42E01E,mp4a.40.2"');

        return !!isTypeSupported;
    }

    public toggleCameraDetails(newValue: boolean = !this.cameraDetailsShown): void {
        this.cameraDetailsShown = newValue;
    }

    public readonly archiveSelectionEnabled: boolean;

    private onPlaybackChange(s: PlaybackState): void {
        const uriPlaybackMode = this.getQueryParam('time');
        if (uriPlaybackMode === 'live' && s.mode === PLAYBACK_MODE.LIVE) {
            return; // don't constantly update for 'live'
        }

        let time = '';
        switch (s.mode) {
            case PLAYBACK_MODE.LIVE:
                time = 'live';
                break;
            case PLAYBACK_MODE.ARCHIVE:
                time = s.currentTime.toString();
                break;
            default:
                return;
        }
        this.location.replaceState(this.location.path().split('?')[0], `time=${time}`);
    }

    private unListenMouseMove: () => void;
    private unListenTouch: () => void;
    private unListenTouchMove: () => void;

    private onFullScreenChange = (e: MouseEvent): void => {
        const fse = fullscreen.getElement();
        this.fullscreenMode = !!fse;
        if (this.fullscreenMode) {
            this.onShowElements = this.window.setTimeout(() => {
                this.showElementsInFSM = false;
            }, fullscreenInactivityCfg.delayMs);

            this.unListenMouseMove = this.renderer.listen(
                this.$self,
                'mousemove',
                (event: MouseEvent) => {
                    this.onEvent(event);
                },
            );

            this.unListenTouch = this.renderer.listen(this.$self, 'touch', (event: MouseEvent) => {
                this.onEvent(event);
            });

            this.unListenTouchMove = this.renderer.listen(
                this.$self,
                'touchmove',
                (event: MouseEvent) => {
                    this.onEvent(event);
                },
            );
        } else {
            clearTimeout(this.onShowElements);
            clearTimeout(this.onMoveShowElements);

            this.unListenMouseMove?.();
            this.unListenTouch?.();
            this.unListenTouchMove?.();

            this.showElementsInFSM = true;
        }

        if (this.ux.state.isFullScreen !== !!fse) {
            this.ux.isFullScreen = !!fse;
            this.$self.classList.remove('is-full-screen');
        }
    };

    private onEvent(event: Event): void {
        if (this.fullscreenMode && !this.showElementsInFSM) {
            this.showElementsInFSM = true;
            clearTimeout(this.onMoveShowElements);
            this.onMoveShowElements = this.window.setTimeout(() => {
                this.showElementsInFSM = false;
            }, fullscreenInactivityCfg.delayMs);
        }
    }

    public handleControlsTogglingEarClick(): void {
        this.ux.isTimelineShown = !this.ux.state.isTimelineShown;
    }

    public get $self(): HTMLElement {
        return this.self.nativeElement as HTMLElement;
    }

    private unListenFullScreenChange: () => void;
    private unListenWebkitFSChange: () => void;
    private unListenMozFSChange: () => void;

    public get availableTransportsAndResolutions(): AvailableTransportsAndResolutions {
        return this.availableTransportsAndResolutions$.getValue();
    }

    public set availableTransportsAndResolutions(
        transportsAndResolutions: AvailableTransportsAndResolutions,
    ) {
        this.availableTransportsAndResolutions$.next(transportsAndResolutions);
    }

    private get transports(): PlaybackTransport[] {
        return this.transports$.getValue();
    }

    private set transports(transports: PlaybackTransport[]) {
        this.transports$.next(
            transports.filter(transport => ['hls', 'webm'].includes(transport)) || [],
        );
    }

    get selectedTransport(): PlaybackTransport {
        return this.selectedTransport$.getValue();
    }

    set selectedTransport(transport: PlaybackTransport) {
        if (transport && this.selectedTransport !== transport) {
            this.qualities = this.availableTransportsAndResolutions[transport];
            this.cameraTransportStorage.set(this.id, transport);
            this.playback.changeTransport(transport);
        }
        this.selectedTransport$.next(transport);
    }

    private get qualities(): Resolutions {
        return this.qualities$.getValue();
    }

    private set qualities(qualities: Resolutions) {
        qualities = qualities || {};
        const qualityKeys = Object.keys(qualities);
        this.visibleQualities$.next(
            qualityKeys.map(quality => this.qualityToVerbose(quality)) || [],
        );
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

    get selectedQuality(): PlaybackQuality {
        return this.selectedQuality$.getValue();
    }

    set selectedQuality(initialQuality: PlaybackQuality) {
        if (!this.selectedTransport) {
            return;
        }
        const storedQuality = this.cameraQualityStorage.get(this.id);
        let quality = (initialQuality || storedQuality || '').toLowerCase();
        const qualities = this.visibleQualities$.getValue();
        if (quality === '' || !qualities.includes(this.qualityToVerbose(quality))) {
            if (this.selectedTransport === 'hls') {
                quality = qualities.includes('Low') ? 'low' : qualities[0].toLowerCase();
            } else {
                if (this.qualities.low) {
                    quality = 'low';
                } else if (this.qualities.high) {
                    quality = 'high';
                } else if (qualities.length) {
                    quality = qualities[qualities.length - 1];
                }
            }
        }

        this.cameraQualityStorage.set(this.id, quality);
        this.playback.changeQuality(this.qualityFromVerbose(this.qualities[quality]));
        this.selectedQuality$.next(quality);
    }

    public currentQuality(quality: string): string {
        return quality
            ? this.LANG.common.resolution[quality] || quality
            : this.LANG.common.resolution.auto;
    }

    public qualityToVerbose(q: PlaybackQuality): string {
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

    public qualityFromVerbose(q: PlaybackQuality): string {
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

    public getRecordsInProgress: string; // cameraId

    private _updateAvailableTransportsAndResolutions(): void {
        this.availableTransportsAndResolutions = this.camera
            ? this.camera.availableTransportsAndResolutions
            : {};
    }

    private getQueryParam(q: string): string {
        // return (this.location.path().match(new RegExp('[?&]' + q + '=([^&]+)')) || [, null])[1];
        return new URLSearchParams(this.location.path().split('?')[1] || '').get(q);
    }

    private _restorePlayback(archiveAvailable: boolean = false): void {
        if (this.playback.state.mode === PLAYBACK_MODE.ARCHIVE) {
            this.playback.restore(archiveAvailable);
            return;
        }

        const time = this.getQueryParam('time');

        if (time) {
            if (time === 'live') {
                this.playback.playLive();
            } else {
                if (archiveAvailable) {
                    this.playback.playArchive(parseInt(time));
                } else {
                    this.playback.playLive();
                }
            }
        } else {
            this.playback.restore(archiveAvailable);
        }
    }

    private _getRecords(): void {
        const now = Date.now();
        if (this.getRecordsInProgress === this.id) {
            return;
        }
        this.unsub$.next('done');
        this.getRecordsInProgress = this.id;
        const camera = this.system.cameraManager.cameras?.find(({ id }) => id?.includes(this.id));
        this.isNvr = camera?.deviceType === DeviceType.Nvr;
        this.system.userManager.getUsersDataFromTheSystem().then(_ => {
            this.canViewArchives = this.system.permissionManager.permissions().viewArchives;
            if (!this.vms.selectedCamera.hasArchive && !this.vms.selectedCamera.isScheduleEnabled) {
                this.getRecordsInProgress = undefined;
                this._initSelectedCamera();
                this._restorePlayback();
            } else {
                const archivePromise = this.canViewArchives
                    ? this.system.mediaserver.getRecords(this.id, 0, now, 1).toPromise()
                    : Promise.reject();
                archivePromise
                    .then(async ar => {
                        const records = this._extractPeriodsFromServerResponse(ar);
                        if (!ar.error || ar.error !== '0' || !records.length) {
                            this._restorePlayback();
                            // @ts-expect-error FIXME: Probably 0 being used as falsy value instead of null
                            this.vms.setCameraRecords(this.id, 0, []);
                        } else {
                            try {
                                const firstRecordStartTimeMs = parseInt(records[0].startTimeMs);
                                const lastRecordStartTimeMs = parseInt(
                                    records[records.length - 1].startTimeMs,
                                );
                                const lastRecordDuration = parseInt(
                                    records[records.length - 1].durationMs,
                                );
                                const showToLive =
                                    !this.camera.isVirtual &&
                                    (this.camera.isLive ||
                                        this.camera.isScheduleEnabled ||
                                        this.camera.hasArchive);
                                const now = Date.now();
                                const range = new SimpleTimeRange(
                                    firstRecordStartTimeMs,
                                    showToLive ? now : lastRecordStartTimeMs + lastRecordDuration,
                                );
                                const archive = records.map(
                                    r =>
                                        new SimpleTimeRange(
                                            parseInt(r.startTimeMs),
                                            parseInt(r.startTimeMs) + parseInt(r.durationMs),
                                        ),
                                );
                                if (lastRecordDuration === -1) {
                                    archive[archive.length - 1] = new SimpleTimeRange(
                                        lastRecordStartTimeMs,
                                        now,
                                    );
                                }

                                this.vms.setCameraRecords(this.id, range, archive);
                                this._restorePlayback(true);
                            } catch (e) {
                                console.warn(e, 'caught while requesting camera archive ranges');
                            }
                        }
                    })
                    .then(() => {
                        this._initSelectedCamera();
                        this.startPollingForNewlyRecordedChunks();
                        this.getRecordsInProgress = undefined;
                    })
                    .catch(() => {
                        // Handles the case where the request for the archive times out.
                        this.playback.restore(false);
                        setTimeout(() => {
                            this.getRecordsInProgress = undefined;
                            this._getRecords();
                        }, pollingTimeout);
                    });
            }
        });
    }

    public startPollingForNewlyRecordedChunks(): void {
        timer(0, 10 * 1000)
            .pipe(takeUntil(this.unsub$))
            .subscribe(() => {
                const since = this.vms.selectedCamera.archiveRange.end;
                const now = Date.now();
                const cameraId = this.id;
                this.system.mediaserver.getRecords(this.id, since, now, 1).subscribe(async ar => {
                    const records = this._extractPeriodsFromServerResponse(ar);
                    if ((!ar.error || ar.error === '0') && records.length) {
                        const prepared = records
                            .map(r => {
                                // the server has a weird habit of sending strings instead of numbers every now and then
                                const start = Math.max(parseInt(r.startTimeMs), since);
                                const duration = parseInt(r.durationMs);
                                return new SimpleTimeRange(
                                    start,
                                    // @ts-expect-error FIXME: Value comparison with number string
                                    r.durationMs < 0 ? now : start + duration,
                                );
                            })
                            .filter(tr => tr.duration > 0);
                        if (prepared.length > 0) {
                            this.vms.addRecordsToSelectedCamera(cameraId, prepared);
                        }
                    }
                });
            });
    }

    private _extractPeriodsFromServerResponse(response: Ec2RecordedTimePeriodsResp): Period[] {
        if (!response?.reply.length) {
            return [];
        }
        const records: Period[] = [];
        response.reply.forEach(({ periods }) => {
            const chunks = periods.length;
            const batchSize = 10000; // Arbitrary size
            const batches = Math.ceil(chunks / batchSize);
            // Too many chunks. So it gets split up into manageable batches for copying.
            for (let i = 0; i < batches; ++i) {
                const start = i * batchSize;
                const end = start + batchSize - 1;
                records.push(...periods.slice(start, end));
            }
        });
        // @ts-expect-error FIXME: Value comparison with number strings
        return records.sort((a, b) => a.startTimeMs - b.startTimeMs);
    }

    private _onUxStateChange(s: WebClientUxState): void {
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

    private _onRouteChange(params: Params): void {
        this.id = params.cameraId;
        this.playback.save();
        this.vms.clearCameraSelection();
        this.vms.selectCamera(this.id);
        this.selection.reset();
        this.resetTransport();
        this.resetQuality();

        if (this.vms.selectedCamera && this.system) {
            this._getRecords();
        }

        if (this.window.innerWidth <= sidebarLayout.cameraClickHidesSidebarWhenWindowWidthBelowPx) {
            this.ux.isSidebarShown = false;
        }
    }

    private _onVmsStateChange(s: VmsState): void {
        switch (s.mode) {
            case VMS_MODE.NOT_INITIALIZED:
            case VMS_MODE.CAMERA_NOT_SELECTED:
                this.camera = undefined;
                break;
            case VMS_MODE.CAMERA_SELECTED:
                if (this.camera?.id !== s.selectedCamera.id) {
                    this.camera = s.selectedCamera;
                    this._updateAvailableTransportsAndResolutions();
                } else {
                    // handle specific status change
                    if (
                        this.camera.isUnauthorized &&
                        s.selectedCamera.isAuthorized &&
                        this.playback.state.mode !== PLAYBACK_MODE.ARCHIVE
                    ) {
                        // wait for VMS.selectedCamera to be updated
                        setTimeout(() => this.playback.playLive());
                    }
                    this.camera.name = s.selectedCamera.name;
                    this.camera.status = s.selectedCamera.status;
                    this.camera.isScheduleEnabled = s.selectedCamera.isScheduleEnabled;
                }
        }
    }

    public _onAnimationFrame(): void {
        if (this.camera?.isLive) {
            this.timelineExtendToNow.extendToNow();
        }
    }

    public get showTimeline(): boolean {
        return (
            this.camera &&
            this.camera.hasArchive &&
            this.canViewArchives &&
            this.getRecordsInProgress === undefined
        );
    }

    public get enableControls(): boolean {
        return (
            this.camera &&
            !this.cameraError &&
            ((this.camera.isOnline && !this.camera.isUnauthorized) ||
                (this.camera.hasArchive && this.canViewArchives))
        );
    }

    private _initSelectedCamera(): void {
        this.resetTransport();
        this.resetQuality();
        this.playback.setError('');

        this.unsub$.next('done');
        this.playback.subject.pipe(takeUntil(this.unsub$)).subscribe((state: PlaybackState) => {
            this.selectedTransport = state.transport;
            // this.cameraCurrentState = state;
            this.cameraError = state.error;

            if (state.error !== '' && this.playback.state.mode === PLAYBACK_MODE.LIVE) {
                this.playback.stop(state.error);
            }
            // Moved into a function to detect camera's state change Offline<->Online ..etc.
            this.showPlayerSection =
                state.error === '' &&
                ((this.camera?.isAuthorized &&
                    this.camera?.isOnline &&
                    !this.camera?.isVirtual &&
                    (state.mode === PLAYBACK_MODE.STOPPED || state.mode === PLAYBACK_MODE.LIVE)) ||
                    (this.camera?.hasArchive && state.mode === PLAYBACK_MODE.ARCHIVE));
        });

        if (this.camera?.hasArchive) {
            this.timeline.reset(this.camera.archiveRange.start, this.camera.archiveRange.end);
        }

        if (this.playback.state.mode === PLAYBACK_MODE.LIVE) {
            this.playback.stop();
            setTimeout(() => this.playback.playLive());
        } else if (this.camera.isVirtual && this.playback.state.mode === PLAYBACK_MODE.STOPPED) {
            this.playback.playArchive(this.camera.archiveRange.start);
        }
    }

    public toggleFullScreen($event?: MouseEvent): void {
        $event?.stopPropagation();

        if (!fullscreen.getElement()) {
            // if browser is currently not in full screen
            fullscreen.request().call(this.$self.parentElement);
            setTimeout(() => {
                this.$self.classList.add('is-full-screen');
            }, 250);
        } else {
            fullscreen.exit().call(this.document);
            setTimeout(() => {
                this.$self.classList.remove('is-full-screen');
            }, 250);
        }
        // isFullScreen is updated by onFullScreenChange on document events
    }

    public stopSettingsClickPropagation($event: MouseEvent): void {
        $event?.stopPropagation();
    }

    public toggleSettings($event?: MouseEvent): void {
        $event?.stopPropagation();
        this.settingsShown = !this.settingsShown;
    }

    public hideSettings(): void {
        this.settingsShown = false;
    }

    public showSettings(): void {
        this.settingsShown = true;
    }

    public resetQuality(): void {
        this.selectedQuality = this.cameraQualityStorage.get(this.id) || '';
    }

    public resetTransport(): void {
        let transport: PlaybackTransport;

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

    public onVideoDblClick(_: boolean): void {
        this.toggleFullScreen();
    }

    @HostListener('document:click', ['$event'])
    public clickOutside(): void {
        this.hideSettings();
    }
}
