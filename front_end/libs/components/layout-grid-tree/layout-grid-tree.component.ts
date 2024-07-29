import { CdkDrag, CdkDragPreview, CdkDropList } from '@angular/cdk/drag-drop';
import { CdkContextMenuTrigger, CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition } from '@angular/cdk/overlay';
import { NestedTreeControl } from '@angular/cdk/tree';
import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    effect,
    input,
    Input,
    TemplateRef,
    ViewChild,
    booleanAttribute,
    Output,
    viewChild,
    ElementRef,
    inject,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { TourMatMenuModule, TourService } from 'ngx-ui-tour-md-menu';
import { BehaviorSubject, Observable, Subject, of, timer } from 'rxjs';
import {
    debounceTime,
    delay,
    distinctUntilChanged,
    filter,
    map,
    startWith,
    switchMap,
    takeUntil,
} from 'rxjs/operators';

import { NxContextMenu } from '@components/context-menu/context-menu';
import { EditableModule } from '@components/editable/editable.module';
import {
    assertResourceLeafNode,
    assertResourceOfType,
    assertResourceParentNode,
} from '@components/layout-grid/layout-grid.type-guards';
import {
    BaseResourceNode,
    LayoutResourceTree,
    ResourceNode,
    ResourceType,
    ServerStats,
    ServerStatsObservable,
} from '@components/layout-grid/layout-grid.types';
import { NxLayoutGridTreeNode } from '@components/layout-grid-tree-node/layout-grid-tree-node.component';
import { NxMatLikeInputComponent } from '@components/mat-like-components/mat-like-input/input.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSearchComponent } from '@components/search/search.component';
import { NxSearchHighlightComponent } from '@components/search-highlight/search-highlight.component';
import { NxLinesLoaderComponent } from '@components/skeleton-loader/variants/lines-loader/lines-loader.component';
import { NxTagComponent } from '@components/tag/tag.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxForceVisibilityDirective } from '@directives/nx-force-visibility.directive';
import { NxTooltipDirective } from '@directives/nx-tooltip.directive';
import staticLang from '@language_static';
import { MenuModule } from '@menu/menu.module';
import { NxImageComponent } from '@pages/health/table-components/image/image.component';
import { PipesModule } from '@pipes/pipes.module';
import { NxAccountService } from '@services/account.service';
import { NxLayoutGridService } from '@services/layout-grid/layout-grid.service';
import { LayoutStateService } from '@services/layout-state/layout-state.service';
import { createAddedItems } from '@services/layout-state/store/utils/create-added-items';
import { nxConfig } from '@services/nx-config/config';
import { MutationType } from '@services/param-state/param-state.types';
import { Layout } from '@services/system-api.types/layouts.types';
import { NxSystem } from '@services/system.service/system';
import { NxSystemsService } from '@services/systems.service';
import { NxSystemInfo } from '@services/systems.service.types';
import { icons } from '@static-variables';
import { cleanIdLegacy, dirtyId } from '@utils/general';
import { hasCrossSystemItems } from '@utils/has-cross-system-items';
import { paramSignal } from '@utils/signals';

import { WithMenuItemsByType } from './menu-items/with-menu-items-by-type';
import { createLayoutItem } from './utils/create-layout-item';
import { findNode } from './utils/find-node';
import { queryChangeSideEffectsFactory } from './utils/query-change-side-effects';

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
        NxLayoutGridTreeNode,
        NxLinesLoaderComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './layout-grid-tree.component.html',
    styleUrls: ['./layout-grid-tree.component.scss'],
})
export class NxLayoutGridTreeComponent extends WithMenuItemsByType {
    @Input() searchType?: 'query' | 'filter' = 'query';
    @Input() layout: Layout;
    @Input() system: NxSystem;
    dataSourceInput$$ = input<BaseResourceNode[]>([], { alias: 'dataSource' });
    @Input() linkedDataSource?: BaseResourceNode[];
    layoutItemLookup$$ = input<LayoutResourceTree | null>(null, { alias: 'layoutItemLookup' });
    @Input() treeControl: NestedTreeControl<ResourceNode, string>;
    @Input() dragging: boolean;
    @Input() showTooltip: boolean;
    @Input() changingLayout: string | boolean = true;
    @Input() suggestedSearch: string[] = [];

    showFirst$$ = input<string | null | undefined>(null, { alias: 'showFirst' });

    lastQuery = '';

    search$$ = paramSignal('search');

    queryChangeSideEffect = queryChangeSideEffectsFactory(() => this.treeControl);

    queryChangeEffect = effect(() =>
        this.queryChangeSideEffect(this.search$$(), this.dataSourceInput$$()),
    );

    dataSource$ = toObservable(this.dataSourceInput$$);

    protected resourceTreeWrapper$$ = viewChild<ElementRef<HTMLDivElement>>('resourceTreeWrapper');

    public async setScrollPosition(scrollTop: number): Promise<void> {
        const resourceTreeWrapper = this.resourceTreeWrapper$$();
        if (resourceTreeWrapper) {
            let timeout: ReturnType<typeof setTimeout>;
            await new Promise<void>(resolve => {
                const observer = new ResizeObserver(
                    ([
                        {
                            contentRect: { height },
                        },
                    ]) => {
                        if (height > scrollTop) {
                            resolve();
                            clearTimeout(timeout);
                            observer.disconnect();
                        }
                    },
                );
                timeout = setTimeout(resolve, 1000);
                observer.observe(resourceTreeWrapper.nativeElement);
            });
            resourceTreeWrapper.nativeElement.scrollTo({ top: scrollTop });
        }
    }

    private scrollPosition$ = new BehaviorSubject(0);

    @Output() scrollChange: Observable<number> = this.scrollPosition$.pipe(debounceTime(100));

    hideNoResults$$ = input(false, { alias: 'hideNoResults', transform: booleanAttribute });

    @ViewChild('currentItemContext') set currentItemContext(value: TemplateRef<unknown>) {
        this.layoutStateService.contextMenu = value;
    }

    CONFIG = nxConfig;

    currentNode: ResourceNode;

    icons = icons;
    positions: ConnectedPosition[] = NxContextMenu.POSITIONS.default;
    forceVisible = '';

    dragDisabled: Record<ResourceType, boolean> = [
        ResourceType.LAYOUTS,
        ResourceType.CAMERAS,
        ResourceType.SERVERS,
        ResourceType.WEB_PAGES,
        ResourceType.SYSTEM,
        ResourceType.SYSTEMS_GROUP,
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
        protected router: Router,
        protected store: Store,
        public tourService: TourService,
        protected systemsService: NxSystemsService,
    ) {
        super();
        if (nxConfig.featureFlags.layoutsTimeline) {
            this.playable.push('archive');
        }
        effect(() => {
            const { params: { layoutId } = { layoutId: null } } =
                this.layoutStateService.paramStateHandler.state$$();
            const { tree = null } = this.layoutItemLookup$$() || {};
            if (layoutId && tree) {
                this.currentNode = findNode(tree, layoutId);
            }
        });
    }

    ngOnInit(): void {
        this.expandNodesFromParams();
    }

    preventDrop = (): boolean => false;

    updateScroll = (scrollEvent: Event): void => {
        const target = scrollEvent.target as HTMLElement;
        this.scrollPosition$.next(target.scrollTop || 0);
    };

    expandNodesFromParams = (): void => {
        const { queryParams: { openNodes = [] } = { openNodes: [] } } =
            this.layoutStateService.paramStateHandler.state$$();

        const dataSource = [...this.dataSourceInput$$(), ...(this.linkedDataSource || [])];

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

    doubleClick$ = new Subject<true>();

    handleSingleClick = (node: ResourceNode, parent: ResourceNode, event: MouseEvent): void => {
        event.stopPropagation();
        const parentId = parent?.details?.id;
        if (node.type) {
            if (assertResourceOfType.system_cloud(node)) {
                const currentSite = {
                    value: [node.details.id],
                    mutationType: MutationType.SET,
                };

                this.layoutStateService.paramStateHandler.updater(() => ({
                    queryParams: {
                        currentSite,
                        search: '',
                    },
                }));
                return;
            }

            if (assertResourceLeafNode(node)) {
                this.layoutStateService.paramStateHandler.updater(() => ({
                    queryParams: {
                        search: '',
                    },
                }));
            }

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

    handleDoubleClick = (node: ResourceNode, event: MouseEvent): void => {
        event.stopPropagation();
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
            : [dirtyId(node.details?.id || '')].map(
                  createLayoutItem(
                      this.layoutItemLookup$$(),
                      assertResourceOfType.camera(node) ? node.details.systemId : this.system.id,
                  ),
              );

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
            this.layout.systemId &&
            hasCrossSystemItems(
                updatedLayout.items,
                this.layoutStateService.paramStateHandler.state$$().params!.systemId!,
            );

        if (
            (!currentUser?.isAdmin && currentUser?.id !== this.layout.parentId) ||
            this.layout.locked ||
            focusView ||
            crossSystemItemsAdded
        ) {
            if (crossSystemItemsAdded) {
                this.layoutStateService.createNewCrossSystemLayout(updatedLayout.items);
            } else if (focusView) {
                this.layoutStateService.createNewLayout(updatedLayout.items);
            } else {
                this.layoutStateService.duplicateAsNewLayout(updatedLayout);
            }
        } else {
            this.layoutStateService.updateLayout(updatedLayout);
        }
    };

    treeMenuItems = Object.entries(this.menuItemsByType).reduce((acc, [type, value]) => {
        acc[type] = value && 'tree' in value ? value.tree : value;
        return acc;
    }, {});

    sceneMenuItems = Object.entries(this.menuItemsByType).reduce((acc, [type, value]) => {
        acc[type] = value && 'scene' in value ? value.scene : value;
        return acc;
    }, {});

    toggleNode = (node: ResourceNode, event: MouseEvent): void => {
        event.stopPropagation();
        const nodeId = node.details?.id;
        if (!nodeId) {
            return;
        }

        this.layoutStateService.paramStateHandler.updater(state => {
            if (!state) {
                return {};
            }

            const openNodes = state.queryParams?.openNodes || [];

            const isOpen = openNodes.includes(nodeId);
            const nodeOpen = this.treeControl.isExpanded(node);

            this.treeControl.toggle(node);
            if (isOpen !== nodeOpen) {
                return {};
            }

            return {
                queryParams: {
                    openNodes: {
                        value: [nodeId],
                        mutationType: !nodeOpen ? MutationType.APPEND : MutationType.REMOVE,
                    },
                },
            };
        });
    };

    nodeId = (_: number, node: ResourceNode): string => node.details?.id || node.type;

    hasChild = (_: number, node: ResourceNode): boolean => assertResourceParentNode(node);

    tooltipTarget$ = new BehaviorSubject<string>('');
    unsubTooltip$ = new Subject<string>();

    updateTooltipTarget = (id: string): void => this.tooltipTarget$.next(id);

    unsubTooltips = (): void => this.unsubTooltip$.next('unsub');

    accountService = inject(NxAccountService);

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

    pickTooltip = (selectFrom: {
        node: ResourceNode;
        tooltips: {
            camera: string | TemplateRef<string>;
            server: string | TemplateRef<string>;
        };
    }): string | TemplateRef<string> => {
        if (!selectFrom || !selectFrom.node) {
            return '';
        }
        const type = selectFrom.node.type;
        if (type === ResourceType.CAMERA) {
            return selectFrom.tooltips.camera;
        }
        if (type === ResourceType.SERVER && nxConfig.featureFlags.layoutsDemo) {
            return selectFrom.tooltips.server;
        }
        if (type === ResourceType.SYSTEM) {
            const node = selectFrom.node;
            if (assertResourceOfType.system_cloud(node)) {
                const { version, system2faEnabled } = node.details as NxSystemInfo;
                const minimumVersion = nxConfig.featureFlags.layouts51Enabled ? 5.1 : 6;
                const sessionVerified = this.accountService.account.sessionVerified;

                if (system2faEnabled && !sessionVerified) {
                    return staticLang.layouts.otherSystems.tooltips.twoFactor;
                }

                if (version < minimumVersion) {
                    return staticLang.layouts.otherSystems.tooltips.updateSite;
                }
            }
        }

        return '';
    };
}
