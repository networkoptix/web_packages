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
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { isEqual } from 'lodash-es';
import { TourMatMenuModule, TourService } from 'ngx-ui-tour-md-menu';
import { BehaviorSubject, Subject, combineLatest, of, timer } from 'rxjs';
import {
    delay,
    distinctUntilChanged,
    filter,
    map,
    shareReplay,
    startWith,
    switchMap,
    takeUntil,
    tap,
} from 'rxjs/operators';

import { NxContextMenu } from '@components/context-menu/context-menu';
import { EditableModule } from '@components/editable/editable.module';
import {
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
import { PipesModule } from '@pipes/pipes.module';
import { NxLayoutGridService } from '@services/layout-grid/layout-grid.service';
import { LayoutStateService } from '@services/layout-state/layout-state.service';
import { createAddedItems } from '@services/layout-state/store/utils/create-added-items';
import { nxConfig } from '@services/nx-config/config';
import { MutationType } from '@services/param-state/param-state.types';
import { Layout } from '@services/system-api.types/layouts.types';
import { NxSystem } from '@services/system.service/system';
import { NxSystemsService } from '@services/systems.service';
import { icons } from '@static-variables';
import { cleanIdLegacy, dirtyId } from '@utils/general';
import { hasCrossSystemItems } from '@utils/has-cross-system-items';

import { WithMenuItemsByType } from './menu-items/with-menu-items-by-type';
import { createLayoutItem } from './utils/create-layout-item';
import { filterSearch } from './utils/filter-search';
import { findNode } from './utils/find-node';
import { queryChangeSideEffects } from './utils/query-change-side-effects';

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
export class NxLayoutGridTreeComponent extends WithMenuItemsByType {
    @Input() searchType?: 'query' | 'filter' = 'query';
    @Input() layout: Layout;
    @Input() system: NxSystem;
    dataSourceInput$$ = input<BaseResourceNode[]>([], { alias: 'dataSource' });
    @Input() linkedDataSource?: BaseResourceNode[];
    layoutItemLookup$$ = input<LayoutResourceTree | null>(null, { alias: 'layoutItemLookup' });
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

    initialDataSource$ = toObservable(this.dataSourceInput$$);

    lastQuery = '';

    dataSource$ = combineLatest([this.query$, this.initialDataSource$]).pipe(
        // Filter here
        tap(([query, nodes]) => queryChangeSideEffects(this, query, nodes)),
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
            : [dirtyId(node.details?.id || '')].map(
                  createLayoutItem(this.layoutItemLookup$$(), this.system.id),
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

    treeMenuItems = Object.entries(this.menuItemsByType).reduce((acc, [type, value]) => {
        acc[type] = value && 'tree' in value ? value.tree : value;
        return acc;
    }, {});

    sceneMenuItems = Object.entries(this.menuItemsByType).reduce((acc, [type, value]) => {
        acc[type] = value && 'scene' in value ? value.scene : value;
        return acc;
    }, {});

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
