import {
    Component,
    OnInit,
    OnDestroy,
    ElementRef,
    HostListener,
    Renderer2,
    HostBinding,
    effect,
} from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { CookieService } from 'ngx-cookie-service';
import { DeviceDetectorService } from 'ngx-device-detector';
import { of, Subject, timer } from 'rxjs';
import { filter, map, take, takeUntil } from 'rxjs/operators';

import { NxRibbonService } from '@components/ribbon/ribbon.service';
import { ToastType } from '@components/toast-container/toast.types';
import { environment } from '@environments/environment';
import staticLang from '@language_static';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import type { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';
import type { ViewBaseServer, ViewBaseCamera } from '@services/system.service/types/servers.types';
import { NxSystemsService } from '@services/systems.service';
import { NxToastService } from '@services/toast.service';
import { icons } from '@static-variables';
import { cleanId, dirtyId } from '@utils/general';
import { cleanIds, setServerIpAndPort } from '@utils/nx';
import type { ms } from '@view/datatypes/type-aliases';
import { VideoManagementSystemService } from '@view/services/vms.service';
import { TimelineService } from '@vms-client/submodules/timeline/services/timeline.service';

import { ViewCamera, CAMERA_STATUS } from '../../datatypes/Camera';
import type { ViewMediaServer } from '../../datatypes/IMediaServer';
import type { BaseTimeRange } from '../../datatypes/TimeRange';
import { newBaseTimeRange } from '../../datatypes/TimeRange';
import { VMS_MODE } from '../../datatypes/VmsState';
import { WebClientUxService } from '../../services/webclient-ux.service';
import { FULLSCREEN_INACTIVITY_DELAY_MS } from '../constants';

const MAX_OUT_OF_SYNC_TIME = 60000; // ms

@UntilDestroy()
@Component({
    selector: 'nx-system-view-index-page',
    templateUrl: 'system-view-index.page.component.html',
    styleUrls: ['system-view-index.page.component.scss'],
})
export class NxSystemViewIndexPageComponent implements OnInit, OnDestroy {
    @HostBinding('class.new-header') newHeader: boolean;

    systemId: string;
    private system: NxSystem;
    selectedCameraId: string;
    mediaservers: ViewMediaServer[];

    CONFIG: IConfig;
    LANG = staticLang;
    private fullscreenMode: boolean;
    private fullscreenToggle: boolean;
    showElementsInFSM: boolean;
    private onShowElements: number;
    private onMoveShowElements: number;
    icons = icons;

    initialized: boolean = false;
    initializedWithError: boolean = false;
    isSidebarShown: boolean = false;

    hasCameras: boolean = true;
    private cancelPoll$ = new Subject<string>();

    // animated: boolean = false

    handleSidebarTogglingEarClick(): void {
        this.ux.isSidebarShown = !this.ux.state.isSidebarShown;
    }

    private get $self(): HTMLElement {
        return this.self.nativeElement;
    }

    private lastWindowWidth = 1024; // should be larger than the threshold

    @HostListener('window:resize', ['$event'])
    onResize(event: { target: { innerWidth: number } }): void {
        const widthThreshold = this.ux.MIN_WINDOW_WIDTH_FOR_SIDEBAR;
        const newWidth = event.target.innerWidth;
        if (newWidth <= widthThreshold && this.lastWindowWidth > widthThreshold) {
            this.ux.isSidebarShown = false; // wide => narrow
        }
        if (newWidth > widthThreshold && this.lastWindowWidth <= widthThreshold) {
            this.ux.isSidebarShown = true; // narrow => wide
        }
        this.lastWindowWidth = newWidth;
    }

    constructor(
        configService: NxConfigService,
        private self: ElementRef<HTMLElement>,
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
        private toastService: NxToastService,
    ) {
        this.CONFIG = configService.getConfig();

        this.fullscreenMode = false;
        this.showElementsInFSM = true;
        this.newHeader = this.CONFIG.featureFlags.newHeader;
        effect(() => {
            const state = this.vms.state();
            if (state.mode === VMS_MODE.CAMERA_SELECTED) {
                const cookieName = `nx_last_accessed_camera_for_system_${this.systemId}`;
                this.cookieService.set(cookieName, state.selectedCameraId, 365, '/');
                this.selectedCameraId = state.selectedCameraId;
            } else {
                this.selectedCameraId = '';
            }
        });
    }

    ngOnInit(): void {
        this.vms.reset();

        this.route.params.pipe(untilDestroyed(this)).subscribe(params => {
            // cancel pool for the previous system
            this.cancelPoll$.next('cancel');
            this.systemId = params.systemId || null;
            this.system = this.systemService.getCurrentSystem();
            this.hasCameras = false;
            if (!environment.isLocal) {
                const systemInfoFromCDB = this.systemsService.systems.find(
                    s => s.id === this.systemId,
                );
                if (systemInfoFromCDB?.stateOfHealth === this.CONFIG.system.status.online) {
                    this.setInitializationState(false, false);
                    this.ribbonService.hide();
                } else {
                    this.setInitializationState(true, true);
                }
            }
            this.vms.reset();
            this.initSystem();
        });

        this.ux.subject.pipe(untilDestroyed(this)).subscribe(state => {
            if (state.isSidebarShown) {
                this.$self.classList.add('sidebarShown');
            } else {
                this.$self.classList.remove('sidebarShown');
            }

            this.isSidebarShown = state.isSidebarShown;
            setTimeout(() => this.timeline.requestCanvasGeometryUpdate(), 220);

            if (state.isFullScreen) {
                this.fullscreenMode = true;
                this.fullscreenToggle = true;
                this.onShowElements = window.setTimeout(() => {
                    this.showElementsInFSM = false;
                }, FULLSCREEN_INACTIVITY_DELAY_MS);

                this.unListenMouseMove = this.renderer.listen(
                    this.$self,
                    'mousemove',
                    this.onEvent,
                );

                this.unListenTouch = this.renderer.listen(this.$self, 'touch', this.onEvent);

                this.unListenTouchMove = this.renderer.listen(
                    this.$self,
                    'touchmove',
                    this.onEvent,
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
        });

        this.onResize({ target: { innerWidth: window.innerWidth } });

        // Handles the case where you are on the view tab and get redirected back to /view
        this.router.events
            .pipe(
                filter(e => e instanceof NavigationEnd && !this.route.snapshot.children.length),
                untilDestroyed(this),
            )
            .subscribe(() => {
                this.tryToRedirectToCamera();
            });
    }

    public ngOnDestroy(): void {
        this.cancelPoll$.next('cancel');
        this.ribbonService.hide();
    }

    private unListenMouseMove: () => void;
    private unListenTouch: () => void;
    private unListenTouchMove: () => void;

    private onEvent = (): void => {
        if (this.fullscreenMode && !this.showElementsInFSM) {
            this.showElementsInFSM = true;
            clearTimeout(this.onMoveShowElements);
            this.onMoveShowElements = window.setTimeout(() => {
                this.showElementsInFSM = false;
            }, FULLSCREEN_INACTIVITY_DELAY_MS);
        }
    };

    private setInitializationState(initialized: boolean, initializedWithError: boolean): void {
        this.initialized = initialized;
        this.$self.classList[initialized ? 'add' : 'remove']('initialized');
        this.initializedWithError = initializedWithError;
        this.$self.classList[initializedWithError ? 'add' : 'remove']('initialization-error');
        if (!initializedWithError) {
            this.ribbonService.hide();
        }
    }

    private mediaServerChanged(
        mediaServers: ViewBaseServer[],
        cachedServers: ViewBaseServer[],
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
        c: ViewBaseCamera,
        ms: ViewBaseServer,
        archiveRanges: Record<string, BaseTimeRange>,
    ): ViewCamera {
        this.hasCameras = true;
        const currentUser = this.system?.permissionManager.currentUser$$();
        const canEditSpecificCamera =
            currentUser?.resourceAccessRights?.[dirtyId(c.id)]?.includes('edit');
        const canEdit = canEditSpecificCamera || currentUser.isAdmin;
        const result = new ViewCamera(
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
            archiveRanges[c.id] || newBaseTimeRange(0, 0),
            [],
            c.status !== 'Offline'
                ? this.system?.mediaserver.previewUrl(c.id, 0, 128, 128)
                : of(''),
            (transport: string, quality: string, t?: ms) =>
                this.system?.mediaserver.getPlaybackUrl(c.id, transport, quality, t),
            (t?: ms, width = 128, height = 128) =>
                c.status !== 'Offline'
                    ? this.system?.mediaserver.previewUrl(c.id, t, width, height)
                    : of(),
            this.system.info?.system2faEnabled,
            c.mediaStreams,
            c.rotation,
            canEdit,
        );
        return result;
    }

    private async findCamerasWithArchive(
        mediaServers: ViewBaseServer[],
        archiveRanges: Record<string, BaseTimeRange>,
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
                        archiveRanges[cleanId(cameraId)] = newBaseTimeRange(1, 2);
                    });
                });
            });
    }

    private initSystem(): void {
        let processingMediaServers = false;
        let cachedMediaServers: ViewBaseServer[] = [];
        const firstLoad = new Subject();

        firstLoad.pipe(take(1)).subscribe(() => {
            this.setInitializationState(true, !this.system.isOnline);
            if (!this.route.snapshot.children.length) {
                this.tryToRedirectToCamera();
            }

            setTimeout(() => this.timeline.requestCanvasGeometryUpdate(), 220);
        });
        timer(0, VideoManagementSystemService.statusRefreshInterval)
            .pipe(takeUntil(this.cancelPoll$))
            .subscribe(async () => {
                if (!this.system.isOnline || processingMediaServers) {
                    return;
                }

                const mediaServers = await this.system.mediaserver
                    .getViewMediaServersAndCameras()
                    .pipe(
                        map(({ mediaServers, cameras }) => {
                            mediaServers.forEach(cleanIds);
                            cameras.forEach(cleanIds);

                            return mediaServers.map(ms => ({
                                ...setServerIpAndPort(ms),
                                cameras: cameras.filter(c => c.parentId === ms.id),
                            }));
                        }),
                    )
                    .toPromise();

                if (
                    this.initialized &&
                    !this.mediaServerChanged(mediaServers, cachedMediaServers)
                ) {
                    return;
                }
                cachedMediaServers = mediaServers;

                processingMediaServers = true;
                const serverTimeInfos = await this.system.mediaserver
                    .getServerTimes()
                    .toPromise()
                    .then(({ reply }) => {
                        const now = Date.now();
                        return reply.map(i => {
                            const vmsTime = parseInt(i.vmsTime);
                            const osTime = parseInt(i.osTime);
                            return {
                                vmsTime,
                                vmsTimeOffset: now - vmsTime,
                                osTimeOffset: now - osTime,
                                serverId: i.serverId.slice(1, -1), // Clean id
                                timeZoneOffset: parseInt(i.timeZoneOffset),
                            };
                        });
                    });
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
                    this.setInitializationState(true, false);
                }

                const archiveRanges: Record<string, BaseTimeRange> = {};

                await this.findCamerasWithArchive(mediaServers, archiveRanges);

                const processedMediaServers = mediaServers.map(ms => ({
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
        const isOnline = (c: ViewCamera): boolean => c.isOnline;
        const firstMediaServerWithAnOnlineCamera = this.mediaservers.find(ms =>
            ms.cameras.find(isOnline),
        );
        let id = '';
        if (firstMediaServerWithAnOnlineCamera) {
            id = firstMediaServerWithAnOnlineCamera.cameras.find(isOnline)?.id || '';
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

    private tryToRedirectToCamera(): void {
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
