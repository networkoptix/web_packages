import {
    Component,
    OnInit,
    OnDestroy,
    ElementRef,
    HostListener,
    Renderer2,
    HostBinding,
    Inject,
    effect,
} from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { CookieService } from 'ngx-cookie-service';
import { DeviceDetectorService } from 'ngx-device-detector';
import { of, Subject, timer } from 'rxjs';
import { filter, take, takeUntil } from 'rxjs/operators';

import { NxRibbonService } from '@components/ribbon/ribbon.service';
import { ToastType } from '@components/toast-container/toast.types';
import { environment } from '@environments/environment';
import staticLang from '@language_static';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import type { ec2CameraEx } from '@services/system-api.types';
import type { NxSystem } from '@services/system.service/system';
import type { NxViewMediaServer } from '@services/system.service/system-types';
import { NxSystemService } from '@services/system.service/system.service';
import { NxSystemsService } from '@services/systems.service';
import { NxSystemInfo } from '@services/systems.service.types';
import { NxToastService } from '@services/toast.service';
import { WINDOW } from '@services/window-provider';
import { icons } from '@static-variables';
import { cleanId } from '@utils/general';
import { TimelineService } from '@vms-client/submodules/timeline/services/timeline.service';
import { Camera } from '@vms-client/submodules/vms/datatypes/Camera';
import {
    CAMERA_STATUS,
    ICamera,
    SimpleTimeRange,
} from '@vms-client/submodules/vms/datatypes/ICamera';
import type { IMediaServer } from '@vms-client/submodules/vms/datatypes/IMediaServer';
import { MediaServer } from '@vms-client/submodules/vms/datatypes/MediaServer';
import { VmsState, VMS_MODE } from '@vms-client/submodules/vms/datatypes/VmsState';
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

    public systemId: string;
    public system: NxSystem;
    public systems: NxSystemInfo[];
    public selectedCameraId: string;
    public mediaservers: MediaServer[];

    CONFIG: IConfig;
    LANG = staticLang;
    fullscreenMode: boolean;
    fullscreenToggle: boolean;
    showElementsInFSM: boolean;
    onShowElements: any;
    onMoveShowElements: any;
    icons = icons;

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

    private _windowWidth = 1024; // should be larger than the threshold

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

    private _handleMovingFromWideInterfaceToNarrow(): void {
        this.ux.isSidebarShown = false;
    }

    private _handleMovingFromNarrowInterfaceToWide(): void {
        this.ux.isSidebarShown = true;
    }

    constructor(
        configService: NxConfigService,
        private self: ElementRef,
        private renderer: Renderer2,
        private router: Router,
        private route: ActivatedRoute,
        private cookieService: CookieService,
        private systemService: NxSystemService,
        private systemsService: NxSystemsService,
        private vms: VideoManagementSystemService,
        private timeline: TimelineService,
        private ux: WebClientUxService,
        private deviceService: DeviceDetectorService,
        private ribbonService: NxRibbonService,
        @Inject(WINDOW) private window: Window,
        private toastService: NxToastService,
    ) {
        this.CONFIG = configService.getConfig();

        this.fullscreenMode = false;
        this.showElementsInFSM = true;
        this.newHeader = this.CONFIG.featureFlags.newHeader;
        effect(() => {
            this._onVmsSubjectChange(this.vms.state());
        });
    }

    public ngOnInit(): void {
        this.vms.reset();

        this.route.params.pipe(untilDestroyed(this)).subscribe(s => {
            this._onRouteChange(s);
        });

        this.ux.subject.pipe(untilDestroyed(this)).subscribe((s: WebClientUxState) => {
            this._onUxStateChange(s);
        });

        this.onResize({ target: { innerWidth: this.window.innerWidth } });

        // Handles the case where you are on the view tab and get redirected back to /view
        this.router.events
            .pipe(
                filter(e => e instanceof NavigationEnd && !this.route.snapshot.children.length),
                untilDestroyed(this),
            )
            .subscribe(() => {
                this._tryToRedirectToCamera();
            });
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
        if (s.mode === VMS_MODE.CAMERA_SELECTED) {
            const cookieName = `nx_last_accessed_camera_for_system_${this.systemId}`;
            this.cookieService.set(cookieName, s.selectedCameraId, 365, '/');
            this.selectedCameraId = s.selectedCameraId;
        } else {
            this.selectedCameraId = '';
        }
    }

    private _setInitializationState(initialized, initializedWithError): void {
        this.initialized = initialized;
        this.$self.classList[initialized ? 'add' : 'remove']('initialized');
        this.initializedWithError = initializedWithError;
        this.$self.classList[initializedWithError ? 'add' : 'remove']('initialization-error');
        if (!initializedWithError) {
            this.ribbonService.hide();
        }
    }

    private _onRouteChange(params): void {
        // cancel pool for the previous system
        this.cancelPoll$.next('cancel');
        this.systemId = params.systemId || null;
        this.system = this.systemService.getCurrentSystem();
        this.hasCameras = false;
        if (!environment.isLocal) {
            const systemInfoFromCDB: NxSystemInfo = this.systemsService.systems.find(
                s => s.id === this.systemId,
            );
            if (systemInfoFromCDB?.stateOfHealth === this.CONFIG.system.status.online) {
                this._setInitializationState(false, false);
                this.ribbonService.hide();
            } else {
                this._setInitializationState(true, true);
            }
        }
        this.vms.reset();
        this._initSystem();
    }

    private mediaServerChanged(
        mediaServers: NxViewMediaServer[],
        cachedServers: NxViewMediaServer[],
    ): boolean {
        if (mediaServers.length !== cachedServers.length) {
            return true;
        }

        return mediaServers.some(server => {
            const cachedServer = cachedServers.find(cached => cached.id === server.id);
            if (!cachedServer || server.status !== cachedServer.status) {
                return true;
            }

            if (server.cameras.length !== cachedServer.cameras.length) {
                return true;
            }

            return server.cameras.some(camera => {
                const cachedCamera = cachedServer.cameras.find(cached => cached.id === camera.id);

                return (
                    !cachedCamera ||
                    camera.name !== cachedCamera.name.replace(/&lt;/g, '<').replace(/&gt;/g, '>') ||
                    camera.status !== cachedCamera.status ||
                    camera.scheduleEnabled !== cachedCamera.scheduleEnabled
                );
            });
        });
    }

    private processCameras(
        c: ec2CameraEx,
        ms: NxViewMediaServer,
        archiveRanges: Record<string, SimpleTimeRange>,
    ): Camera {
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
                : ((c.status === 'Online' ? 'Live' : c.status) as CAMERA_STATUS),
            c.scheduleEnabled,
            c.disableDualStreaming,
            archiveRanges[c.id] || new SimpleTimeRange(0, 0),
            [],
            c.status !== 'Offline'
                ? this.system?.mediaserver.previewUrl(c.id, 0, 128, 128)
                : of(''),
            (transport: string, quality: string, t?: ms) =>
                this.system?.getPlaybackUrl(c.id, transport, quality, t),
            (t?: ms, width = 128, height = 128) =>
                c.status !== 'Offline'
                    ? this.system?.mediaserver.previewUrl(c.id, t, width, height)
                    : of(),
            this.system.info?.system2faEnabled,
        );
        result.parseAdditionalParams(c.addParams);
        return result;
    }

    private async findCamerasWithArchive(
        mediaServers: NxViewMediaServer[],
        archiveRanges: Record<string, SimpleTimeRange>,
    ): Promise<void> {
        return this.system.mediaserver
            .getCameraHistoryItems()
            .toPromise()
            .then(result => {
                if (!result?.length) {
                    return;
                }
                mediaServers.forEach(mediaServer => {
                    const rec = result.find(rec => rec.serverGuid === `{${mediaServer.id}}`);
                    rec?.archivedCameras.forEach(cameraId => {
                        // trick camera 'hasArchive' - here we don't need a real info -- TT
                        archiveRanges[cleanId(cameraId)] = new SimpleTimeRange(1, 2);
                    });
                });
            });
    }

    private _initSystem() {
        let processingMediaServers = false;
        let cachedMediaServers: NxViewMediaServer[] = [];
        const firstLoad = new Subject();

        firstLoad.pipe(take(1)).subscribe(() => {
            this._setInitializationState(true, !this.system.isOnline);
            if (!this.route.snapshot.children.length) {
                this._tryToRedirectToCamera();
            }

            setTimeout(() => this.timeline.requestCanvasGeometryUpdate(), 220);
        });
        timer(0, VideoManagementSystemService.statusRefreshInterval)
            .pipe(takeUntil(this.cancelPoll$))
            .subscribe(async () => {
                if (!this.system.isOnline || processingMediaServers) {
                    return;
                }

                const mediaServers = await this.system.getViewMediaServersAndCameras(true);
                // mediaServers length is 0 when getViewMediaServersAndCameras fails. No system can ever have 0 servers.
                if (
                    (this.initialized &&
                        !this.mediaServerChanged(mediaServers, cachedMediaServers)) ||
                    mediaServers.length === 0
                ) {
                    return;
                }
                cachedMediaServers = mediaServers;

                processingMediaServers = true;
                const serverTimeInfos = await this.system.getServerTimes();
                this.vms.serverTimes.set(serverTimeInfos);
                serverTimeInfos.forEach(sti => {
                    const mediaServer = mediaServers?.find(ms => ms.id === sti.serverId);
                    if (mediaServer) {
                        const serverAndLocalTimeDiff = Math.abs(new Date().getTime() - sti.vmsTime);
                        // fixes issue https://www.youtube.com/watch?v=sRqGfIbdJyI
                        const timeDiff = serverAndLocalTimeDiff > MAX_OUT_OF_SYNC_TIME;
                        if (timeDiff) {
                            this.toastService.show(
                                this.LANG.system.status.outOfTimeSync,
                                ToastType.Danger,
                                { autohide: true },
                            );
                        }
                    }
                });

                if (this.initializedWithError) {
                    this._setInitializationState(true, false);
                }

                const archiveRanges: Record<string, SimpleTimeRange> = {};

                await this.findCamerasWithArchive(mediaServers, archiveRanges);

                const processedMediaServers: IMediaServer[] = mediaServers.map(ms => ({
                    ...ms,
                    cameras: ms.cameras.map(c => this.processCameras(c, ms, archiveRanges)),
                }));

                this.vms.setMediaServers(this.systemId, processedMediaServers);
                this.mediaservers = processedMediaServers;
                processingMediaServers = false;

                firstLoad.next(true);
            });
    }

    private getCameraFromCookies(): string {
        const cookieName = `nx_last_accessed_camera_for_system_${this.systemId}`;
        const cookieCameraId = this.cookieService.get(cookieName);
        if (cookieCameraId) {
            const thisCameraExists = !!this.mediaservers.find(ms =>
                ms.cameras.find(c => c.id === cookieCameraId),
            );
            if (thisCameraExists) {
                return cookieCameraId;
            }
        }
        return '';
    }

    private findOnlineCamera(): string {
        const cameraChecker = (c: ICamera) => c.isOnline;
        const firstMediaServerWithAnOnlineCamera = this.mediaservers.find(ms =>
            ms.cameras.find(cameraChecker),
        );
        let id = '';
        if (firstMediaServerWithAnOnlineCamera) {
            id = firstMediaServerWithAnOnlineCamera.cameras.find(cameraChecker)?.id || '';
        }
        return id;
    }

    private getFirstCamera(): string {
        const firstMediaServer = this.mediaservers.find(ms => ms.cameras?.length);
        if (firstMediaServer) {
            return firstMediaServer.cameras[0].id;
        }
        return '';
    }

    private _tryToRedirectToCamera(): void {
        const cid = this.getCameraFromCookies() || this.findOnlineCamera() || this.getFirstCamera();
        if (cid) {
            this.router
                .navigate([cid], {
                    relativeTo: this.route,
                    replaceUrl: true,
                })
                .catch(e => console.error(e));
        }
    }
}
