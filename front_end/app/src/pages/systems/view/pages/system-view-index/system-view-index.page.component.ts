import {
    Component,
    OnInit,
    OnDestroy,
    ElementRef,
    HostListener,
} from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject, Subscription, timer } from 'rxjs';
import { distinctUntilChanged, filter, take, takeUntil } from 'rxjs/operators';

import { environment } from '@environments/environment';
import { NxAccountService } from '@services/account.service';
import type { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';
import { NxSystemsService } from '@services/systems.service';
import { cleanId } from '@utils/general';
import { setServerIpAndPort } from '@utils/nx';
import { TimelineService } from '@vms-client/submodules/timeline/services/timeline.service';
import { Camera } from '@vms-client/submodules/vms/datatypes/Camera';
import { CAMERA_STATUS, SimpleTimeRange } from '@vms-client/submodules/vms/datatypes/ICamera';
import { MediaServer } from '@vms-client/submodules/vms/datatypes/MediaServer';
import { VmsState, VMS_MODE } from '@vms-client/submodules/vms/datatypes/VmsState';
import { VideoManagementSystemService } from '@vms-client/submodules/vms/services/vms.service';
import { LoggerDecorator } from '@vms-client/utils';
import type { ms } from '@vms-client/utils/type-aliases';

import { LanguageI18NStaticTypes } from '../../../../../../language_i18n_static_types';
import { NxRibbonService } from '../../../../../components/ribbon/ribbon.service';
import { IConfig } from '../../../../../services/nx-config/config-types';
import { NxConfigService } from '../../../../../services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '../../../../../services/nx-language-provider';
import { NxSettingsService } from '../../../settings/settings.service';
import { WebClientUxService } from '../../services/webclient-ux.service';
import type { WebClientUxState } from '../../view.types';
import { fullscreenInactivityCfg } from '../fullscreenInactivity.cfg';
import { sidebarLayout } from '../sidebarLayout.cfg';

@UntilDestroy()
@Component({
    selector: 'nx-system-view-index-page',
    templateUrl: 'system-view-index.page.component.html',
    styleUrls: ['system-view-index.page.component.scss']
})
@LoggerDecorator('SYSTEM VIEW INDEX PAGE ::', true)
export class NxSystemViewIndexPageComponent implements OnInit, OnDestroy {
    _log: Function;
    _warn: Function;
    private systemsSubscription: Subscription;

    protected _state: VmsState;
    protected _vmsStateSubscription: Subscription;
    protected _routerParamsSubscription: Subscription;
    protected _uxStateSubscription: Subscription;

    public systemId: string;
    public system: NxSystem;
    public systems: NxSystem[];

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    fullscreenMode: boolean;
    fullscreenToggle: boolean;
    showElementsInFSM: boolean;
    onShowElements: any;
    onMoveShowElements: any;

    public initialized: boolean = false;
    public initializedWithError: boolean = false;
    public isSidebarShown: boolean = false;

    public hasCameras: boolean = true;
    private cancelPoll$ = new Subject<string>();

    // public animated: boolean = false

    public handleSidebarTogglingEarClick(): void {
        this.ux.isSidebarShown = !this.ux.state.isSidebarShown;
    }

    public get $self(): HTMLElement {
        return this.self.nativeElement as HTMLElement;
    }

    public get mediaServers(): Array<MediaServer> {
        return this._state && this._state.mode !== VMS_MODE.NOT_INITIALIZED
            ? this._state.mediaServers
            : [];
    }

    @HostListener('mousemove', ['$event'])
    @HostListener('touch', ['$event'])
    @HostListener('touchmove', ['$event'])
    onEvent(event: Event): void {
        if (this.fullscreenMode && !this.showElementsInFSM) {
            this.showElementsInFSM = true;
            clearTimeout(this.onMoveShowElements);
            this.onMoveShowElements = setTimeout(() => {
                this.showElementsInFSM = false;
            }, fullscreenInactivityCfg.delayMs);
        }
    }

    protected _windowWidth = 1024; // should be larger than the threshold

    @HostListener('window:resize', ['$event'])
    public onResize(event): void {
        const widthThreshold = sidebarLayout.sidebarOverlaysWhenWindowWidthBelowPx;
        const newWidth = event.target.innerWidth;
        if (newWidth <= widthThreshold && this._windowWidth > widthThreshold) {
            this._handleMovingFromWideInterfaceToNarrow();
        }
        if (newWidth > widthThreshold && this._windowWidth <= widthThreshold) {
            this._handleMovingFromNarrowInterfaceToWide();
        }
        this._windowWidth = newWidth;
    }

    protected _handleMovingFromWideInterfaceToNarrow(): void {
        this.ux.isSidebarShown = false;
    }

    protected _handleMovingFromNarrowInterfaceToWide(): void {
        this.ux.isSidebarShown = true;
    }

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private self: ElementRef,
        protected router: Router,
        protected route: ActivatedRoute,
        protected accountService: NxAccountService,
        protected systemService: NxSystemService,
        protected systemsService: NxSystemsService,
        protected vms: VideoManagementSystemService,
        protected timeline: TimelineService,
        protected ux: WebClientUxService,
        private deviceService: DeviceDetectorService,
        private ribbonService: NxRibbonService,
        private settingsService: NxSettingsService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
        this._onVmsSubjectChange = this._onVmsSubjectChange.bind(this);
        this._onRouteChange = this._onRouteChange.bind(this);
        this._onUxStateChange = this._onUxStateChange.bind(this);

        this.fullscreenMode = false;
        this.showElementsInFSM = true;
    }

    private setSystemSubscription(): void {
        this.systemsSubscription?.unsubscribe();
        this.systemsSubscription = this.systemsService.systemsSubject
            .pipe(
                untilDestroyed(this),
                distinctUntilChanged())
            .subscribe(systems => {
                if (systems.length) {
                    this.systems = systems;
                }
                setTimeout(() => {
                    if (!this.system) {
                        this._log('systemsService -> initSystem', [...systems]);
                        this._initSystem();
                    }
                });
            });
    }

    public ngOnInit(): void {
        this.vms.reset();
        this._vmsStateSubscription = this.vms.subject
            .pipe(untilDestroyed(this))
            .subscribe(this._onVmsSubjectChange);
        this._routerParamsSubscription = this.route.params
            .pipe(untilDestroyed(this))
            .subscribe(this._onRouteChange);
        this._uxStateSubscription = this.ux.subject
            .pipe(untilDestroyed(this))
            .subscribe(this._onUxStateChange);
        this.onResize({ target: { innerWidth: window.innerWidth } });

        // Handles the case where you are on the view tab and get redirected back to /view
        this.router.events
            .pipe(
                untilDestroyed(this),
                filter(e => e instanceof NavigationEnd && !this.route.snapshot.children.length)
            )
            .subscribe(() => {
                this._tryToRedirectToCamera();
            });

        this.accountService.get().then(account => {
            if (
                account &&
                !environment.isLocal &&
                !this.systemsService.isPolling
            ) {
                this.systemsService.getSystems(account.email);
            }
        });

        this.setSystemSubscription();
    }

    public ngOnDestroy(): void {
        this.cancelPoll$.next('cancel');
        this.ribbonService.hide();
    }

    protected _onUxStateChange(s: WebClientUxState): void {
        if (s.isSidebarShown) {
            this.$self.classList.add('sidebarShown');
        } else {
            this.$self.classList.remove('sidebarShown');
        }
        // this._log('ux state change sidebar visibility', s.isSidebarShown)
        this.isSidebarShown = s.isSidebarShown;
        setTimeout(() => this.timeline.requestCanvasGeometryUpdate(), 220);

        if (s.isFullScreen) {
            this.fullscreenMode = true;
            this.fullscreenToggle = true;
            this.onShowElements = setTimeout(() => {
                this.showElementsInFSM = false;
            }, fullscreenInactivityCfg.delayMs);
        } else {
            clearTimeout(this.onShowElements);
            clearTimeout(this.onMoveShowElements);
            this.fullscreenMode = false;
            this.showElementsInFSM = true;

            if (this.deviceService.isMobile() && this.fullscreenToggle) {
                this.ux.isSidebarShown = false;
            }
            this.fullscreenToggle = false;
        }
    }

    protected _onVmsSubjectChange(s: VmsState): void {
        this._state = s;
    }

    protected _setInitializationState(initialized, initializedWithError): void {
        // this._log('_setInitializationState', initialized, initializedWithError)
        this.initialized = initialized;
        this.$self.classList[initialized ? 'add' : 'remove']('initialized');
        this.initializedWithError = initializedWithError;
        this.$self.classList[
            initializedWithError ? 'add' : 'remove'
        ]('initialization-error');
    }

    protected _onRouteChange(params): void {
        // cancel pool for the previous system
        this.cancelPoll$.next('cancel');
        this.systemId = params.systemId || null;
        this.system = undefined;
        this.hasCameras = false;
        this._setInitializationState(false, false);
        this.vms.reset();

        // reset subscription to get values immediately and not waiting for next update
        this.setSystemSubscription();
    }

    protected _initSystem() {
        this._log('initSystem entered');
        this.vms.reset();

        const createSystem = () => {
            return this.accountService.get().then(account => {
                if (!account) {
                    this._warn('accountService returned no account');
                    return Promise.reject();
                }

                if (environment.isLocal) {
                    this.system = this.systemService.createLocalSystem(
                        this.accountService.mediaServerApi,
                        account.id,
                        account.email
                    );
                    this.settingsService.system = this.system;
                    this._log('local system created', this.system);
                    return Promise.resolve();
                }

                // _initSystem is called on systems subscription
                if (this.systems.filter(s => s.id === this.systemId).length) {
                    this._setInitializationState(false, false);
                    this.ribbonService.hide();

                    this.system = this.systemService.createSystem(account.email, this.systemId, undefined, false);
                    this.settingsService.system = this.system;
                    return this.system.update();
                }

                return Promise.reject();
            });
        };

        let processingMediaServers = false;
        let cachedMediaServers = [];
        const firstLoad = new Subject();

        firstLoad.pipe(take(1)).subscribe(() => {
            this._log(`system ${this.system.id} view initialized`, this.hasCameras);
            this._setInitializationState(true, !this.system.isOnline);
            if (!this.route.snapshot.children.length) {
                this._tryToRedirectToCamera();
            }

            setTimeout(() => this.timeline.requestCanvasGeometryUpdate(), 220);
        });

        const mediaServerChanged = mediaServers => {
            if (mediaServers.length !== cachedMediaServers.length) {
                return true;
            } else {
                return mediaServers.some(server => {
                    const matchServer = cachedMediaServers.find(_server =>
                        _server.id === server.id
                    );
                    if (!matchServer || server.status !== matchServer.status) {
                        return true;
                    } else {
                        if (server.cameras.length !== matchServer.cameras.length) {
                            return true;
                        } else {
                            return server.cameras.some(camera => {
                                const matchCamera = matchServer.cameras.find(
                                    _camera => _camera.id === camera.id
                                );

                                return (
                                    !matchCamera ||
                                    camera.name !== matchCamera.name
                                        .replace(/&lt;/g, '<')
                                        .replace(/&gt;/g, '>') ||
                                    (
                                        camera.status !== matchCamera.status &&
                                        !(camera.status === 'Online' && matchCamera.status === 'Live') // remapped param "status"
                                    ) || camera.scheduleEnabled !== matchCamera.isScheduleEnabled // remapped param "scheduleEnabled"
                                );
                            });
                        }
                    }
                });
            }
        };

        createSystem().then(() => {
            timer(0, VideoManagementSystemService.statusRefreshInterval)
                .pipe(takeUntil(this.cancelPoll$))
                .subscribe(async () => {
                    if (!this.system || processingMediaServers) {
                        return;
                    }

                    if (!this.system.isOnline) {
                        this._setInitializationState(true, true);
                        return;
                    } else if (this.initializedWithError) {
                        this._setInitializationState(true, false);
                    }

                    const mediaServers =
                        await this.system.getMediaServersAndCameras(true);
                    // mediaServers length is 0 when getMediaServersAndCameras fails. No system can ever have 0 servers.
                    if (
                        this.initialized && !mediaServerChanged(mediaServers) ||
                        mediaServers.length === 0
                    ) {
                        return;
                    }

                    processingMediaServers = true;
                    const serverTimeInfos = await this.system.getServerTimes();
                    this.vms.serverTimes = serverTimeInfos;
                    serverTimeInfos.forEach(sti => {
                        const mediaServer = mediaServers?.find(ms =>
                            ms.id === sti.serverId
                        );
                        if (mediaServer) {
                            mediaServer.timeInfo = sti;
                        }
                    });

                    // TODO: If no issues with this section being commented out remove it in 21.1
                    // no real info about archives is needed here -- TT
                    //
                    // const findCameraArchiveRanges = (cid) => {
                    //     // (check archive presence mode)
                    //     if (!this.system?.userManager.permissions.viewArchives) {
                    //         return Promise.resolve();
                    //     }
                    //     return this.system.getCameraRecords(cid, 0, now, now).then(response => {
                    //         const hasArchive = parseInt(response.error) ? false : (response.reply && response.reply.length);
                    //         // this._log('check archive presence', cid, result, response, '|', response.reply, '|', response.reply.length)
                    //         const extractChunk = chunks => {
                    //             let longestDuration = 0;
                    //             let earliestStart = Number.POSITIVE_INFINITY;
                    //             chunks.forEach((chunk) => {
                    //                 // 4.3 api response changed
                    //                 const start = parseInt(chunk?.periods.length ? chunk.periods[0].startTimeMs : chunk.startTimeMs);
                    //                 const duration = parseInt(chunk?.periods.length ? chunk.periods[0].durationMs : chunk.durationMs);
                    //                 if (start < earliestStart) {
                    //                     earliestStart = start;
                    //                 }
                    //                 if (longestDuration !== -1 && (duration === -1 || duration > longestDuration)) {
                    //                     longestDuration = duration;
                    //                 }
                    //             });
                    //             const end = (longestDuration === -1) ? now : (earliestStart + longestDuration);
                    //             return [earliestStart, end];
                    //         };
                    //         if (hasArchive) {
                    //             const [start, end] = extractChunk(response.reply);
                    //             archiveRanges[cid] = new SimpleTimeRange(start, end);
                    //         }
                    //     }, err => {
                    //         if (err.name === 'TimeoutError') {
                    //             archiveRanges[cid] = new SimpleTimeRange(0, 0);
                    //         } else {
                    //             this._log(err);
                    //         }
                    //     });
                    // };

                    const archiveRanges = {};
                    const processCameras = (c, ms) => {
                        this.hasCameras = true;
                        const result = new Camera(
                            c.id,
                            c.parentId,
                            c.preferredServerId,
                            c.name,
                            c.model,
                            c.url,
                            ms.status === 'Offline'
                                ? 'Offline'
                                : (
                                    c.status === 'Online'
                                        ? 'Live'
                                        : c.status
                                ) as CAMERA_STATUS,
                            c.scheduleEnabled,
                            c.disableDualStreaming,
                            archiveRanges[c.id] || new SimpleTimeRange(0, 0),
                            [],
                            c.status !== 'Offline'
                                ? this.system?.mediaserver.previewUrl(c.id, 0, 128, 128)
                                : '',
                            (transport: string, quality: string, t?: ms) =>
                                this.system?.getPlaybackUrl(
                                    c.id,
                                    transport,
                                    quality,
                                    t
                                ),
                            (t?: ms, width = 128, height = 128) =>
                                this.system?.mediaserver.previewUrl(
                                    c.id,
                                    t,
                                    width,
                                    height
                                )
                        );
                        result.parseAdditionalParams(c.addParams);
                        return result;
                    };

                    const findCamerasWithArchive = () => {
                        return this.system.getCameraHistoryItems().toPromise()
                            .then(result => {
                                if (!result?.length) {
                                    return;
                                }
                                mediaServers.forEach(mediaServer => {
                                    const rec = result.find(rec =>
                                        rec.serverGuid === `{${mediaServer.id}}`
                                    );
                                    rec?.archivedCameras.forEach(cameraId => {
                                        // trick camera 'hasArchive' - here we don't need a real info -- TT
                                        archiveRanges[cleanId(cameraId)] =
                                            new SimpleTimeRange(1, 2);
                                    });
                                });
                            });
                    };

                    await findCamerasWithArchive();

                    // TODO: If no issues with this section being commented out remove it in 21.1
                    // no real info about archives is needed here -- TT
                    //
                    // const cameraIds = mediaServers.reduce((acc, ms) => acc.concat(ms.cameras.map(c => c.id)), []);
                    // const archiveRanges = {};
                    // const now = Date.now();
                    // await Promise.all(cameraIds.map(findCameraArchiveRanges));

                    cachedMediaServers = mediaServers.map(
                        ms => setServerIpAndPort(({
                            id: ms.id,
                            name: ms.name,
                            networkAddresses: ms.networkAddresses,
                            status: ms.status,
                            cameras: ms.cameras.map((c: any) =>
                                processCameras(c, ms)
                            )
                        } as any))
                    );

                    this.vms.setMediaServers(this.systemId, cachedMediaServers);
                    processingMediaServers = false;

                    firstLoad.next();
                });
        }).catch(e => {
            this._warn(
                `system ${this.system?.id || this.systemId} view initialization failed`,
                e
            );
            processingMediaServers = false;
            setTimeout(() => this._setInitializationState(true, true));
        });
    }

    protected _tryToRedirectToCamera(): void {
        const cid = this.vms.getLastAccessedCameraId();
        if (cid) {
            this.router.navigate([cid], {
                relativeTo: this.route,
                replaceUrl: true
            });
        }
    }
}
