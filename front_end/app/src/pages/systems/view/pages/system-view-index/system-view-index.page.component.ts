import {
    Component, OnInit, OnDestroy, ElementRef,
    HostListener
}                                                from '@angular/core';
import { ActivatedRoute, Router }                from '@angular/router';
import { Subject, Subscription, timer }          from 'rxjs';
import {
    NxSystemService, NxSystem
}                                                from '@services/system.service';
import { NxAccountService }                      from '@services/account.service';
import VideoManagementSystemService              from '../../vms-client/submodules/vms/services/vms.service';
import VmsState, { VMS_MODE }                    from '../../vms-client/submodules/vms/datatypes/VmsState';
import MediaServer                               from '../../vms-client/submodules/vms/datatypes/MediaServer';
import Camera                                    from '../../vms-client/submodules/vms/datatypes/Camera';
import { CAMERA_STATUS, SimpleTimeRange }        from '../../vms-client/submodules/vms/datatypes/ICamera';
import { ms, LoggerDecorator }                   from '../../vms-client/utils';
import TimelineService                           from '../../vms-client/submodules/timeline/services/timeline.service';
import WebClientUxService, { WebclientUxState }  from '../../services/webclient-ux.service';
import { NxConfigService, IConfig }              from '@services/nx-config';
import { NxSystemsService }                      from '@services/systems.service';
import { UntilDestroy, untilDestroyed }          from '@ngneat/until-destroy';
import { distinctUntilChanged, take, takeUntil } from 'rxjs/operators';
import { NxUtilsService }                        from '@services/utils.service';
import sidebarLayout                             from '../sidebarLayout.cfg';

@UntilDestroy()
@Component({
    selector    : 'nx-system-view-index-page',
    templateUrl : 'system-view-index.page.component.html',
    styleUrls   : ['system-view-index.page.component.scss']
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

    CONFIG: IConfig;
    fullscreenMode: boolean;
    fullscreenToggle: boolean;
    showElementsInFSM: boolean;
    onShowElements: any;
    onMoveShowElements: any;

    public initialized: boolean = false
    public initializedWithError: boolean = false
    public isSidebarShown: boolean = false

    public hasCameras: boolean = true
    private cancelPoll$ = new Subject<string>()

    // public animated: boolean = false

    public handleSidebarTogglingEarClick () {
        this.ux.isSidebarShown = !this.ux.state.isSidebarShown;
    }

    public get $self(): HTMLElement {
        return this.self.nativeElement as HTMLElement;
    }

    public get mediaServers (): Array<MediaServer> {
        return this._state && this._state.mode !== VMS_MODE.NOT_INITIALIZED
            ? this._state.mediaServers
            : [];
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

    protected _windowWidth = 1024 // should be larger than the threshold

    @HostListener('window:resize', ['$event'])
    public onResize (event) {
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

    protected _handleMovingFromWideInterfaceToNarrow () {
        this.ux.isSidebarShown = false;
    }

    protected _handleMovingFromNarrowInterfaceToWide () {
        this.ux.isSidebarShown = true;
    }

    constructor(
        configService: NxConfigService,
        private self: ElementRef,
        protected router: Router,
        protected route: ActivatedRoute,
        protected accountService: NxAccountService,
        protected systemService: NxSystemService,
        protected systemsService: NxSystemsService,
        protected vms: VideoManagementSystemService,
        protected timeline: TimelineService,
        protected ux: WebClientUxService,
        private utilsService: NxUtilsService
    ) {
        this.CONFIG = configService.getConfig();
        this._onVmsSubjectChange = this._onVmsSubjectChange.bind(this);
        this._onRouteChange = this._onRouteChange.bind(this);
        this._onUxStateChange = this._onUxStateChange.bind(this);

        this.fullscreenMode = false;
        this.showElementsInFSM = true;
    }

    private setSystemSubscription() {
        this.systemsSubscription?.unsubscribe();
        this.systemsSubscription = this.systemsService.systemsSubject
            .pipe(
                untilDestroyed(this),
                distinctUntilChanged())
            .subscribe((systems) => {
                if (systems.length) {
                    this.systems = systems;
                }
                if (!this.system) {
                    this._log('systemsService -> initSystem', { ...systems });
                    this._initSystem();
                }
            });
    }

    public ngOnInit (): void {
        this.vms.reset();
        this._vmsStateSubscription = this.vms.subject.pipe(untilDestroyed(this)).subscribe(this._onVmsSubjectChange);
        this._routerParamsSubscription = this.route.params.pipe(untilDestroyed(this)).subscribe(this._onRouteChange);
        this._uxStateSubscription = this.ux.subject.pipe(untilDestroyed(this)).subscribe(this._onUxStateChange);
        this.onResize({ target: { innerWidth: window.innerWidth } });

        this.accountService.get().then((account) => {
            if (account && !this.CONFIG.isLocal && !this.systemsService.isPolling) {
                this.systemsService.getSystems(account.email);
            }
        });

        this.setSystemSubscription();
    }

    public ngOnDestroy (): void {
        this.cancelPoll$.next('cancel');
    }

    protected _onUxStateChange (s: WebclientUxState) {
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
            }, 3000);
        } else {
            clearTimeout(this.onShowElements);
            clearTimeout(this.onMoveShowElements);
            this.fullscreenMode = false;
            this.showElementsInFSM = true;

            if (this.utilsService.isMobile() && this.fullscreenToggle) {
                this.ux.isSidebarShown = false;
            }
            this.fullscreenToggle = false;
        }
    }

    protected _onVmsSubjectChange (s: VmsState) {
        this._state = s;
    }

    protected _setInitializationState (initialized, initializedWithError) {
        // this._log('_setInitializationState', initialized, initializedWithError)
        this.initialized = initialized;
        this.$self.classList[initialized ? 'add' : 'remove']('initialized');
        this.initializedWithError = initializedWithError;
        this.$self.classList[initializedWithError ? 'add' : 'remove']('initialization-error');
    }

    protected _onRouteChange (params) {
        // cancel pool for the previous system
        this.cancelPoll$.next('cancel');
        this.systemId = params.systemId || null;
        this.system = undefined;
        this.hasCameras = false;
        this._setInitializationState(false, false);

        // reset subscription to get values immediately and not waiting for next update
        this.setSystemSubscription();
    }

    protected _initSystem () {
        this._log('initSystem entered');
        this.vms.reset();

        const createSystem = () => {
            return this.accountService.get().then(account => {
                if (!account) {
                    this._warn('accountService returned no account');
                    return Promise.reject();
                }

                if (this.CONFIG.isLocal) {
                    this.system = this.systemService.createLocalSystem(this.accountService.mediaServerApi, account.id, account.email);
                    this._log('local system created', this.system);
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

        let cachedMediaServers;
        const firstLoad = new Subject();

        firstLoad.pipe(take(1)).subscribe(() => {
            this._log(`system ${this.system.id} view initialized`, this.hasCameras);
            this._setInitializationState(true, false);
            if (!this.route.snapshot.children.length) {
                this._tryToRedirectToCamera();
            }

            setTimeout(() => this.timeline.requestCanvasGeometryUpdate(), 220);
        });

        createSystem().then(() => {
            timer(0, VideoManagementSystemService.statusRefreshInterval).pipe(takeUntil(this.cancelPoll$))
                .subscribe(async () => {
                    if (!this.system) {
                        return;
                    }

                    const mediaServers = await this.system.getMediaServersAndCameras(true);
                    const serverTimeInfos = await this.system.getServerTimes();
                    serverTimeInfos.forEach(sti => {
                        const mediaServer = mediaServers.find(ms => ms.id === sti.serverId);
                        if (mediaServer) {
                            mediaServer.timeInfo = sti;
                        }
                    });
                    // TODO: If no issues with this section being commented out remove it in 21.1
                    // const findCameraArchiveRanges = (cid) => {
                    //     // (check archive presence mode)
                    //     if (!this.system.userManager.permissions.viewArchives) {
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
                    //     });
                    // };
                    const processCameras = (c) => {
                        this.hasCameras = true;
                        const result = new Camera(
                            c.id,
                            c.preferredServerId,
                            c.name,
                            c.url,
                            ms.status === 'Offline' ? 'Offline' : (c.status === 'Online' ? 'Live' : c.status) as CAMERA_STATUS,
                            c.scheduleEnabled,
                            c.disableDualStreaming,
                            new SimpleTimeRange(0, 0),
                            [],
                            this.system?.getCameraThumbnailUrl(c.id),
                            (transport: string, quality: string, t?: ms) => this.system?.getPlaybackUrl(c.id, transport, quality, t),
                            (t?: ms) => this.system?.getCameraThumbnailUrl(c.id, 128, 128, t)
                        );
                        result.parseAdditionalParams(c.addParams);
                        return result;
                    };
                    // TODO: If no issues with this section being commented out remove it in 21.1
                    // const cameraIds = mediaServers.reduce((acc, ms) => acc.concat(ms.cameras.map(c => c.id)), []);
                    // const archiveRanges = {};
                    // const archives = {};
                    // const now = Date.now();
                    // await Promise.all(cameraIds.map(findCameraArchiveRanges));

                    cachedMediaServers = mediaServers.map(ms => NxUtilsService.formatURL(({
                        id               : ms.id,
                        name             : ms.name,
                        networkAddresses : ms.networkAddresses,
                        status           : ms.status,
                        cameras          : ms.cameras.map((c: any) => processCameras(c, ms))
                    })));

                    this.vms.setMediaServers(this.systemId, cachedMediaServers);
                    firstLoad.next();
                });
        }).catch(e => {
            this._warn(`system ${this.system?.id || this.systemId} view initialization failed`, e);
            setTimeout(() => this._setInitializationState(true, true));
        });
    }

    protected _tryToRedirectToCamera () {
        const cid = this.vms.getLastAccessedCameraId();
        if (cid) {
            this.router.navigate([cid], { relativeTo: this.route, replaceUrl: true });
        }
    }
}

export default NxSystemViewIndexPageComponent;
