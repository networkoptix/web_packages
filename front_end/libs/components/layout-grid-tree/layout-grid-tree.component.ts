import { ArrayDataSource } from '@angular/cdk/collections';
import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { CdkContextMenuTrigger, CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ConnectedPosition } from '@angular/cdk/overlay';
import { CdkTreeModule, NestedTreeControl } from '@angular/cdk/tree';
import { CommonModule } from '@angular/common';
import { Component, Inject, Input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';
import { untilDestroyed } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { TourMatMenuModule, TourService } from 'ngx-ui-tour-md-menu';
import { BehaviorSubject, Observable, Subject, timer } from 'rxjs';
import { distinctUntilChanged, filter, map, startWith, switchMap, takeUntil } from 'rxjs/operators';

import { NxContextMenu } from '@components/context-menu/context-menu';
import { MenuItem } from '@components/context-menu/context-menu.types';
import { EditableModule } from '@components/editable/editable.module';
import { assertResourceParentNode } from '@components/layout-grid/layout-grid.type-guards';
import {
    BaseResourceNode,
    LayoutRenderConfig,
    ParsedLayoutItems,
    ResourceNode,
    ResourceType,
    ServerStats,
    ServerStatsObservable,
} from '@components/layout-grid/layout-grid.types';
import { NxMatLikeInputComponent } from '@components/mat-like-components/mat-like-input/input.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxTagComponent } from '@components/tag/tag.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxTooltipDirective } from '@directives/nx-tooltip.directive';
import staticLang from '@language_static';
import { MenuModule } from '@menu/menu.module';
import { NxImageComponent } from '@pages/health/table-components/image/image.component';
import { PipesModule } from '@pipes/pipes.module';
import { NxLayoutGridService } from '@services/layout-grid/layout-grid.service';
import { LayoutStateService } from '@services/layout-state/layout-state.service';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { Layout } from '@services/system-api.types';
import { NxSystem } from '@services/system.service/system';
import { WINDOW } from '@services/window-provider';
import { icons } from '@static-variables';
import { cleanId, dirtyId } from '@utils/general';

@Component({
    selector: 'nx-layout-grid-tree',
    standalone: true,
    imports: [
        AngularSvgIconModule,
        CdkDrag,
        CdkDropList,
        CdkMenu,
        CdkMenuTrigger,
        CdkTreeModule,
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
    ],
    templateUrl: './layout-grid-tree.component.html',
    styleUrls: ['./layout-grid-tree.component.scss'],
})
export class NxLayoutGridTreeComponent {
    @Input() layout: {
        items: ParsedLayoutItems;
        renderConfig: LayoutRenderConfig;
        locked?: boolean;
        id?: string;
    };
    @Input() system: NxSystem;
    @Input() dataSource: ArrayDataSource<BaseResourceNode>;
    @Input() treeControl: NestedTreeControl<ResourceNode, string>;
    @Input() errorIcons: Record<string, string>;
    @Input() dragging: boolean;
    @Input() showTooltip$: Observable<boolean>;
    @Input() changingLayout: string | boolean = true;

    // This will be added to an ngrx store as some kind of ephemeral state that will handle any actions where only a single type can be active at a type. Probably action types would be 'renaming', 'adding', 'dialogShown'.
    editedLayout$$ = signal(null);

    icons = icons;
    positions: ConnectedPosition[] = NxContextMenu.POSITIONS.default;

    ServerStats: ServerStats;
    LANG = staticLang;
    ACTIONS = staticLang.layouts.treeActions;
    CONFIG: IConfig;
    playable: string[] = ['online', 'recording', 'scheduled'];
    readonly RESOURCE_TYPE = ResourceType;

    constructor(
        configService: NxConfigService,
        public layoutGridService: NxLayoutGridService,
        public layoutStateService: LayoutStateService,
        private router: Router,
        public tourService: TourService,
        @Inject(WINDOW) public window: Window,
    ) {
        this.CONFIG = configService.config;
        if (this.CONFIG.featureFlags.layoutsTimeline) {
            this.playable.push('archive');
        }
    }

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

    hasActions: Partial<
        Record<
            ResourceType,
            {
                id: string;
                name: string;
                icon?: string;
                action?: unknown;
                tooltip?: string;
                subMenu?: MenuItem<unknown>[];
            }[]
        >
    > = {
        [ResourceType.LAYOUTS]: [
            {
                id: 'create',
                name: this.ACTIONS.create.name,
                tooltip: this.ACTIONS.create.tooltip,
                icon: 'plus',
                action: ($event, node) => {
                    $event.preventDefault();
                    this.editedLayout$$.set(
                        dirtyId(this.layoutStateService.createNewLocalLayout()),
                    );
                    this.treeControl.expand(node);
                },
            },
        ],
        [ResourceType.LAYOUT]: [
            ...this.OPEN_WINDOW_ACTIONS,
            {
                id: 'divider',
                name: 'divider',
            },
            {
                id: 'startRename',
                name: this.ACTIONS.rename.name,
                action: ($event, node) => this.editedLayout$$.set(node.id),
            },
            {
                id: 'duplicate',
                name: this.ACTIONS.duplicate.name,
                action: ($event, node) =>
                    this.layoutStateService.duplicateLayoutAsNewLocalLayout(node.details),
            },
            {
                id: 'delete',
                name: this.ACTIONS.delete.name,
                action: ($event, node) => this.layoutStateService.deleteLayout(node.id),
            },
        ],
        [ResourceType.SERVER]: [...this.OPEN_WINDOW_ACTIONS],
        [ResourceType.CAMERA]: [...this.OPEN_WINDOW_ACTIONS],
    };

    openWindow = (id: string, isNewWindow = false): void => {
        const params = [`${this.router.url.split('layouts')[0]}layouts/${cleanId(id)}`, '_blank'];
        if (isNewWindow) {
            params.push('"width=100%, height=100%"');
        }

        this.window.open(...params);
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
