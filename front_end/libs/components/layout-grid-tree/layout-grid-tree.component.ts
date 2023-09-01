import { ArrayDataSource } from '@angular/cdk/collections';
import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { CdkContextMenuTrigger, CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { CdkTreeModule, NestedTreeControl } from '@angular/cdk/tree';
import { CommonModule } from '@angular/common';
import { Component, Input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDividerModule } from '@angular/material/divider';
import { untilDestroyed } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { TourMatMenuModule, TourService } from 'ngx-ui-tour-md-menu';
import { BehaviorSubject, Observable, Subject, timer } from 'rxjs';
import { distinctUntilChanged, filter, map, startWith, switchMap, takeUntil } from 'rxjs/operators';

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
import { NxImageComponent } from '@pages/health/table-components/image/image.component';
import { PipesModule } from '@pipes/pipes.module';
import { NxLayoutGridService } from '@services/layout-grid/layout-grid.service';
import { LayoutStateService } from '@services/layout-state/layout-state.service';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { Layout } from '@services/system-api.types';
import { NxSystem } from '@services/system.service/system';
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
        public tourService: TourService,
    ) {
        this.CONFIG = configService.config;
        if (this.CONFIG.featureFlags.layoutsTimeline) {
            this.playable.push('archive');
        }
    }

    cleanId = cleanId;

    hasActions: Partial<
        Record<
            ResourceType,
            { action: string; name: string; icon?: string; handler: unknown; tooltip?: string }[]
        >
    > = {
        [ResourceType.LAYOUTS]: [
            {
                action: 'create',
                name: this.ACTIONS.create.name,
                tooltip: this.ACTIONS.create.tooltip,
                icon: 'plus',
                handler: () =>
                    this.editedLayout$$.set(
                        dirtyId(this.layoutStateService.createNewLocalLayout()),
                    ),
            },
        ],
        [ResourceType.LAYOUT]: [
            {
                action: 'openNewTab',
                name: this.ACTIONS.openNewTab.name,
                tooltip: this.ACTIONS.openNewTab.tooltip,
                handler: () => {},
            },
            {
                action: 'openNewWindow',
                name: this.ACTIONS.openNewWindow.name,
                tooltip: this.ACTIONS.openNewWindow.tooltip,
                handler: () => {},
            },
            {
                action: 'divider',
                name: '',
                tooltip: '',
                handler: () => {},
            },
            {
                action: 'startRename',
                name: this.ACTIONS.rename.name,
                tooltip: this.ACTIONS.rename.tooltip,
                handler: (_, layoutNode) => {
                    this.editedLayout$$.set(layoutNode.id);
                },
            },
            {
                action: 'duplicate',
                name: this.ACTIONS.duplicate.name,
                tooltip: this.ACTIONS.duplicate.tooltip,
                handler: (_, layoutNode) => {
                    this.layoutStateService.duplicateLayoutAsNewLocalLayout(layoutNode.details);
                },
            },
            {
                action: 'delete',
                name: this.ACTIONS.delete.name,
                tooltip: this.ACTIONS.delete.tooltip,
                handler: (_, layout: Layout) => this.layoutStateService.deleteLayout(layout.id),
            },
        ],
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
