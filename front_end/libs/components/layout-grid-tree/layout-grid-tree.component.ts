import { CdkDrag, CdkDragPreview, CdkDropList } from '@angular/cdk/drag-drop';
import { CdkContextMenuTrigger, CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition } from '@angular/cdk/overlay';
import { NestedTreeControl } from '@angular/cdk/tree';
import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    Input,
    signal,
    TemplateRef,
    ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { cloneDeep, isEqual } from 'lodash-es';
import { TourMatMenuModule, TourService } from 'ngx-ui-tour-md-menu';
import { BehaviorSubject, Subject, combineLatest, of, timer, firstValueFrom } from 'rxjs';
import {
    delay,
    distinctUntilChanged,
    filter,
    map,
    shareReplay,
    startWith,
    switchMap,
    take,
    takeUntil,
    tap,
} from 'rxjs/operators';
import { v4 as uuid } from 'uuid';

import { NxContextMenu } from '@components/context-menu/context-menu';
import {
    MenuItem,
    BaseMenuItem,
    MenuItemsOrMenuItemsFactory,
} from '@components/context-menu/context-menu.types';
import { EditableModule } from '@components/editable/editable.module';
import {
    assertResourceOfType,
    assertResourceParentNode,
} from '@components/layout-grid/layout-grid.type-guards';
import {
    BaseResourceNode,
    LayoutResourceTree,
    MergedResourceNode,
    ResourceNode,
    ResourceNodeMap,
    ResourceType,
    ServerStats,
    ServerStatsObservable,
} from '@components/layout-grid/layout-grid.types';
import { NxMatLikeInputComponent } from '@components/mat-like-components/mat-like-input/input.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSearchComponent } from '@components/search/search.component';
import { SearchParamBindings } from '@components/search/search.component.types';
import { NxSearchHighlightComponent } from '@components/search-highlight/search-highlight.component';
import { NxTagComponent } from '@components/tag/tag.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxForceVisibilityDirective } from '@directives/nx-force-visibility.directive';
import { NxTooltipDirective } from '@directives/nx-tooltip.directive';
import staticLang from '@language_static';
import { MenuModule } from '@menu/menu.module';
import { NxImageComponent } from '@pages/health/table-components/image/image.component';
import { NxCamerasComponent } from '@pages/systems/settings/cameras/cameras.component';
import { NxSystemServersComponent } from '@pages/systems/settings/servers/servers.component';
import { PipesModule } from '@pipes/pipes.module';
import { NxLayoutGridService } from '@services/layout-grid/layout-grid.service';
import { LayoutStateService } from '@services/layout-state/layout-state.service';
import { selectLayoutResolution } from '@services/layout-state/store/layouts-resolution/resolution.selectors';
import { Resolution } from '@services/layout-state/store/layouts-resolution/resolution.types';
import { LocalLayoutsSelectors } from '@services/layout-state/store/local-layouts';
import { createAddedItems } from '@services/layout-state/store/utils/create-added-items';
import { nxConfig } from '@services/nx-config/config';
import { MutationType } from '@services/param-state/param-state.types';
import { Layout, LayoutItem } from '@services/system-api.types/layouts.types';
import { NxSystem } from '@services/system.service/system';
import { NxSystemsService } from '@services/systems.service';
import { icons } from '@static-variables';
import { cleanIdLegacy, dirtyId } from '@utils/general';
import { hasCrossSystemItems } from '@utils/has-cross-system-items';
import { NgChanges } from '@utils/ng-changes';

const filterSearch = <DataType extends ResourceNode, QueryType extends string>(
    dataSource: DataType[],
    query: QueryType,
    valueGetter: (item: DataType) => QueryType,
    childrenGetter: (item: DataType) => DataType[],
    showNodeFn: (item: DataType, matched: boolean) => boolean = (_, matched) => matched,
    filter = false,
    compareFn: (query: QueryType, value: QueryType) => boolean = (query, value) =>
        value.toLowerCase().includes(query.toString().toLowerCase()),
): DataType[] => {
    return query
        ? cloneDeep(dataSource).map(node => {
              node.children = node.children?.map(node => ({
                  ...node,
                  hidden:
                      !filter &&
                      !node.name.toLowerCase().includes(query.toLowerCase()) &&
                      node.details.id !== 'noResults',
              }));
              node.hidden = node.children?.every(node => node.hidden);
              if (node.hidden) {
                  node.children?.push({
                      name: staticLang.search.noMatches,
                      details: { id: 'noResults' },
                      type: null,
                      aspectRatio: 0,
                  });
              }
              return node;
          })
        : dataSource;
};

const findNode = (
    items: ResourceNode[],
    id: string,
    parent: ReturnType<typeof findNode> = null,
): (ResourceNode & { parent: ResourceNode }) | undefined => {
    if (!items) {
        return;
    }

    for (const item of items) {
        if (cleanIdLegacy(item.details?.id) === cleanIdLegacy(id)) {
            return { ...item, parent };
        }

        if ('children' in item) {
            const child = findNode(item.children as MergedResourceNode[], id, item);
            if (child) {
                return child;
            }
        }
    }
};

@UntilDestroy()
@Component({
    selector: 'nx-layout-grid-tree',
    standalone: true,
    imports: [
        AngularSvgIconModule,
        CdkDrag,
        CdkDropList,
        CdkMenu,
        CdkMenuTrigger,
        CommonModule,
        NxImageComponent,
        NxPreLoaderComponent,
        PipesModule,
        TourMatMenuModule,
        TranslateModule,
        CdkMenuItem,
        CdkContextMenuTrigger,
        NxMatLikeInputComponent,
        FormsModule,
        EditableModule,
        NxTagComponent,
        MatDividerModule,
        MenuModule,
        NxContextMenu,
        NxAddSvgSrcDirective,
        NxTooltipDirective,
        NxForceVisibilityDirective,
        NxSearchComponent,
        NxSearchHighlightComponent,
        CdkDragPreview,
        CdkConnectedOverlay,
        CdkOverlayOrigin,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './layout-grid-tree.component.html',
    styleUrls: ['./layout-grid-tree.component.scss'],
})
export class NxLayoutGridTreeComponent {
    @Input() searchType?: 'query' | 'filter' = 'query';
    @Input() layout: Layout;
    @Input() system: NxSystem;
    @Input() dataSource: BaseResourceNode[];
    @Input() linkedDataSource?: BaseResourceNode[];
    layoutItemLookup$$ = signal<LayoutResourceTree | null>(null);
    @Input() set layoutItemLookup(value: LayoutResourceTree) {
        this.layoutItemLookup$$.set(value);
    }
    @Input() treeControl: NestedTreeControl<ResourceNode, string>;
    @Input() errorIcons: Record<string, string>;
    @Input() dragging: boolean;
    @Input() showTooltip: boolean;
    @Input() changingLayout: string | boolean = true;
    @Input() suggestedSearch: string[] = [];

    @ViewChild('currentItemContext') set currentItemContext(value: TemplateRef<unknown>) {
        this.layoutStateService.contextMenu = value;
    }

    CONFIG = nxConfig;

    currentNode: ResourceNode;

    query$ = this.layoutStateService.paramStateHandler.state$.pipe(
        map(({ queryParams }) => {
            const query = queryParams?.search?.[0] || '';
            if (this.searchType === 'filter' && queryParams.otherSitesFilter?.length) {
                // TODO: Update search highlight component to handle array of string
                // return [query, ...queryParams.otherSitesFilter];
                return queryParams.otherSitesFilter[0];
            }

            return query;
        }),
        distinctUntilChanged((a, b) => isEqual(a, b)),
        shareReplay({ bufferSize: 1, refCount: false }),
        untilDestroyed(this),
    );

    initialDataSource$ = new BehaviorSubject<BaseResourceNode[]>([]);

    lastQuery = '';

    dataSource$ = combineLatest([this.query$, this.initialDataSource$]).pipe(
        // Filter here
        tap(([query, nodes]) => {
            if (query) {
                if (this.searchType !== 'filter') {
                    [...this.dataSource, ...(this.linkedDataSource || [])].forEach(node =>
                        this.treeControl.expand(node),
                    );
                } else if (!this.lastQuery) {
                    nodes.forEach(node => this.treeControl.collapse(node));
                }
            } else if (!query && this.lastQuery) {
                if (this.searchType !== 'filter') {
                    this.treeControl.collapseAll();
                }
                this.expandNodesFromParams();
            }
            this.lastQuery = query;
        }),
        map(([query, dataSource]) =>
            filterSearch(
                dataSource as ResourceNode[],
                query,
                node => node.name,
                node => node.children || [],
                (node, matched) => matched || !!node.children?.length,
                this.searchType === 'filter',
            ),
        ),
        switchMap(dataSource =>
            this.searchType !== 'filter'
                ? Promise.resolve(dataSource)
                : this.layoutStateService.paramStateHandler.state$.pipe(
                      map(({ queryParams }) => queryParams.search?.[0]),
                      map(query => {
                          if (query) {
                              return filterSearch(
                                  dataSource,
                                  query,
                                  node => node.name,
                                  node => node.children || [],
                                  (node, matched) => matched || !!node.children?.length,
                              );
                          }
                          return dataSource;
                      }),
                  ),
        ),
        untilDestroyed(this),
    );

    icons = icons;
    positions: ConnectedPosition[] = NxContextMenu.POSITIONS.default;
    forceVisible = '';

    dragDisabled: Record<ResourceType, boolean> = [
        ResourceType.LAYOUTS,
        ResourceType.CAMERAS,
        ResourceType.SERVERS,
        ResourceType.WEB_PAGES,
        ResourceType.SYSTEM,
        ResourceType.OTHER_SYSTEMS,
        // Disable group drag for now.
        // In general, it should be possible to drop all cameras from a group to the layout.
        // It should also be possible to drag and drop a camera into a group
        ResourceType.CAMERAS_GROUP,
    ].reduce((acc, type) => ({ ...acc, [type]: true }), {} as Record<ResourceType, boolean>);

    ServerStats: ServerStats;
    LANG = staticLang;
    ACTIONS_LANG = staticLang.layouts.treeActions;
    playable: string[] = ['online', 'recording', 'scheduled'];
    readonly RESOURCE_TYPE = ResourceType;

    constructor(
        public layoutGridService: NxLayoutGridService,
        public layoutStateService: LayoutStateService,
        private router: Router,
        private store: Store,
        public tourService: TourService,
        private systemsService: NxSystemsService,
    ) {
        if (nxConfig.featureFlags.layoutsTimeline) {
            this.playable.push('archive');
        }
        effect(() => {
            const findNode = (nodes: ResourceNode[], id: string): ResourceNode | undefined => {
                for (const node of nodes) {
                    if (cleanIdLegacy(node.details?.id) === cleanIdLegacy(id)) {
                        return node;
                    }

                    const childNode = node.children && findNode(node.children, id);
                    if (childNode) {
                        return childNode;
                    }
                }
            };

            const { params: { layoutId } = { layoutId: null } } =
                this.layoutStateService.paramStateHandler.state$$();
            const { tree = null } = this.layoutItemLookup$$() || {};
            if (layoutId && tree) {
                this.currentNode = findNode(tree, layoutId);
            }
        });
    }

    ngOnChanges({ dataSource }: NgChanges<NxLayoutGridTreeComponent>): void {
        if (dataSource) {
            this.initialDataSource$.next(dataSource.currentValue);
        }
    }

    ngOnInit(): void {
        this.expandNodesFromParams();
    }

    preventDrop = (): boolean => false;

    expandNodesFromParams = (): void => {
        const { queryParams: { openNodes = [] } = { openNodes: [] } } =
            this.layoutStateService.paramStateHandler.state$$();

        const dataSource = [...this.dataSource, ...(this.linkedDataSource || [])];

        let foundNode = findNode(dataSource, this.layout.id);

        openNodes.forEach(id => {
            const node = findNode(dataSource, id);
            if (node && !findNode(node.children, foundNode?.details?.id || '')) {
                this.treeControl.expand(node);
            }
        });

        while (foundNode) {
            this.treeControl.expand(foundNode);
            foundNode = foundNode.parent;
        }
    };

    cleanIdLegacy = cleanIdLegacy;

    readonly OPEN_WINDOW_ACTIONS = [
        {
            id: 'openNewTab',
            name: this.ACTIONS_LANG.openNewTab.name,
            action: ($event, node) => this.openWindow(node.details.id, false),
        },
        {
            id: 'openNewWindow',
            name: this.ACTIONS_LANG.openNewWindow.name,
            action: ($event, node) => this.openWindow(node.details.id, true),
        },
    ];

    getLayoutResolutionActions = (
        node: ResourceNodeMap[ResourceType.LAYOUT],
    ): [] | MenuItem<ResourceNodeMap[ResourceType.LAYOUT]>[] =>
        (
            [
                {
                    id: 'divider',
                    name: 'divider',
                },
                {
                    id: 'resolution',
                    name: this.ACTIONS_LANG.resolution.name,
                    subMenu: async (node: ResourceNodeMap[ResourceType.LAYOUT]) => {
                        const menuItems = [
                            {
                                resolution: Resolution.AUTO,
                                lang: this.ACTIONS_LANG.resolutionAuto,
                            },
                            {
                                resolution: Resolution.LOW,
                                lang: this.ACTIONS_LANG.resolutionLow,
                            },
                            {
                                resolution: Resolution.HIGH,
                                lang: this.ACTIONS_LANG.resolutionHigh,
                            },
                            {
                                resolution: Resolution.CUSTOM,
                                lang: this.ACTIONS_LANG.resolutionCustom,
                            },
                        ];

                        const layoutResolution = await firstValueFrom(
                            this.store.select(selectLayoutResolution(node.details.id)),
                        );

                        return menuItems.reduce(
                            (menu: MenuItem<ResourceNodeMap[ResourceType.LAYOUT]>[], menuItem) => {
                                if (
                                    menuItem.resolution !== layoutResolution &&
                                    menuItem.resolution === Resolution.CUSTOM
                                ) {
                                    return menu;
                                }

                                menu.push({
                                    id: menuItem.resolution,
                                    ...menuItem.lang,
                                    checked$$: signal(menuItem.resolution === layoutResolution),
                                    action: () => {
                                        this.layoutStateService.setLayoutResolution({
                                            layoutId: node.details.id,
                                            resolution: menuItem.resolution,
                                        });
                                    },
                                });
                                return menu;
                            },
                            [],
                        );
                    },
                },
            ] as MenuItem<ResourceNodeMap[ResourceType.LAYOUT]>[]
        ).filter(Boolean);

    getLayoutEditActions = (
        node: ResourceNodeMap[ResourceType.LAYOUT],
    ): [] | MenuItem<ResourceNodeMap[ResourceType.LAYOUT]>[] => {
        if (!nxConfig.featureFlags.layoutsEditable) {
            return [];
        }

        return (
            [
                {
                    id: 'divider',
                    name: 'divider',
                },
                node.owned &&
                    !node.locked && {
                        id: 'startRename',
                        name: this.ACTIONS_LANG.rename.name,
                        action: () => this.layoutStateService.editedLayout$$.set(node.details),
                    },
                {
                    id: 'duplicate',
                    name: this.ACTIONS_LANG.duplicate.name,
                    action: () => this.layoutStateService.duplicateAsNewLayout(node.details),
                },
                node.owned &&
                    !node.locked && {
                        id: 'delete',
                        name: this.ACTIONS_LANG.delete.name,
                        action: () => this.layoutStateService.deleteLayout(node.details.id),
                    },
            ] as MenuItem<ResourceNodeMap[ResourceType.LAYOUT]>[]
        ).filter(Boolean);
    };

    getLayoutUpdateActions = (
        node: ResourceNodeMap[ResourceType.LAYOUT],
    ): MenuItem<ResourceNodeMap[ResourceType.LAYOUT]>[] => {
        const disabled$$ = signal(
            !this.layoutStateService.unsavedLayoutsIds$$()?.[node.details.id],
        );
        if (!node.owned || node.locked || !nxConfig.featureFlags.layoutsEditable) {
            return [];
        }

        return [
            {
                id: 'divider',
                name: 'divider',
            },
            {
                id: 'save',
                name: node.shared
                    ? this.ACTIONS_LANG.publishChanges.name
                    : this.ACTIONS_LANG.saveChanges.name,
                disabled$$,
                action: () => this.layoutStateService.saveLayout(node.details.id),
            },
            {
                id: 'discard',
                name: this.ACTIONS_LANG.discardChanges.name,
                disabled$$,
                action: () => this.layoutStateService.discardUnsavedLayout(node.details.id),
            },
        ];
    };

    doubleClick$ = new Subject<true>();

    handleSingleClick = (node: ResourceNode, parent: ResourceNode): void => {
        const parentId = parent?.details?.id;
        if (node.type) {
            of(node)
                .pipe(delay(250), takeUntil(this.doubleClick$))
                .subscribe(node => this.layoutGridService.changeView.next(node));
        } else if (parentId && node.name === staticLang.layouts.otherSystems.searchCameras) {
            this.layoutStateService.paramStateHandler.updater(() => ({
                queryParams: {
                    openNodes: {
                        value: [parentId],
                        mutationType: MutationType.APPEND,
                    },
                },
            }));
        }
    };

    createLayoutItem = (id: string): LayoutItem => {
        let rotation = 0;
        const resourceId = dirtyId(id);
        const unknownItem = this.layoutItemLookup$$()?.[resourceId];
        const resourcePath = `cloud://${
            unknownItem && 'systemId' in unknownItem.details
                ? unknownItem.details.systemId
                : this.system.id
        }.${id}`;

        if (unknownItem && assertResourceOfType.camera(unknownItem)) {
            rotation = unknownItem.details.parameters?.rotation ?? 0;
        }

        return {
            bottom: 0,
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
            name: unknownItem?.details.name,
            displayAnalyticsObjects: false,
            displayInfo: false,
            displayRoi: false,
            flags: 1,
            id: uuid(),
            left: 0,
            resourceId,
            resourcePath,
            right: 0,
            rotation,
            top: 0,
            zoomBottom: 0,
            zoomLeft: 0,
            zoomRight: 0,
            zoomTargetId: '{00000000-0000-0000-0000-000000000000}',
            zoomTop: 0,
        };
    };

    handleDoubleClick = (node: ResourceNode): void => {
        if (
            !nxConfig.featureFlags.layoutsEditable ||
            this.layout.locked ||
            node.details?.id === this.layout.id
        ) {
            return;
        }
        this.doubleClick$.next(true);
        const itemsToAdd = assertResourceOfType.layout(node)
            ? node.details.items
            : [dirtyId(node.details?.id || '')].map(this.createLayoutItem);

        if (!itemsToAdd.length) {
            return;
        }
        const updatedLayout = {
            ...this.layout,
            items: createAddedItems(this.layout.items, itemsToAdd),
        };
        const currentUser = this.system.permissionManager.currentUser$$();

        const focusView = this.layout.name === this.layoutStateService.focusViewToken;

        const crossSystemItemsAdded =
            this.layout.systemId && hasCrossSystemItems(updatedLayout.items, this.layout.systemId);

        if (
            (!currentUser.isAdmin && currentUser.id !== this.layout.parentId) ||
            this.layout.locked ||
            focusView ||
            crossSystemItemsAdded
        ) {
            if (focusView) {
                this.layoutStateService.createNewLayout(updatedLayout.items);
            } else {
                this.layoutStateService.duplicateAsNewLayout(updatedLayout);
            }
        } else {
            this.layoutStateService.updateLayout(updatedLayout);
        }
    };

    getLayoutShareActions = (
        node: ResourceNodeMap[ResourceType.LAYOUT],
    ): MenuItem<ResourceNodeMap[ResourceType.LAYOUT]>[] => {
        if (node.crossSystem || !node.owned || node.locked || !nxConfig.featureFlags.layoutsShare) {
            return [];
        }

        return [
            {
                id: 'divider',
                name: 'divider',
            },
            node.shared
                ? {
                      id: 'unshareLayout',
                      name: this.ACTIONS_LANG.unshareLayout.name,
                      action: () => this.layoutStateService.unshareLayout(node.details),
                  }
                : {
                      id: 'shareLayout',
                      name: this.ACTIONS_LANG.shareLayout.name,
                      action: () => this.layoutStateService.shareLayout(node.details),
                  },
        ];
    };

    getLayoutLockActions = (
        node: ResourceNodeMap[ResourceType.LAYOUT],
    ): MenuItem<ResourceNodeMap[ResourceType.LAYOUT]>[] => {
        if (!node.owned || !nxConfig.featureFlags.layoutsEditable) {
            return [];
        }

        return [
            {
                id: 'divider',
                name: 'divider',
            },
            node.locked
                ? {
                      id: 'unlockLayout',
                      name: this.ACTIONS_LANG.unlockLayout.name,
                      action: () => this.layoutStateService.unlockLayout(node.details),
                  }
                : {
                      id: 'lockLayout',
                      name: this.ACTIONS_LANG.lockLayout.name,
                      action: () => this.layoutStateService.lockLayout(node.details),
                  },
        ];
    };

    getFullScreenActions = (
        node: ResourceNodeMap[ResourceType.LAYOUT],
    ): MenuItem<ResourceNodeMap[ResourceType.LAYOUT]>[] => {
        return node.details.id === this.layout.id
            ? [
                  {
                      id: 'divider',
                      name: 'divider',
                  },
                  {
                      id: 'toggleFullScreen',
                      name: document.fullscreenElement
                          ? this.ACTIONS_LANG.exitFullScreen.name
                          : this.ACTIONS_LANG.openFullScreen.name,
                      action: () => this.layoutStateService.toggleLayoutFullScreen(),
                  },
              ]
            : [];
    };

    menuItemsByType: Partial<{
        [key in keyof ResourceNodeMap]:
            | MenuItemsOrMenuItemsFactory<ResourceNodeMap[key]>
            | {
                  [Property in keyof { tree: string; scene: string }]: MenuItemsOrMenuItemsFactory<
                      ResourceNodeMap[key]
                  >;
              };
    }> = {
        [ResourceType.LAYOUTS]: nxConfig.featureFlags.layoutsEditable
            ? [
                  {
                      id: 'create',
                      name: this.ACTIONS_LANG.create.name,
                      tooltip: this.ACTIONS_LANG.create.tooltip,
                      action: ($event, node) => {
                          $event.preventDefault();
                          $event.stopPropagation();
                          const newLayout = this.layoutStateService.createNewLayout();
                          this.dataSource$
                              .pipe(
                                  map(dataSource => findNode(dataSource, newLayout)),
                                  filter(Boolean),
                                  take(1),
                                  untilDestroyed(this),
                              )
                              .subscribe(node => {
                                  const layoutsNode = this.dataSource.find(
                                      ({ type }) => type === ResourceType.LAYOUTS,
                                  );

                                  if (layoutsNode) {
                                      this.treeControl.expand(layoutsNode);
                                  }
                                  this.layoutStateService.editedLayout$$.set({
                                      id: dirtyId(newLayout),
                                      isNew: true,
                                  });
                              });
                      },
                  },
              ]
            : [],
        [ResourceType.LAYOUT]: {
            tree: node =>
                [
                    ...this.OPEN_WINDOW_ACTIONS,
                    ...this.getLayoutEditActions(node),
                    ...this.getLayoutUpdateActions(node),
                    ...this.getLayoutLockActions(node),
                    ...this.getLayoutShareActions(node),
                ].filter(Boolean),
            scene: node =>
                [
                    ...this.OPEN_WINDOW_ACTIONS,
                    ...this.getLayoutEditActions(node).filter(
                        (menu: BaseMenuItem) => menu.id !== 'startRename',
                    ),
                    ...this.getLayoutUpdateActions(node),
                    ...this.getLayoutLockActions(node),
                    ...this.getFullScreenActions(node),
                    ...this.getLayoutResolutionActions(node),
                ].filter(Boolean),
        },
        [ResourceType.CAMERA]: [
            ...this.OPEN_WINDOW_ACTIONS,
            ...([] ||
                (nxConfig.featureFlags.layoutsEditable &&
                    nxConfig.featureFlags.layoutsDeviceSettings && [
                        {
                            id: 'divider',
                            name: 'divider',
                        },
                        {
                            id: 'settings',
                            name: this.ACTIONS_LANG.cameraSettings.name,
                            action: ($event, node) =>
                                this.layoutStateService.createPortal(NxCamerasComponent, {
                                    system: this.system,
                                    camera: node.details,
                                }),
                        },
                    ])),
        ].filter(Boolean),
        [ResourceType.SERVER]: [
            ...this.OPEN_WINDOW_ACTIONS,
            ...([] ||
                (nxConfig.featureFlags.layoutsEditable &&
                    nxConfig.featureFlags.layoutsDeviceSettings && [
                        {
                            id: 'divider',
                            name: 'divider',
                        },
                        {
                            id: 'settings',
                            name: this.ACTIONS_LANG.serverSettings.name,
                            action: ($event, node) =>
                                this.layoutStateService.createPortal(NxSystemServersComponent, {
                                    system: this.system,
                                    server: this.system.serverManager.servers.find(({ id }) =>
                                        id.includes(node.details.id),
                                    ),
                                }),
                        },
                    ])),
        ].filter(Boolean),
        [ResourceType.SYSTEM]: (node: ResourceNodeMap[ResourceType.SYSTEM]) =>
            [
                {
                    id: 'connectToSystem',
                    name: this.ACTIONS_LANG.connectToSystem.name,
                    tooltip: this.ACTIONS_LANG.connectToSystem.tooltip,
                    disabled$$: computed(() => {
                        const systems = this.systemsService.systems$$() || [];
                        const system = systems.find(({ id }) => id === node.details.id);
                        return system?.stateOfHealth !== 'online';
                    }),
                    action: ($event, node) => {
                        const isSystemLayout = !!this.store
                            .selectSignal(LocalLayoutsSelectors.selectLocalLayoutsState)()
                            .find(({ id }) => id === this.layout.id);
                        this.layoutStateService.paramStateHandler.state$$.update(({ params }) => ({
                            params: {
                                systemId: node.details.id,
                                layoutId: isSystemLayout || !params ? 'default' : params.layoutId,
                            },
                        }));
                    },
                },
            ].filter(Boolean),
    };

    treeMenuItems = Object.entries(this.menuItemsByType).reduce((acc, [type, value]) => {
        acc[type] = value && 'tree' in value ? value.tree : value;
        return acc;
    }, {});

    sceneMenuItems = Object.entries(this.menuItemsByType).reduce((acc, [type, value]) => {
        acc[type] = value && 'scene' in value ? value.scene : value;
        return acc;
    }, {});

    openWindow = (id: string, isNewWindow = false): void => {
        const params = [
            `${this.router.url.split('layouts')[0]}layouts/${cleanIdLegacy(id)}`,
            '_blank',
        ];
        if (isNewWindow) {
            params.push('"width=100%, height=100%"');
        }

        window.open(...params);
    };

    toggleNode = (node: ResourceNode, event: MouseEvent): void => {
        const nodeId = node.details?.id;
        if (!nodeId) {
            return;
        }

        const element = event.target as HTMLElement;
        const parent = element.parentElement;

        const nameClicked = [element?.textContent, parent?.textContent].includes(node.name);

        this.layoutStateService.paramStateHandler.updater(() => {
            this.treeControl.toggle(node);
            const nodeOpened = this.treeControl.isExpanded(node);

            const otherSitesFilter =
                node.type === ResourceType.SYSTEM && nameClicked
                    ? {
                          [SearchParamBindings.OTHER_SITES_FILTER]: node.name,
                      }
                    : {};

            return {
                queryParams: {
                    ...otherSitesFilter,
                    openNodes: {
                        value: [nodeId],
                        mutationType: nodeOpened ? MutationType.APPEND : MutationType.REMOVE,
                    },
                },
            };
        });
    };

    handleRename = (node: ResourceNode): void => {
        this.layoutStateService.editedLayout$$.set(null);
        const layout = node.details as Layout;

        if (node.name === layout.name) {
            return;
        }

        this.layoutStateService.updateLayout({
            ...layout,
            name: node.name,
        });
    };

    nodeId = (_: number, node: ResourceNode): string => node.details?.id || node.type;

    hasChild = (_: number, node: ResourceNode): boolean => assertResourceParentNode(node);

    tooltipTarget$ = new BehaviorSubject<string>('');
    unsubTooltip$ = new Subject<string>();

    updateTooltipTarget = (id: string): void => this.tooltipTarget$.next(id);

    unsubTooltips = (): void => this.unsubTooltip$.next('unsub');

    serverStats$: ServerStatsObservable = this.tooltipTarget$.pipe(
        filter(id => !!id),
        distinctUntilChanged(),
        switchMap(serverId =>
            timer(0, 1000).pipe(
                // switchMap(() => this.system.serverManager.initSystemMediaServers()),
                switchMap(() => this.system.serverManager.getStatistics(serverId)),
                map(({ reply, errorString: error }) => ({
                    error,
                    statistics: reply.statistics?.map(({ description, value }) => ({
                        description,
                        value: `${(value * 100).toFixed(2)}%`,
                    })),
                })),
                startWith(null),
                untilDestroyed(this),
                takeUntil(this.unsubTooltip$),
            ),
        ),
        untilDestroyed(this),
    );
}
