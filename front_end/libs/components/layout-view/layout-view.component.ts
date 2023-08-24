// import { Location } from '@angular/common';
import { ChangeDetectorRef, Component, Inject, LOCALE_ID } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { omit, pick, uniq } from 'lodash-es';
import { TourService } from 'ngx-ui-tour-md-menu';
import {
    BehaviorSubject,
    combineLatest,
    defer,
    firstValueFrom,
    merge,
    Observable,
    Subject,
} from 'rxjs';
import {
    catchError,
    distinctUntilChanged,
    filter,
    map,
    shareReplay,
    startWith,
    switchMap,
    take,
    tap,
} from 'rxjs/operators';

import staticLang from '@common/language/language_i18n_static.json';
import { ConfigType } from '@components/console-table/console-table.component.types';
import type { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import {
    LayoutResourceTree,
    ResourceNode,
    ResourceType,
} from '@components/layout-grid/layout-grid.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { WebRTCStreamManager } from '@openLibs/webrtc-stream-manager';
import { NxTranslatePipe } from '@pipes/nx-translate.pipe';
import { NxAccountService } from '@services/account.service';
import { NxLayoutGridService } from '@services/layout-grid/layout-grid.service';
import {
    AddResourceType,
    EditResourceType,
    RemoveResourceType,
} from '@services/layout-grid/layout-grid.types';
import { LayoutStateService } from '@services/layout-state/layout-state.service';
import {
    ActiveLayoutActions,
    ActiveLayoutSelectors,
} from '@services/layout-state/store/active-layout';
import { LocalLayoutsActions } from '@services/layout-state/store/local-layouts';
import { SharedLayoutsSelectors } from '@services/layout-state/store/shared';
import { LayoutTypes } from '@services/layout-state/store/shared/types/layout-state.types';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { ContextManifest } from '@services/nx-cloud-api/nx-cloud-api.types';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxPageService } from '@services/page.service';
import { Layout, LayoutItem, Layouts, WebPages } from '@services/system-api.types';
import { NxSystemRestAPI } from '@services/system-rest-api.service';
import { CurrentUser } from '@services/system-user.types';
import {
    CameraStatus,
    NxSystemCamera,
    RecordingStatus,
} from '@services/system.service/camera-manager/camera-manager-types';
import { NxSystem } from '@services/system.service/system';
import { NxSystemServer } from '@services/system.service/system-types';
import { NxSystemService } from '@services/system.service/system.service';
import { alphabeticalSort, alphaNumericSort, cleanId, dirtyId } from '@utils/general';
import { generateTour, translateStep } from '@utils/nx';

interface Resource {
    name: string;
    id: string;
}

enum CloudLayoutTours {
    DEFAULT = 'default',
}

const cloudLayoutTours = {
    [CloudLayoutTours.DEFAULT]: [
        'grid',
        'left-menu',
        ResourceType.LAYOUTS,
        'add_layout',
        { anchorId: 'selected-layout', isOptional: true },
        ResourceType.SERVERS,
        ResourceType.CAMERAS,
        ResourceType.WEB_PAGES,
        { anchorId: 'selected-focus', isOptional: true },
        'help',
    ],
};

interface ResourceLookup<T = { id: string }> {
    [id: string]: ResourceNode<T>;
}
/**
 * Find better abstraction once we add more action types and resources.
 *
 * Probably a factory generateManifestAndHandler(resourceType, actionType, system).
 *
 * This would generate the manifest from staticlang. Need to fine some generic type to work with all handlers.
 */
const createManifests: Partial<Record<ResourceType, ContextManifest>> = {
    [ResourceType.LAYOUTS]: {
        ...pick(staticLang.layouts.actions.create, ['label']),
        fields: [
            {
                ...staticLang.layouts.actions.create.fields.name,
                type: ConfigType.TEXT,
                name: 'name',
                meta: {
                    options: {
                        required: true,
                    },
                },
            },
        ],
    },
};

const editManifests: Partial<Record<ResourceType, ContextManifest>> = {
    [ResourceType.LAYOUT]: {
        ...pick(staticLang.layouts.actions.edit, ['label']),
        fields: [
            ...createManifests[ResourceType.LAYOUTS].fields,
            {
                ...staticLang.layouts.actions.edit.fields.locked,
                type: ConfigType.BOOLEAN,
                name: 'locked',
            },
        ],
    },
};

@UntilDestroy()
@Component({
    selector: 'nx-layout-view',
    templateUrl: 'layout-view.component.html',
    styleUrls: ['layout-view.component.scss'],
    providers: [NxLayoutGridService],
})
export class NxLayoutViewComponent {
    LANG = staticLang;
    CONFIG: IConfig;
    ptzControlTarget: NxSystemCamera;

    selectedSystem$: Observable<NxSystem> = this.activatedRoute.params.pipe(
        map(async ({ systemId }) => systemId),
        distinctUntilChanged(),
        switchMap(async () => {
            const current = this.systemService.getCurrentSystem();
            await current.update();
            return current;
        }),
        shareReplay({
            bufferSize: 1,
            refCount: false,
        }),
        untilDestroyed(this),
    );

    // Temporary version refrence. To prevent conflicts with Parti's open MR.
    useV2api = false;

    systemOnline$ = this.selectedSystem$.pipe(
        tap(system => {
            this.useV2api = system.version >= 6.0;
        }),
        switchMap(system =>
            system.isOnline
                ? Promise.resolve(true)
                : system.mediaserver.ping().pipe(map(() => true)),
        ),
        catchError(() => Promise.resolve(false)),
        startWith(true),
        shareReplay({ bufferSize: 1, refCount: true }),
    );

    updateLayoutItems$ = new BehaviorSubject<null>(null);

    updateLayoutItems = (): void => this.updateLayoutItems$.next(null);

    layoutItemLookup$ = this.selectedSystem$.pipe(
        switchMap(system =>
            this.layoutStateService.loadUnsavedLayouts(system.id).pipe(map(() => system)),
        ),
        switchMap(system => this.updateLayoutItems$.pipe(map(() => system))),
        switchMap(({ mediaserver, serverManager, cameraManager, permissionManager }) =>
            combineLatest([
                defer(() => cameraManager.getCameras()).pipe(
                    switchMap(cameras =>
                        cameraManager.hasArchives().pipe(
                            catchError(async () => [] as string[]),
                            map(camerasWithArchives =>
                                cameras.map(({ recordingStatus, ...camera }) => ({
                                    ...camera,
                                    recordingStatus: !camerasWithArchives.includes(camera.id)
                                        ? recordingStatus
                                        : RecordingStatus.Archive,
                                })),
                            ),
                        ),
                    ),
                ),
                serverManager.getServers().pipe(catchError(async () => [] as NxSystemServer[])),
                mediaserver instanceof NxSystemRestAPI
                    ? mediaserver.getWebPages().pipe(catchError(async () => [] as WebPages))
                    : Promise.resolve([] as WebPages),
                this.#selectedLayout$.pipe(startWith(null)),
                this.availableLayouts$.pipe(startWith([])),
                new Promise<CurrentUser>(resolve => resolve(permissionManager.currentUser())),
            ]),
        ),
        map(
            ([
                cameras,
                servers,
                webPages,
                currentLayout,
                layouts,
                currentUser,
            ]): LayoutResourceTree => {
                const aspectRatio = currentLayout?.cellAspectRatio || 0;

                const isIoOnly = (camera: NxSystemCamera): boolean =>
                    !(!!camera.parameters.mediaStreams || !camera.parameters.ioSettings?.length);
                const parsedCameras = cameras.reduce((cameras, camera) => {
                    const parentServerOnline =
                        servers.find(({ id }) => id === camera.parentId).status === 'Online';
                    const online =
                        isIoOnly(camera) ||
                        (camera.status === CameraStatus.Online && parentServerOnline);
                    const unauthorized =
                        camera.status === CameraStatus.Unauthorized && parentServerOnline;
                    if (!parentServerOnline) {
                        if (camera.status === CameraStatus.Unauthorized) {
                            camera.status = CameraStatus.Offline;
                        }
                        if (camera.recordingStatus === RecordingStatus.Recording) {
                            camera.recordingStatus = RecordingStatus.Scheduled;
                        }
                    }

                    const nonWebRtcCodec = [7, 173].includes(
                        (camera.parameters.mediaStreams?.streams ?? [])[0]?.codec,
                    );
                    return {
                        ...cameras,
                        [camera.id]: {
                            type: isIoOnly(camera) ? ResourceType.IO_DEVICE : ResourceType.CAMERA,
                            name: camera.name,
                            details: {
                                ...camera,
                                online,
                                unauthorized,
                                requiresTranscoding: nonWebRtcCodec && !this.useV2api,
                                resourceType:
                                    this.LANG.layouts.titles.resourceTypes[ResourceType.CAMERA],
                                status: (camera.recordingStatus || camera.status).toLowerCase(),
                                // Compatibility patch for status
                            },
                            aspectRatio:
                                camera.parameters.overrideAr || camera.defaultRatio || aspectRatio,
                        },
                    };
                }, {} as ResourceLookup<(typeof cameras)[0]>);

                const parsedServers = servers.reduce(
                    (servers, server) => ({
                        ...servers,
                        [server.id]: {
                            type: ResourceType.SERVER,
                            name: server.name,
                            details: {
                                ...server,
                                status: server.status.toLowerCase(),
                                online: server.status === 'Online',
                                resourceType:
                                    this.LANG.layouts.titles.resourceTypes[ResourceType.SERVER],
                            },
                            aspectRatio,
                        },
                    }),
                    {} as ResourceLookup<(typeof servers)[0]>,
                );

                const parsedWebPages = webPages.reduce(
                    (webPages, webPage) => ({
                        ...webPages,
                        [webPage.id]: {
                            type: ResourceType.WEB_PAGE,
                            name: webPage.name,
                            details: webPage,
                            aspectRatio,
                        },
                    }),
                    {} as ResourceLookup<(typeof webPages)[0]>,
                );
                const byName = alphaNumericSort<Pick<Resource, 'name'>>(
                    this.locale,
                    r => r.name || '',
                );

                const layoutsForTree = layouts
                    .filter(layout => layout.id && layout.id !== 'new')
                    .filter(layout =>
                        [currentUser?.id, '{00000000-0000-0000-0000-000000000000}'].includes(
                            layout.parentId,
                        ),
                    )
                    .map(details => ({
                        name: details.name,
                        id: details.id,
                        shared: details.parentId === '{00000000-0000-0000-0000-000000000000}',
                        type: ResourceType.LAYOUT,
                        details,
                    }))
                    .sort((a, b) => (a.shared === b.shared ? byName(a, b) : a.shared ? -1 : 1));
                const parsedResources = Object.entries({
                    ...parsedServers,
                    ...parsedCameras,
                    ...parsedWebPages,
                    ...layoutsForTree.reduce(
                        (acc, layout) => ({ ...acc, [layout.details.id]: layout }),
                        {},
                    ),
                }).reduce((newObject, [id, value]) => {
                    newObject[dirtyId(id)] = value;
                    return newObject;
                }, {});

                const serversForTree = Object.values(parsedServers).sort(byName);

                const camerasForTree = Object.values(parsedCameras)
                    .sort(byName)
                    .filter(
                        ({ type }) =>
                            this.CONFIG.featureFlags.layoutsIoDevices ||
                            type !== ResourceType.IO_DEVICE,
                    );

                const webPagesForTree = Object.values(parsedWebPages).sort(byName);

                return {
                    tree: [
                        {
                            name: 'Layouts',
                            type: ResourceType.LAYOUTS,
                            children: layoutsForTree,
                        },
                        (this.CONFIG.featureFlags.layoutsServers ||
                            this.CONFIG.featureFlags.layoutsDemo) && {
                            name: 'Servers',
                            type: ResourceType.SERVERS,
                            children: serversForTree.map(server => ({
                                ...server,
                                children: [],
                                // children: camerasForTree.filter(({ details: { parentId } }) => parentId === server.details.id)
                            })),
                        },
                        {
                            name: 'Cameras',
                            type: ResourceType.CAMERAS,
                            children: camerasForTree,
                        },
                        (this.CONFIG.featureFlags.layoutsWebpages ||
                            this.CONFIG.featureFlags.layoutsDemo) && {
                            name: 'Web Pages',
                            type: ResourceType.WEB_PAGES,
                            children: webPagesForTree,
                        },
                    ].filter(item => !!item),
                    ...parsedResources,
                };
            },
        ),
        filter(lookup => !!lookup),
        shareReplay({
            bufferSize: 1,
            refCount: false,
        }),
        untilDestroyed(this),
    );

    availableLayouts$: Observable<Layouts> = this.store
        .select(SharedLayoutsSelectors.selectLayouts)
        .pipe(
            map(layouts =>
                layouts
                    .filter(({ layoutType }) => layoutType === LayoutTypes.LOCAL)
                    .map(({ layout }) => layout as Layout)
                    .sort(alphabeticalSort(this.locale, layout => layout.name)),
            ),
            shareReplay({
                bufferSize: 1,
                refCount: false,
            }),
            untilDestroyed(this),
        );

    availableLayoutsDropdown$ = this.availableLayouts$.pipe(
        map(layouts => layouts.map(this.layoutToDropdown)),
        untilDestroyed(this),
    );

    #defaultLayout$: Observable<string> = this.layoutItemLookup$.pipe(
        switchMap(async ({ tree }) => {
            const layout = tree
                .find(({ type }) => type === ResourceType.LAYOUTS)
                .children.find(
                    ({ details }: ResourceNode<Layout>) => details?.items.length,
                ) as ResourceNode<Layout>;
            const camera = tree
                .find(({ type }) => type === ResourceType.CAMERAS)
                .children.shift() as ResourceNode<NxSystemCamera>;
            const layoutId = cleanId((layout || camera)?.details?.id);
            const queryParams = this.activatedRoute.snapshot.queryParams;
            if (layoutId) {
                await this.router.navigate(
                    [`${this.router.url.split('layouts')[0]}layouts/${layoutId}`],
                    { queryParams },
                );
            }
            return layoutId || '';
        }),
        distinctUntilChanged(),
    );

    #layoutId$ = this.store.select(ActiveLayoutSelectors.selectActiveLayoutState).pipe(
        filter(layoutId => !!layoutId),
        switchMap(layoutId =>
            this.CONFIG.featureFlags.layoutsEditable || layoutId !== 'new'
                ? Promise.resolve(layoutId.replace('new', ''))
                : this.#defaultLayout$,
        ),
        switchMap(async layoutId => {
            const queryParams = { ...this.activatedRoute.snapshot.queryParams };
            if (typeof queryParams.openNodes === 'string') {
                queryParams.openNodes = [queryParams.openNodes];
            }
            queryParams.openNodes ||= [];
            if (layoutId && !queryParams.openNodes.includes(layoutId)) {
                queryParams.openNodes.push(layoutId);
                await this.router.navigate(
                    [`${this.router.url.split('layouts')[0]}layouts/${layoutId}`],
                    { queryParams },
                );
            }

            const systemName = this.systemService.getCurrentSystem().info.name;

            this.pageService.pageTitle(
                [staticLang.pageTitles.layouts, systemName, this.CONFIG.cloudName].join(' - '),
            );

            return layoutId;
        }),
    );

    #selectedLayout$ = combineLatest([
        this.selectedSystem$,
        this.#layoutId$,
        this.availableLayouts$,
    ]).pipe(
        switchMap(async ([system, layoutId, layouts]): Promise<Layout> => {
            if (layoutId && system.mediaserver instanceof NxSystemRestAPI) {
                const existingLayout = layouts.find(({ id }) => cleanId(id) === layoutId);
                if (existingLayout) {
                    return { systemId: system.id, ...existingLayout };
                }
            }
            return layoutId
                ? this.createFocusLayout(system.id, layoutId).catch(() =>
                      this.createNewLayout(system.id),
                  )
                : this.createNewLayout(system.id);
        }),
        shareReplay({
            bufferSize: 1,
            refCount: false,
        }),
        untilDestroyed(this),
    );

    #fetchingLayout$: Subject<'fetching'> = new Subject();

    selectedLayout$: Observable<Layout> = merge(this.#selectedLayout$, this.#fetchingLayout$).pipe(
        map(current => (current === 'fetching' ? null : current)),
        filter(layout => !!layout),
        shareReplay({
            bufferSize: 1,
            refCount: false,
        }),
        untilDestroyed(this),
    );

    layoutAndItems$ = combineLatest([this.selectedLayout$, this.layoutItemLookup$]).pipe(
        shareReplay({
            bufferSize: 1,
            refCount: false,
        }),
        untilDestroyed(this),
    );

    cameras$ = this.layoutAndItems$.pipe(
        map(([{ items }, lookup]) =>
            uniq(
                items
                    .filter(({ resourceId }) => lookup[resourceId]?.type === 'camera')
                    .map(({ resourceId }) => resourceId)
                    .sort(),
            ),
        ),
        untilDestroyed(this),
    );

    // recordedTimes$ = this.selectedLayout$.pipe(
    //     switchMap(() =>
    //         concat(
    //             Promise.resolve(null),
    //             combineLatest([this.cameras$, this.selectedSystem$]).pipe(
    //                 switchMap(([cameras, system]) =>
    //                     system.cameraManager.getRecordedTimes(cameras),
    //                 ),
    //             ),
    //         ),
    //     ),
    //     untilDestroyed(this),
    // );

    constructor(
        private accountService: NxAccountService,
        private activatedRoute: ActivatedRoute,
        private cd: ChangeDetectorRef,
        private cloudApi: NxCloudApiService,
        configService: NxConfigService,
        private dialogsService: NxDialogsService,
        layoutGridService: NxLayoutGridService,
        // private location: Location,
        @Inject(LOCALE_ID) private locale: string,
        private pageService: NxPageService,
        private router: Router,
        private systemService: NxSystemService,
        private tourService: TourService,
        private translate: TranslateService,
        private store: Store,
        public layoutStateService: LayoutStateService,
    ) {
        this.CONFIG = configService.config;

        layoutGridService.addResource
            .pipe(untilDestroyed(this))
            .subscribe(async (event: AddResourceType) => {
                await this.handleAddingResource(event);
            });
        layoutGridService.editResource
            .pipe(untilDestroyed(this))
            .subscribe(async (event: EditResourceType) => {
                await this.handleEditingResource(event);
            });
        layoutGridService.removeResource
            .pipe(untilDestroyed(this))
            .subscribe(async (event: RemoveResourceType) => {
                await this.handleRemovingResource(event);
            });

        /**
         * TODO: Need to find a better way to sync state from routes.
         */
        this.startSync();
    }

    /** Store Sync Actions: We'll need to find a better way to handle updating the active layout */
    updateActiveLayout$ = this.observeParam('layoutId').pipe(
        map(layoutId => ActiveLayoutActions.set({ id: layoutId })),
    );

    updateLayouts$ = this.selectedSystem$.pipe(
        switchMap(async system => {
            const layouts = await firstValueFrom(
                (system.mediaserver as NxSystemRestAPI).getLayouts(),
            );
            return LocalLayoutsActions.set({ layouts });
        }),
    );

    private observeParam(param: string): Observable<string> {
        return this.activatedRoute.params.pipe(
            map(params => params[param]),
            distinctUntilChanged(),
        );
    }

    startSync(): void {
        merge(this.updateActiveLayout$, this.updateLayouts$)
            .pipe(untilDestroyed(this))
            .subscribe(action => this.store.dispatch(action));
    }

    /** End Store Sync Actions */

    ngOnInit(): void {
        // this.layoutAndItems$
        //     .pipe(
        //         filter(([layout, items]) => layout && !!items),
        //         take(1),
        //         delay(100),
        //         untilDestroyed(this),
        //     )
        //     .subscribe(() => this.initTour());

        this.selectedSystem$
            .pipe(untilDestroyed(this))
            .subscribe(system =>
                this.pageService.pageTitle(
                    [staticLang.pageTitles.layouts, system.info.name, this.CONFIG.cloudName].join(
                        ' - ',
                    ),
                ),
            );
    }

    initTour = (tourGroup: CloudLayoutTours = CloudLayoutTours.DEFAULT): void => {
        if (!this.CONFIG.featureFlags.layoutsTour && !this.CONFIG.featureFlags.layoutsDemo) {
            return;
        }
        this.tourService.initialize(
            generateTour('cloud-layouts')(cloudLayoutTours[tourGroup]).map(
                translateStep((...args) =>
                    new NxTranslatePipe(this.translate, this.cd).transform(...args),
                ),
            ),
        );
        this.cloudApi
            .checkFeatureNotice('cloudLayouts', () =>
                this.dialogsService.cloudLayoutsInfo().then(start => {
                    if (start) {
                        this.tourService.start();
                    }
                    if (start !== false) {
                        return Promise.reject();
                    }
                }),
            )
            .toPromise();
    };

    changeLayout(layout: string | DropdownItem<string>): void {
        const layoutId = typeof layout === 'string' ? cleanId(layout) : layout.value;
        const queryParams = this.activatedRoute.snapshot.queryParams;
        this.router.navigate([`${this.router.url.split('layouts')[0]}layouts/${layoutId}`], {
            queryParams,
        });
        if (layoutId) {
            this.#fetchingLayout$.next('fetching');
            WebRTCStreamManager.updatePosition();
            this.ptzControlTarget = null;
        }
    }

    layoutToDropdown({ name, id }: Resource): DropdownItem<string> {
        return { name, value: cleanId(id) };
    }

    createNewLayout = (
        systemId: string,
        parentId = '',
        name = this.LANG.layouts.helpMessages.unsaved.title,
        items: LayoutItem[] = [],
    ): Layout => ({
        backgroundHeight: -1,
        backgroundImageFilename: '',
        backgroundOpacity: 0.699999988079071,
        backgroundWidth: -1,
        cellAspectRatio: 0,
        cellSpacing: 0.01,
        fixedHeight: 0,
        fixedWidth: 0,
        id: null,
        items,
        locked: !this.CONFIG.featureFlags.layoutsEditable && !this.CONFIG.featureFlags.layoutsDemo,
        logicalId: 0,
        name,
        systemId,
        parentId: parentId || this.accountService.account.id,
    });

    createFocusLayout = async (systemId: string, id: string): Promise<Layout> => {
        const layoutItems = await firstValueFrom(this.layoutItemLookup$);
        const { details } = layoutItems[`{${id}}`] || {};

        if (!details) {
            // Redirect to 404 if no layout or device found.
            // await this.pageService.redirect404();
        }

        const rotation = details.parameters?.rotation ?? 0;
        const rotatedAspect = Boolean(rotation % 180);
        const aspect = details.parameters?.overrideAr || details.defaultRatio;
        const cellAspectRatio = rotatedAspect ? 1 / aspect : aspect;
        return {
            backgroundHeight: -1,
            backgroundImageFilename: '',
            backgroundOpacity: 0.699999988079071,
            backgroundWidth: -1,
            cellAspectRatio,
            cellSpacing: 0.0001,
            fixedHeight: 0,
            fixedWidth: 0,
            id,
            items: [
                {
                    bottom: 1,
                    contrastParams: {
                        blackLevel: 0.001,
                        enabled: false,
                        gamma: 1,
                        whiteLevel: 0.0005,
                    },
                    controlPtz: false,
                    dewarpingParams: {
                        enabled: false,
                        fov: 1.2217304763960306,
                        panoFactor: 1,
                        xAngle: 0,
                        yAngle: 0,
                    },
                    displayAnalyticsObjects: false,
                    displayInfo: false,
                    displayRoi: false,
                    flags: 1,
                    id: `{${id}}`,
                    left: 0,
                    resourceId: `{${id}}`,
                    resourcePath: '',
                    right: 1,
                    rotation,
                    top: 0,
                    zoomBottom: 0,
                    zoomLeft: 0,
                    zoomRight: 0,
                    zoomTargetId: '{00000000-0000-0000-0000-000000000000}',
                    zoomTop: 0,
                },
            ],
            locked:
                !this.CONFIG.featureFlags.layoutsEditable && !this.CONFIG.featureFlags.layoutsDemo,
            logicalId: 0,
            name: 'Focus View',
            systemId,
            parentId: this.accountService.account.id,
        };
    };

    updateLayout = (layoutId: string): Promise<string> => {
        this.changeLayout(layoutId);

        return firstValueFrom(
            this.#selectedLayout$.pipe(
                map(({ id }) => id),
                filter(id => id === layoutId),
            ),
        );
    };

    handleRemovingResource = async ({ details: { id } }: RemoveResourceType): Promise<unknown> =>
        firstValueFrom(
            this.layoutItemLookup$.pipe(
                switchMap(items => {
                    const { title, message, footer } = this.LANG.layouts.removeItem;
                    return this.dialogsService.confirm({
                        title,
                        message: { value: message, params: items[id as string] },
                        footer,
                    });
                }),
                switchMap(res => res && this.selectedSystem$),
                switchMap(
                    (system: NxSystem) =>
                        system &&
                        (system.mediaserver as NxSystemRestAPI).deleteLayout(id as string),
                ),
            ),
        );

    handleEditingResource = async ({ resourceType, details }: EditResourceType): Promise<boolean> =>
        this.dialogsService.edit({
            contextManifest: editManifests[resourceType],
            values: details,
            deleteProcess: (details: Record<string, unknown>) =>
                this.handleRemovingResource({ resourceType, details }).catch(() =>
                    this.handleEditingResource({ resourceType, details }),
                ),
            handlerProcess: ({ type: _, ...values }: Layout & { type: ResourceType }) =>
                values.name && values.id
                    ? firstValueFrom(
                          this.selectedSystem$.pipe(
                              // Find better abstraction if/when we allow adding other resource types
                              switchMap(({ mediaserver }) =>
                                  (mediaserver as NxSystemRestAPI).putLayout(values.id, values),
                              ),
                              map(({ id }) => id),
                              switchMap(this.updateLayout),
                              catchError(err =>
                                  Promise.reject({
                                      errors: { unhandled: [err.error.errorString] },
                                  }),
                              ),
                          ),
                      )
                    : Promise.reject({
                          errors: { name: [this.LANG.layouts.actions.errors.required] },
                      }),
        });

    handleAddingResource = async (resourceType: AddResourceType): Promise<boolean> =>
        this.dialogsService.edit({
            contextManifest: createManifests[resourceType],
            handlerProcess: ({ name }: Record<string, unknown>) =>
                name
                    ? firstValueFrom(
                          combineLatest([
                              this.selectedSystem$,
                              this.selectedLayout$,
                              this.layoutItemLookup$,
                          ]).pipe(
                              filter((vals: [NxSystem, Layout, LayoutResourceTree]) =>
                                  vals.every(val => !!val),
                              ),
                              take(1),
                              // Find better abstraction if/when we allow adding other resource types
                              switchMap(([{ id, mediaserver }, layout, resourceTree]) =>
                                  (mediaserver as NxSystemRestAPI).createLayout(
                                      omit(
                                          this.createNewLayout(
                                              id,
                                              '',
                                              name as string,
                                              resourceTree[layout.id] ? [] : layout.items,
                                          ),
                                          ['id', 'systemId'],
                                      ),
                                  ),
                              ),
                              map(({ id }) => id),
                              switchMap(this.updateLayout),
                              catchError(err =>
                                  Promise.reject({
                                      errors: { unhandled: [err.error.errorString] },
                                  }),
                              ),
                          ),
                      )
                    : Promise.reject({
                          errors: { name: [this.LANG.layouts.actions.errors.required] },
                      }),
        });
}
