import {
    Component,
    OnInit,
    OnDestroy,
    ElementRef,
    HostListener,
    Renderer2,
    HostBinding,
    Inject,
} from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject, Subscription, timer } from 'rxjs';
import { distinctUntilChanged, filter, take, takeUntil } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { NxRibbonService } from '@components/ribbon/ribbon.service';
import { environment } from '@environments/environment';
import { NxSettingsService } from '@pages/systems/settings/settings.service';
import { NxAccountService } from '@services/account.service';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxPageService } from '@services/page.service';
import type { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';
import { NxSystemsService } from '@services/systems.service';
import { NxSystemInfo } from '@services/systems.service.types';
import { WINDOW } from '@services/window-provider';
import { cleanId } from '@utils/general';
import { setServerIpAndPort } from '@utils/nx';
import { TimelineService } from '@vms-client/submodules/timeline/services/timeline.service';
import { Camera } from '@vms-client/submodules/vms/datatypes/Camera';
import {
    CAMERA_STATUS,
    SimpleTimeRange,
} from '@vms-client/submodules/vms/datatypes/ICamera';
import { MediaServer } from '@vms-client/submodules/vms/datatypes/MediaServer';
import {
    VmsState,
    VMS_MODE,
} from '@vms-client/submodules/vms/datatypes/VmsState';
import { VideoManagementSystemService } from '@vms-client/submodules/vms/services/vms.service';
import type { ms } from '@vms-client/utils/type-aliases';

import { WebClientUxService } from '../../services/webclient-ux.service';
import type { WebClientUxState } from '../../view.types';
import { fullscreenInactivityCfg } from '../fullscreenInactivity.cfg';
import { sidebarLayout } from '../sidebarLayout.cfg';

const MAX_OUT_OF_SYNC_TIME = 60000; // ms

@UntilDestroy()
@Component({
    selector: 'nx-system-view-index-page',
    templateUrl: 'system-view-index.page.component.html',
    styleUrls: ['system-view-index.page.component.scss'],
})
export class NxSystemViewIndexPageComponent implements OnInit, OnDestroy {
    @HostBinding('class.new-header') newHeader: boolean;
    private systemsSubscription: Subscription;

    private _state: VmsState;

    public systemId: string;
    public system: NxSystem;
    public systems: NxSystemInfo[];

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

    private _windowWidth = 1024; // should be larger than the threshold

    @HostListener('window:resize', ['$event'])
    public onResize(event): void {
        const widthThreshold =
            sidebarLayout.sidebarOverlaysWhenWindowWidthBelowPx;
        const newWidth = event.target.innerWidth;
        if (newWidth <= widthThreshold && this._windowWidth > widthThreshold) {
            this._handleMovingFromWideInterfaceToNarrow();
        }
        if (newWidth > widthThreshold && this._windowWidth <= widthThreshold) {
            this._handleMovingFromNarrowInterfaceToWide();
        }
        this._windowWidth = newWidth;
    }

    private _handleMovingFromWideInterfaceToNarrow(): void {
        this.ux.isSidebarShown = false;
    }

    private _handleMovingFromNarrowInterfaceToWide(): void {
        this.ux.isSidebarShown = true;
    }

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        pageService: NxPageService,
        private self: ElementRef,
        private renderer: Renderer2,
        private router: Router,
        private route: ActivatedRoute,
        private accountService: NxAccountService,
        private systemService: NxSystemService,
        private systemsService: NxSystemsService,
        private vms: VideoManagementSystemService,
        private timeline: TimelineService,
        private ux: WebClientUxService,
        private deviceService: DeviceDetectorService,
        private ribbonService: NxRibbonService,
        private settingsService: NxSettingsService,
        @Inject(WINDOW) private window: Window,
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;

        this.fullscreenMode = false;
        this.showElementsInFSM = true;
        this.newHeader = this.CONFIG.featureFlags.newHeader;
        pageService.pageTitle = this.LANG.pageTitles.view;
    }

    private setSystemSubscription(): void {
        this.systemsSubscription?.unsubscribe();
        this.systemsSubscription = this.systemsService.systemsSubject
            .pipe(distinctUntilChanged(), untilDestroyed(this))
            .subscribe(systems => {
                if (systems.length) {
                    this.systems = systems;
                }
                setTimeout(() => {
                    if (!this.system) {
                        this._initSystem();
                    }
                });
            });
    }

    public ngOnInit(): void {
        this.vms.reset();

        this.vms.subject.pipe(untilDestroyed(this)).subscribe((s: VmsState) => {
            this._onVmsSubjectChange(s);
        });

        this.route.params.pipe(untilDestroyed(this)).subscribe(s => {
            this._onRouteChange(s);
        });

        this.ux.subject
            .pipe(untilDestroyed(this))
            .subscribe((s: WebClientUxState) => {
                this._onUxStateChange(s);
            });

        this.onResize({ target: { innerWidth: this.window.innerWidth } });

        // Handles the case where you are on the view tab and get redirected back to /view
        this.router.events
            .pipe(
                filter(
                    e =>
                        e instanceof NavigationEnd &&
                        !this.route.snapshot.children.length,
                ),
                untilDestroyed(this)
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

    private unListenMouseMove: () => void;
    private unListenTouch: () => void;
    private unListenTouchMove: () => void;

    private _onUxStateChange(s: WebClientUxState): void {
        if (s.isSidebarShown) {
            this.$self.classList.add('sidebarShown');
        } else {
            this.$self.classList.remove('sidebarShown');
        }

        this.isSidebarShown = s.isSidebarShown;
        setTimeout(() => this.timeline.requestCanvasGeometryUpdate(), 220);

        if (s.isFullScreen) {
            this.fullscreenMode = true;
            this.fullscreenToggle = true;
            this.onShowElements = setTimeout(() => {
                this.showElementsInFSM = false;
            }, fullscreenInactivityCfg.delayMs);

            this.unListenMouseMove = this.renderer.listen(
                this.$self,
                'mousemove',
                (event: MouseEvent) => {
                    this.onEvent(event);
                },
            );

            this.unListenTouch = this.renderer.listen(
                this.$self,
                'touch',
                (event: MouseEvent) => {
                    this.onEvent(event);
                },
            );

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

            this.fullscreenMode = false;
            this.showElementsInFSM = true;

            if (this.deviceService.isMobile() && this.fullscreenToggle) {
                this.ux.isSidebarShown = false;
            }
            this.fullscreenToggle = false;
        }
    }

    private onEvent(event: Event): void {
        if (this.fullscreenMode && !this.showElementsInFSM) {
            this.showElementsInFSM = true;
            clearTimeout(this.onMoveShowElements);
            this.onMoveShowElements = setTimeout(() => {
                this.showElementsInFSM = false;
            }, fullscreenInactivityCfg.delayMs);
        }
    }

    private _onVmsSubjectChange(s: VmsState): void {
        this._state = s;
    }

    private _setInitializationState(initialized, initializedWithError): void {
        this.initialized = initialized;
        this.$self.classList[initialized ? 'add' : 'remove']('initialized');
        this.initializedWithError = initializedWithError;
        this.$self.classList[initializedWithError ? 'add' : 'remove'](
            'initialization-error',
        );
        if (!initializedWithError) {
            this.ribbonService.hide();
        }
    }

    private _onRouteChange(params): void {
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

    private _initSystem() {
        this.vms.reset();

        const createSystem = () => {
            return this.accountService.get().then(account => {
                if (!account) {
                    return Promise.reject();
                }

                if (environment.isLocal) {
                    this.system = this.systemService.createLocalSystem(
                        this.accountService.mediaServerApi,
                        account.id,
                        account.email,
                    );
                    this.settingsService.system = this.system;
                    return Promise.resolve();
                }

                // _initSystem is called on systems subscription
                const systemInfoFromCDB: NxSystemInfo =
                    this.systems.find(s => s.id === this.systemId);
                if (systemInfoFromCDB) {
                    this.system = this.systemService.createSystem(
                        account.email,
                        this.systemId,
                        undefined,
                        false,
                    );
                    this.settingsService.system = this.system;
                    if (
                        systemInfoFromCDB.stateOfHealth !==
                        this.CONFIG.system.status.online
                    ) {
                        this._setInitializationState(true, true);
                    } else {
                        this.ribbonService.hide();
                    }
                    return Promise.resolve(); // this.system.update();
                }

                return Promise.reject();
            });
        };

        let processingMediaServers = false;
        let cachedMediaServers = [];
        const firstLoad = new Subject();

        firstLoad.pipe(take(1)).subscribe(() => {
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
                    const matchServer = cachedMediaServers.find(
                        _server => _server.id === server.id,
                    );
                    if (!matchServer || server.status !== matchServer.status) {
                        return true;
                    } else {
                        if (
                            server.cameras.length !== matchServer.cameras.length
                        ) {
                            return true;
                        } else {
                            return server.cameras.some(camera => {
                                const matchCamera = matchServer.cameras.find(
                                    _camera => _camera.id === camera.id,
                                );

                                return (
                                    !matchCamera ||
                                    camera.name !==
                                    matchCamera.name
                                        .replace(/&lt;/g, '<')
                                        .replace(/&gt;/g, '>') ||
                                    (camera.status !== matchCamera.status &&
                                        !(
                                            camera.status === 'Online' &&
                                            matchCamera.status === 'Live'
                                        )) || // remapped param "status"
                                    camera.scheduleEnabled !==
                                    matchCamera.isScheduleEnabled // remapped param "scheduleEnabled"
                                );
                            });
                        }
                    }
                });
            }
        };

        createSystem()
            .then(() => {
                timer(0, VideoManagementSystemService.statusRefreshInterval)
                    .pipe(takeUntil(this.cancelPoll$))
                    .subscribe(async () => {
                        if (
                            !this.system ||
                            !this.system.isOnline ||
                            processingMediaServers
                        ) {
                            return;
                        }

                        let mediaServers = this.system.mediaservers;
                        if (mediaServers === null) {
                            mediaServers =
                                await this.system.getMediaServersAndCameras(
                                    true,
                                );
                        }
                        // mediaServers length is 0 when getMediaServersAndCameras fails. No system can ever have 0 servers.
                        if (
                            (this.initialized &&
                                !mediaServerChanged(mediaServers)) ||
                            mediaServers.length === 0
                        ) {
                            return;
                        }

                        processingMediaServers = true;
                        const serverTimeInfos =
                            await this.system.getServerTimes();
                        this.vms.serverTimes = serverTimeInfos;
                        serverTimeInfos.forEach(sti => {
                            const mediaServer = mediaServers?.find(
                                ms => ms.id === sti.serverId,
                            );
                            if (mediaServer) {
                                mediaServer.timeInfo = sti;

                                const serverAndLocalTimeDiff = Math.abs(new Date().getTime() - sti.vmsTime);
                                // fixes issue https://www.youtube.com/watch?v=sRqGfIbdJyI
                                const timeDiff = serverAndLocalTimeDiff > MAX_OUT_OF_SYNC_TIME;
                                this.system.isSomewhereInTime(timeDiff);
                            }
                        });

                        if (this.initializedWithError) {
                            this._setInitializationState(true, false);
                        }

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
                                    : ((c.status === 'Online'
                                        ? 'Live'
                                        : c.status) as CAMERA_STATUS),
                                c.scheduleEnabled,
                                c.disableDualStreaming,
                                archiveRanges[c.id] ||
                                new SimpleTimeRange(0, 0),
                                [],
                                c.status !== 'Offline'
                                    ? this.system?.mediaserver.previewUrl(
                                        c.id,
                                        0,
                                        128,
                                        128,
                                    )
                                    : '',
                                (transport: string, quality: string, t?: ms) =>
                                    this.system?.getPlaybackUrl(
                                        c.id,
                                        transport,
                                        quality,
                                        t,
                                    ),
                                (t?: ms, width = 128, height = 128) =>
                                    this.system?.mediaserver.previewUrl(
                                        c.id,
                                        t,
                                        width,
                                        height,
                                    ),
                            );
                            result.parseAdditionalParams(c.addParams);
                            return result;
                        };

                        const findCamerasWithArchive = () => {
                            return this.system
                                .getCameraHistoryItems()
                                .toPromise()
                                .then(result => {
                                    if (!result?.length) {
                                        return;
                                    }
                                    mediaServers.forEach(mediaServer => {
                                        const rec = result.find(
                                            rec =>
                                                rec.serverGuid ===
                                                `{${mediaServer.id}}`,
                                        );
                                        rec?.archivedCameras.forEach(
                                            cameraId => {
                                                // trick camera 'hasArchive' - here we don't need a real info -- TT
                                                archiveRanges[
                                                    cleanId(cameraId)
                                                ] = new SimpleTimeRange(1, 2);
                                            },
                                        );
                                    });
                                });
                        };

                        await findCamerasWithArchive();

                        cachedMediaServers = mediaServers.map(ms =>
                            setServerIpAndPort({
                                id: ms.id,
                                name: ms.name,
                                networkAddresses: ms.networkAddresses,
                                status: ms.status,
                                cameras: ms.cameras.map((c: any) =>
                                    processCameras(c, ms),
                                ),
                            } as any),
                        );

                        this.vms.setMediaServers(
                            this.systemId,
                            cachedMediaServers,
                        );
                        processingMediaServers = false;

                        firstLoad.next(true);
                    });
            })
            .catch(e => {
                processingMediaServers = false;
                setTimeout(() => this._setInitializationState(true, true));
            });
    }

    private _tryToRedirectToCamera(): void {
        const cid = this.vms.getLastAccessedCameraId();
        if (cid) {
            this.router.navigate([cid], {
                relativeTo: this.route,
                replaceUrl: true,
            });
        }
    }
}
