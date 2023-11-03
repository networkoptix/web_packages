import { CdkDrag, CdkDragPreview, CdkDropList } from '@angular/cdk/drag-drop';
import { CdkContextMenuTrigger, CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ConnectedPosition } from '@angular/cdk/overlay';
import { NestedTreeControl } from '@angular/cdk/tree';
import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    effect,
    Inject,
    Input,
    signal,
    TemplateRef,
    ViewChild,
    WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { cloneDeep } from 'lodash-es';
import { TourMatMenuModule, TourService } from 'ngx-ui-tour-md-menu';
import { BehaviorSubject, Observable, Subject, combineLatest, of, timer } from 'rxjs';
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
    MenuItemsOrMenuItemsCallback,
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
    Point,
    ResourceNode,
    ResourceNodeMap,
    ResourceType,
    ServerStats,
    ServerStatsObservable,
} from '@components/layout-grid/layout-grid.types';
import { NxMatLikeInputComponent } from '@components/mat-like-components/mat-like-input/input.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSearchComponent } from '@components/search/search.component';
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
import { nxConfig } from '@services/nx-config/config';
import { IConfig } from '@services/nx-config/config-types';
import { MutationType } from '@services/param-state/param-state.types';
import { Layout, LayoutItem } from '@services/system-api.types';
import { NxSystem } from '@services/system.service/system';
import { WINDOW } from '@services/window-provider';
import { icons } from '@static-variables';
import { cleanId, dirtyId } from '@utils/general';
import { NgChanges } from '@utils/ng-changes';

type GridBoundary = Pick<LayoutItem, 'top' | 'left' | 'bottom' | 'right'>;

const filterSearch = <DataType extends ResourceNode, QueryType extends string>(
    dataSource: DataType[],
    query: QueryType,
    valueGetter: (item: DataType) => QueryType,
    childrenGetter: (item: DataType) => DataType[],
    showNodeFn: (item: DataType, matched: boolean) => boolean = (_, matched) => matched,
    compareFn: (query: QueryType, value: QueryType) => boolean = (query, value) =>
        value.toLowerCase().includes(query.toString().toLowerCase()),
): DataType[] => {
    return query
        ? cloneDeep(dataSource).map(node => {
              node.children = node.children?.map(node => ({
                  ...node,
                  hidden: !node.name.toLowerCase().includes(query.toLowerCase()),
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
        if (cleanId(item.details?.id) === cleanId(id)) {
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

const enum Direction {
    RIGHT = 0,
    DOWN = 1,
    LEFT = 2,
    UP = 3,
}

function* openSpotGenerator(existingItems: LayoutItem[], origin: Point): Generator<Point> {
    const hasCollision = ({ x, y }: Point): boolean =>
        existingItems.some(
            ({ top, bottom, left, right }) =>
                left < x + 1 && right > x && top < y + 1 && bottom > y,
        );

    let x = 0;
    let y = 0;
    let layer = 1;
    let leg: Direction = Direction.RIGHT;

    while (true) {
        const point = { x: x + origin.x, y: y + origin.y };

        if (!hasCollision(point)) {
            yield point;
        }

        switch (leg) {
            case Direction.RIGHT:
                x++;
                if (x === layer) {
                    leg++;
                }
                break;
            case Direction.DOWN:
                y++;
                if (y === layer) {
                    leg++;
                }
                break;
            case Direction.LEFT:
                x--;
                if (-x === layer) {
                    leg++;
                }
                break;
            case Direction.UP:
                y--;
                if (-y === layer) {
                    leg = 0;
                    layer++;
                }
                break;
        }
    }
}

const createAddedItems = (currentItems: LayoutItem[], itemsToAdd: LayoutItem[]): LayoutItem[] => {
    const updateBoundary = (
        { top, left, bottom, right }: GridBoundary,
        item: LayoutItem,
    ): GridBoundary => ({
        top: Math.max(top, item.top),
        left: Math.min(left, item.left),
        bottom: Math.min(bottom, item.bottom),
        right: Math.max(right, item.right),
    });

    const gridBoundary: GridBoundary = currentItems.length
        ? currentItems.reduce(updateBoundary, {
              top: -Infinity,
              left: Infinity,
              bottom: Infinity,
              right: -Infinity,
          })
        : {
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
          };

    const origin = {
        x: Math.round((gridBoundary.left + gridBoundary.right - 2) / 2),
        y: Math.round((gridBoundary.top + gridBoundary.bottom - 2) / 2),
    };

    const mappedItems: LayoutItem[] = [];

    for (const { x, y } of openSpotGenerator(currentItems, origin)) {
        const position = { top: y, left: x, bottom: y + 1, right: x + 1 };
        mappedItems.push({ ...itemsToAdd[mappedItems.length], ...position, id: uuid() });
        if (mappedItems.length >= itemsToAdd.length) {
            break;
        }
    }

    return [...currentItems, ...mappedItems];
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
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './layout-grid-tree.component.html',
    styleUrls: ['./layout-grid-tree.component.scss'],
})
export class NxLayoutGridTreeComponent {
    @Input() layout: Layout;
    @Input() system: NxSystem;
    @Input() dataSource: BaseResourceNode[];
    layoutItemLookup$$ = signal<LayoutResourceTree | null>(null);
    @Input() set layoutItemLookup(value: LayoutResourceTree) {
        this.layoutItemLookup$$.set(value);
    }
    @Input() treeControl: NestedTreeControl<ResourceNode, string>;
    @Input() errorIcons: Record<string, string>;
    @Input() dragging: boolean;
    @Input() showTooltip$: Observable<boolean>;
    @Input() changingLayout: string | boolean = true;

    @ViewChild('currentItemContext') set currentItemContext(value: TemplateRef<unknown>) {
        this.layoutStateService.contextMenu = value;
    }

    currentNode: ResourceNode;

    query$ = this.layoutStateService.paramStateHandler.state$.pipe(
        map(({ queryParams: { search } }) => search?.[0] || ''),
        distinctUntilChanged(),
        shareReplay({ bufferSize: 1, refCount: false }),
    );

    initialDataSource$ = new BehaviorSubject<BaseResourceNode[]>([]);

    lastQuery = '';

    dataSource$ = combineLatest([this.query$, this.initialDataSource$]).pipe(
        // Filter here
        tap(([query]) => {
            if (query) {
                this.dataSource.forEach(node => this.treeControl.expand(node));
            } else if (!query && this.lastQuery) {
                this.treeControl.collapseAll();
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
            ),
        ),
    );

    // This will be added to an ngrx store as some kind of ephemeral state that will handle any actions where only a single type can be active at a type. Probably action types would be 'renaming', 'adding', 'dialogShown'.
    editedLayout$$: WritableSignal<string | null> = signal(null);

    icons = icons;
    positions: ConnectedPosition[] = NxContextMenu.POSITIONS.default;
    forceVisible = '';

    dragDisabled: Record<ResourceType, boolean> = [
        ResourceType.LAYOUTS,
        ResourceType.CAMERAS,
        ResourceType.SERVERS,
        ResourceType.WEB_PAGES,
    ].reduce((acc, type) => ({ ...acc, [type]: true }), {} as Record<ResourceType, boolean>);

    ServerStats: ServerStats;
    LANG = staticLang;
    ACTIONS = staticLang.layouts.treeActions;
    CONFIG: IConfig = nxConfig;
    playable: string[] = ['online', 'recording', 'scheduled'];
    readonly RESOURCE_TYPE = ResourceType;

    constructor(
        public layoutGridService: NxLayoutGridService,
        public layoutStateService: LayoutStateService,
        private router: Router,
        public tourService: TourService,
        @Inject(WINDOW) public window: Window,
    ) {
        if (this.CONFIG.featureFlags.layoutsTimeline) {
            this.playable.push('archive');
        }
        effect(() => {
            const findNode = (nodes: ResourceNode[], id: string): ResourceNode | undefined => {
                for (const node of nodes) {
                    if (cleanId(node.details?.id) === cleanId(id)) {
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

        let foundNode = findNode(this.dataSource, this.layout.id);

        openNodes.forEach(id => {
            const node = findNode(this.dataSource, id);
            if (node && !findNode(node.children, foundNode?.details?.id || '')) {
                this.treeControl.expand(node);
            }
        });

        while (foundNode) {
            this.treeControl.expand(foundNode);
            foundNode = foundNode.parent;
        }
    };

    cleanId = cleanId;

    readonly OPEN_WINDOW_ACTIONS = [
        {
            id: 'openNewTab',
            name: this.ACTIONS.openNewTab.name,
            action: ($event, node) => this.openWindow(node.details.id, false),
        },
        {
            id: 'openNewWindow',
            name: this.ACTIONS.openNewWindow.name,
            action: ($event, node) => this.openWindow(node.details.id, true),
        },
    ];

    getLayoutEditActions = (
        node: ResourceNodeMap[ResourceType.LAYOUT],
    ): [] | MenuItem<ResourceNodeMap[ResourceType.LAYOUT]>[] => {
        if (node.locked) {
            return [];
        }

        return (
            [
                {
                    id: 'divider',
                    name: 'divider',
                },
                node.owned && {
                    id: 'startRename',
                    name: this.ACTIONS.rename.name,
                    action: () => this.editedLayout$$.set(node.details.id),
                },
                {
                    id: 'duplicate',
                    name: this.ACTIONS.duplicate.name,
                    action: () =>
                        this.layoutStateService.duplicateLayoutAsNewLocalLayout(node.details),
                },
                node.owned && {
                    id: 'delete',
                    name: this.ACTIONS.delete.name,
                    action: () => this.layoutStateService.deleteLayout(node.details.id),
                },
            ] as MenuItem<ResourceNodeMap[ResourceType.LAYOUT]>[]
        ).filter(Boolean);
    };

    getLayoutUpdateActions = (
        node: ResourceNodeMap[ResourceType.LAYOUT],
    ): MenuItem<ResourceNodeMap[ResourceType.LAYOUT]>[] => {
        const unsaved = this.layoutStateService.unsavedLayoutsIds$$();
        if (
            !node.owned ||
            !this.CONFIG.featureFlags.layoutsEditable ||
            (unsaved && !unsaved[node.details.id])
        ) {
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
                    ? this.ACTIONS.publishChanges.name
                    : this.ACTIONS.saveChanges.name,
                action: () => this.layoutStateService.saveLayout(node.details.id),
            },
            {
                id: 'discard',
                name: this.ACTIONS.discardChanges.name,
                action: () => this.layoutStateService.discardUnsavedLayout(node.details.id),
            },
        ];
    };

    doubleClick$ = new Subject<true>();

    handleSingleClick = (node: ResourceNode): void => {
        if (node.type) {
            of(node)
                .pipe(delay(250), takeUntil(this.doubleClick$))
                .subscribe(node => this.layoutGridService.changeView.next(node));
        }
    };

    createLayoutItem = (id: string): LayoutItem => {
        let rotation = 0;
        const resourceId = dirtyId(id);
        const unknownItem = this.layoutItemLookup$$()?.[resourceId];

        if (assertResourceOfType.camera(unknownItem)) {
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
            displayAnalyticsObjects: false,
            displayInfo: false,
            displayRoi: false,
            flags: 1,
            id: uuid(),
            left: 0,
            resourceId,
            resourcePath: '',
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
        if (!this.CONFIG.featureFlags.layoutsEditable) {
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

        if (
            (!currentUser.isAdmin && currentUser.id !== this.layout.parentId) ||
            this.layout.locked ||
            focusView
        ) {
            if (focusView) {
                this.layoutStateService.createNewLocalLayout(updatedLayout.items);
            } else {
                this.layoutStateService.duplicateLayoutAsNewLocalLayout(updatedLayout);
            }
        } else {
            this.layoutStateService.updateLayout(updatedLayout);
        }
    };

    getLayoutShareActions = (
        node: ResourceNodeMap[ResourceType.LAYOUT],
    ): MenuItem<ResourceNodeMap[ResourceType.LAYOUT]>[] => {
        if (!node.owned || node.locked || !this.CONFIG.featureFlags.layoutsEditable) {
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
                      name: this.ACTIONS.unshareLayout.name,
                      action: () => this.layoutStateService.unshareLayout(node.details),
                  }
                : {
                      id: 'shareLayout',
                      name: this.ACTIONS.shareLayout.name,
                      action: () => this.layoutStateService.shareLayout(node.details),
                  },
        ];
    };

    getLayoutLockActions = (
        node: ResourceNodeMap[ResourceType.LAYOUT],
    ): MenuItem<ResourceNodeMap[ResourceType.LAYOUT]>[] => {
        if (!node.owned || !this.CONFIG.featureFlags.layoutsEditable) {
            return [];
        }

        return !node.locked
            ? [
                  {
                      id: 'lockLayout',
                      name: this.ACTIONS.lockLayout.name,
                      action: () => this.layoutStateService.lockLayout(node.details),
                  },
              ]
            : [
                  {
                      id: 'divider',
                      name: 'divider',
                  },
                  {
                      id: 'unlockLayout',
                      name: this.ACTIONS.unlockLayout.name,
                      action: () => this.layoutStateService.unlockLayout(node.details),
                  },
              ];
    };

    menuItemsByType: Partial<{
        [key in keyof ResourceNodeMap]: MenuItemsOrMenuItemsCallback<ResourceNodeMap[key]>;
    }> = {
        [ResourceType.LAYOUTS]: this.CONFIG.featureFlags.layoutsEditable
            ? [
                  {
                      id: 'create',
                      name: this.ACTIONS.create.name,
                      tooltip: this.ACTIONS.create.tooltip,
                      action: ($event, node) => {
                          $event.preventDefault();
                          const newLayout = this.layoutStateService.createNewLocalLayout();
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
                                  this.editedLayout$$.set(dirtyId(newLayout));
                              });
                      },
                  },
              ]
            : [],
        [ResourceType.LAYOUT]: node =>
            [
                ...this.OPEN_WINDOW_ACTIONS,
                ...this.getLayoutEditActions(node),
                ...this.getLayoutUpdateActions(node),
                ...this.getLayoutShareActions(node),
                ...this.getLayoutLockActions(node),
            ].filter(Boolean),
        [ResourceType.CAMERA]: [
            ...this.OPEN_WINDOW_ACTIONS,
            ...([] ||
                (this.CONFIG.featureFlags.layoutsEditable &&
                    this.CONFIG.featureFlags.layoutsDeviceSettings && [
                        {
                            id: 'divider',
                            name: 'divider',
                        },
                        {
                            id: 'settings',
                            name: this.ACTIONS.cameraSettings.name,
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
                (this.CONFIG.featureFlags.layoutsEditable &&
                    this.CONFIG.featureFlags.layoutsDeviceSettings && [
                        {
                            id: 'divider',
                            name: 'divider',
                        },
                        {
                            id: 'settings',
                            name: this.ACTIONS.serverSettings.name,
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
    };

    openWindow = (id: string, isNewWindow = false): void => {
        const params = [`${this.router.url.split('layouts')[0]}layouts/${cleanId(id)}`, '_blank'];
        if (isNewWindow) {
            params.push('"width=100%, height=100%"');
        }

        this.window.open(...params);
    };

    toggleNode = (node: ResourceNode): void => {
        const nodeId = node.details?.id;
        if (!nodeId) {
            return;
        }

        this.layoutStateService.paramStateHandler.updater(() => {
            this.treeControl.toggle(node);
            const nodeOpened = this.treeControl.isExpanded(node);
            return {
                queryParams: {
                    openNodes: {
                        value: [nodeId],
                        mutationType: nodeOpened ? MutationType.APPEND : MutationType.REMOVE,
                    },
                },
            };
        });
    };

    handleRename = (node: ResourceNode): void => {
        this.editedLayout$$.set(null);
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
    );
}
