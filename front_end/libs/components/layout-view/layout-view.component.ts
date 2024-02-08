// import { Location } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { cloneDeep } from 'lodash-es';
import { TourService } from 'ngx-ui-tour-md-menu';
import { combineLatest, firstValueFrom, forkJoin, merge, Observable, Subject, timer } from 'rxjs';
import {
    catchError,
    distinctUntilChanged,
    filter,
    map,
    shareReplay,
    skip,
    startWith,
    switchMap,
    tap,
    timeout,
} from 'rxjs/operators';

import type { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { assertResourceOfType } from '@components/layout-grid/layout-grid.type-guards';
import {
    LayoutResourceTree,
    ResourceNode,
    ResourceType,
    SharableResourceLeafNode,
} from '@components/layout-grid/layout-grid.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import staticLang from '@language_static';
import { WebRTCStreamManager } from '@openLibs/webrtc-stream-manager';
import { NxTranslatePipe } from '@pipes/nx-translate.pipe';
import { NxAccountService } from '@services/account.service';
import { NxLayoutGridService } from '@services/layout-grid/layout-grid.service';
import { LayoutStateService } from '@services/layout-state/layout-state.service';
import { ActiveLayoutSelectors } from '@services/layout-state/store/active-layout';
import { SharedLayoutsSelectors } from '@services/layout-state/store/shared';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { nxConfig } from '@services/nx-config/config';
import { NxPageService } from '@services/page.service';
import { Layout, LayoutItem } from '@services/system-api.types/layouts.types';
import { NxSystemRestAPI } from '@services/system-rest-api.service';
import { CurrentUser } from '@services/system-user.types';
import { NxSystemCamera } from '@services/system.service/camera-manager/camera-manager-types';
import { NxSystemService } from '@services/system.service/system.service';
import { NxSystemsService } from '@services/systems.service';
import { NxSystemInfo } from '@services/systems.service.types';
import { SystemResourcesSelectors } from '@store/system-resources';
import { SystemResourceTypeEnums } from '@store/system-resources/system-resources.types';
import { cleanIdLegacy, dirtyId, extractVideoLayout } from '@utils/general';
import { generateTour, translateStep } from '@utils/nx';

import {
    parseCameras,
    parseOtherSystems,
    parseServers,
    parseWebPages,
    sortByName,
    generateCamerasForTree,
} from './layout-view-utils';
import { registerDemoLogger } from './timeline-service-demo';

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

@UntilDestroy()
@Component({
    selector: 'nx-layout-view',
    templateUrl: 'layout-view.component.html',
    styleUrls: ['layout-view.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [NxLayoutGridService],
})
export class NxLayoutViewComponent {
    LANG = staticLang;
    CONFIG = nxConfig;
    ptzControlTarget: NxSystemCamera;

    selectedSystem$ = this.systemService.currentSystem$;

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
        untilDestroyed(this),
    );

    layoutItemLookup$ = this.systemService.currentSystem$.pipe(
        switchMap(system =>
            forkJoin([
                this.layoutStateService.loadUnsavedLayouts(system.id),
                this.layoutStateService.loadCrossSystemLayouts(),
            ]).pipe(map(() => system)),
        ),
        switchMap(({ permissionManager, id }) => {
            return combineLatest([
                // Update this to fetch system resources for all systems
                this.store.select(SystemResourcesSelectors.selectResourceValuesAllSystems),
                Promise.resolve(id),
                this.#selectedLayout$.pipe(startWith(null)),
                this.store.select(SharedLayoutsSelectors.selectLayouts),
                new Promise<CurrentUser>(resolve => resolve(permissionManager.currentUser$$())),
                nxConfig.featureFlags.layoutsCrossSystemEditing
                    ? this.systemsService.systemsSubject
                    : Promise.resolve([] as NxSystemInfo[]),
            ]);
        }),
        filter(([resources]) => Object.values(resources).every(Boolean)),
        map(cloneDeep),
        filter(([allSystemResources, currentSystemId]) => !!allSystemResources[currentSystemId]),
        switchMap(lookupState =>
            this.layoutStateService.paramStateHandler.state$.pipe(
                map(({ queryParams }) => ({
                    hasQuery: !!queryParams?.search?.[0],
                    openNodes: queryParams?.openNodes || [],
                })),
                map(search => [...lookupState, search] as const),
            ),
        ),
        map(
            ([
                allSystemResources,
                currentSystemId,
                currentLayout,
                layouts,
                currentUser,
                otherSystemsInfo,
                queryInfo,
            ]): LayoutResourceTree => {
                const { [currentSystemId]: currentSystem, ...otherSystems } = allSystemResources;
                const loadedSystems = Object.keys(allSystemResources);
                const { cameras = [], servers = [], webPages = [] } = currentSystem;
                const {
                    cameras: otherSystemsCameras,
                    servers: otherSystemsServers,
                    webPages: OtherSystemsWebPages,
                } = Object.values(otherSystems).reduce(
                    (allResources, currentSystemResources) => {
                        Object.entries(currentSystemResources).forEach(
                            ([resourceType, resources]) =>
                                allResources[resourceType]?.push(...resources),
                        );
                        return allResources;
                    },
                    { cameras: [], servers: [], webPages: [] } as Omit<
                        typeof currentSystem,
                        SystemResourceTypeEnums.LAYOUTS
                    >,
                );
                const aspectRatio = currentLayout?.cellAspectRatio || 0;

                const parsedCameras = parseCameras(cameras, servers, this.useV2api, aspectRatio);

                const parsedServers = parseServers(servers, aspectRatio);

                const parsedWebPages = parseWebPages(webPages, aspectRatio);

                const parsedOtherSystemsCameras = parseCameras(
                    otherSystemsCameras,
                    otherSystemsServers,
                    false,
                    aspectRatio,
                );

                const parsedOtherSystemsServers = parseServers(otherSystemsServers, aspectRatio);
                const parsedOtherSystemsWebPages = parseWebPages(OtherSystemsWebPages, aspectRatio);

                const parsedOtherSystems = parseOtherSystems(
                    otherSystemsInfo.filter(({ id }) => id !== currentSystemId),
                    otherSystemsCameras,
                    otherSystemsServers,
                    aspectRatio,
                    loadedSystems,
                    queryInfo.hasQuery,
                    queryInfo.openNodes,
                );

                const layoutsForTree = layouts
                    .filter(layout => layout.id && layout.id !== 'new')
                    .filter(
                        layout =>
                            !layout.parentId ||
                            [currentUser?.id, '{00000000-0000-0000-0000-000000000000}'].includes(
                                layout.parentId,
                            ),
                    )
                    .map(
                        details =>
                            ({
                                id: details.id,
                                type: ResourceType.LAYOUT,
                                name: details.name,
                                owned:
                                    !details.parentId ||
                                    currentUser?.id === details.parentId ||
                                    currentUser?.isAdmin,
                                shared:
                                    details.parentId === '{00000000-0000-0000-0000-000000000000}',
                                crossSystem: !details.parentId,
                                locked: details.locked,
                                details,
                            }) as SharableResourceLeafNode<Layout>,
                    )
                    .sort((a, b) => (a.shared === b.shared ? sortByName(a, b) : a.shared ? -1 : 1));

                const parsedResources = Object.entries({
                    ...parsedOtherSystems,
                    ...parsedOtherSystemsCameras,
                    ...parsedOtherSystemsServers,
                    ...parsedOtherSystemsWebPages,
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

                const serversForTree = Object.values(parsedServers).sort(sortByName);

                const camerasForTree = generateCamerasForTree(parsedCameras);

                const webPagesForTree = Object.values(parsedWebPages).sort(sortByName);

                const otherSystemsForTree = Object.values(parsedOtherSystems).sort(sortByName);

                return {
                    tree: [
                        {
                            name: staticLang.layouts.titles.resourceTypes[ResourceType.LAYOUTS],
                            details: { id: ResourceType.LAYOUTS },
                            type: ResourceType.LAYOUTS,
                            children: layoutsForTree,
                        },
                        (nxConfig.featureFlags.layoutsServers ||
                            nxConfig.featureFlags.layoutsDemo) && {
                            name: staticLang.layouts.titles.resourceTypes[ResourceType.SERVERS],
                            details: { id: ResourceType.SERVERS },
                            type: ResourceType.SERVERS,
                            children: serversForTree.map(server => ({
                                ...server,
                                children: [],
                                // children: camerasForTree.filter(({ details: { parentId } }) => parentId === server.details.id)
                            })),
                        },
                        {
                            name: staticLang.layouts.titles.resourceTypes[ResourceType.CAMERAS],
                            details: { id: ResourceType.CAMERAS },
                            type: ResourceType.CAMERAS,
                            children: camerasForTree,
                        },
                        (nxConfig.featureFlags.layoutsWebpages ||
                            nxConfig.featureFlags.layoutsDemo) && {
                            name: staticLang.layouts.titles.resourceTypes[ResourceType.WEB_PAGES],
                            details: { id: ResourceType.WEB_PAGES },
                            type: ResourceType.WEB_PAGES,
                            children: webPagesForTree,
                        },
                    ].filter(item => !!item),
                    otherSystems: otherSystemsInfo.length && otherSystemsForTree,
                    ...parsedResources,
                } as unknown as LayoutResourceTree;
            },
        ),
        filter(lookup => !!lookup),
        shareReplay({
            bufferSize: 1,
            refCount: false,
        }),
    );

    #defaultLayout$: Observable<string> = this.layoutItemLookup$.pipe(
        switchMap(async ({ tree }) => {
            const layout = tree
                .find(assertResourceOfType.layouts)
                .children.find(
                    ({ details }: ResourceNode<Layout>) => details?.items.length,
                ) as ResourceNode<Layout>;
            const camera = tree
                .find(assertResourceOfType.cameras)
                .children.shift() as ResourceNode<NxSystemCamera>;
            const layoutId = cleanIdLegacy((layout || camera)?.details?.id);
            if (layoutId) {
                await this.layoutStateService.paramStateHandler.state$$.set({
                    params: { layoutId },
                });
            }
            return layoutId || '';
        }),
        distinctUntilChanged(),
        untilDestroyed(this),
    );

    #layoutId$ = this.store.select(ActiveLayoutSelectors.selectActiveLayoutState).pipe(
        filter(layoutId => !!layoutId),
        switchMap(layoutId =>
            layoutId === 'default' ? this.#defaultLayout$ : Promise.resolve(layoutId),
        ),
        switchMap(async layoutId => {
            if (layoutId) {
                await this.layoutStateService.paramStateHandler.state$$.set({
                    params: { layoutId },
                });
            }

            const systemName = this.systemService.getCurrentSystem().info.name;

            this.pageService.pageTitle(
                [staticLang.pageTitles.layouts, systemName, this.CONFIG.cloudName].join(' - '),
            );

            return layoutId;
        }),
        untilDestroyed(this),
    );

    #selectedLayout$ = combineLatest([
        this.selectedSystem$,
        this.#layoutId$,
        this.store.select(SharedLayoutsSelectors.selectLayouts),
        this.selectedSystem$.pipe(
            switchMap(({ id }) =>
                this.store.select(SystemResourcesSelectors.selectResourcesValuesBySystemId(id)),
            ),
        ),
    ]).pipe(
        switchMap(async ([system, layoutId, layouts, layoutItems]): Promise<Layout> => {
            if (layoutId && system.mediaserver instanceof NxSystemRestAPI) {
                const existingLayout = layouts.find(({ id }) => cleanIdLegacy(id) === layoutId);
                const isResourceId = Object.values(layoutItems).some(
                    items => items?.some(({ id }) => id === layoutId),
                );

                // Prevent showing a layout that was accidentally saved with the same ID as a resource.
                if (existingLayout && !isResourceId) {
                    return { systemId: system.id, ...existingLayout };
                }
            }
            return layoutId
                ? this.createFocusLayout(system.id, layoutId).catch(() =>
                      this.createNewLayout(system.id),
                  )
                : this.createNewLayout(system.id);
        }),
        switchMap(layout =>
            timer(layout ? 0 : 2500).pipe(map(() => layout || this.createNewLayout('show404'))),
        ),
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
        map(cloneDeep),
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

    constructor(
        private accountService: NxAccountService,
        private cd: ChangeDetectorRef,
        private cloudApi: NxCloudApiService,
        private dialogsService: NxDialogsService,
        layoutGridService: NxLayoutGridService,
        // private location: Location,
        private pageService: NxPageService,
        private systemService: NxSystemService,
        private systemsService: NxSystemsService,
        private tourService: TourService,
        private translate: TranslateService,
        private store: Store,
        public layoutStateService: LayoutStateService,
    ) {
        registerDemoLogger(this);
    }

    ngOnInit(): void {
        this.selectedSystem$
            .pipe(untilDestroyed(this))
            .subscribe(system =>
                this.pageService.pageTitle(
                    [staticLang.pageTitles.layouts, system.info.name, this.CONFIG.cloudName].join(
                        ' - ',
                    ),
                ),
            );
        this.#selectedLayout$
            .pipe(
                switchMap(layout => timer(layout ? 0 : 2500).pipe(map(() => layout))),
                untilDestroyed(this),
            )
            .subscribe(layout => !layout && this.pageService.redirect404());
    }

    initTour = (tourGroup: CloudLayoutTours = CloudLayoutTours.DEFAULT): void => {
        if (!nxConfig.featureFlags.layoutsTour && !nxConfig.featureFlags.layoutsDemo) {
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
        const layoutId = typeof layout === 'string' ? cleanIdLegacy(layout) : layout.value;
        this.layoutStateService.paramStateHandler.state$$.set({ params: { layoutId } });
        if (layoutId) {
            this.#fetchingLayout$.next('fetching');
            WebRTCStreamManager.updatePosition();
            this.ptzControlTarget = null;
        }
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
        locked: !nxConfig.featureFlags.layoutsEditable && !nxConfig.featureFlags.layoutsDemo,
        logicalId: 0,
        name,
        systemId,
        parentId: parentId || this.accountService.account.id,
    });

    createFocusLayout = async (systemId: string, id: string): Promise<Layout> => {
        const node = await firstValueFrom(
            merge(
                this.layoutItemLookup$.pipe(
                    map(layoutItems => layoutItems[dirtyId(id)]),
                    filter(Boolean),
                ),
                this.#selectedLayout$.pipe(
                    skip(1),
                    map(() => 'cancel'),
                ),
            ).pipe(timeout({ first: 1000, with: () => Promise.resolve(false as const) })),
        );

        if (typeof node === 'string' || !node) {
            return;
        }

        let rotation = 0;
        let rotatedAspect = false;
        let aspect = 0;
        let bottom = 1;
        let right = 1;

        if (assertResourceOfType.camera(node)) {
            rotation = node.details.parameters?.rotation ?? 0;
            rotatedAspect = Boolean(rotation % 180);
            if (node.details.parameters?.VideoLayout) {
                const { height, width } = extractVideoLayout(node.details.parameters.VideoLayout);
                aspect = node.details.defaultRatio;
                bottom = rotatedAspect ? width : height;
                right = rotatedAspect ? height : width;
            } else {
                aspect = node.details.parameters?.overrideAr || node.details.defaultRatio;
            }
        }

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
                    bottom,
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
                    resourcePath: `cloud://${
                        'systemId' in node.details ? node.details.systemId : systemId
                    }.${node.details.id}`,
                    right,
                    rotation: rotation || 0,
                    top: 0,
                    zoomBottom: 0,
                    zoomLeft: 0,
                    zoomRight: 0,
                    zoomTargetId: '{00000000-0000-0000-0000-000000000000}',
                    zoomTop: 0,
                },
            ],
            locked: !nxConfig.featureFlags.layoutsEditable && !nxConfig.featureFlags.layoutsDemo,
            logicalId: 0,
            name: this.layoutStateService.focusViewToken,
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
}
