import { ArrayDataSource } from '@angular/cdk/collections';
import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { CdkTreeModule, NestedTreeControl } from '@angular/cdk/tree';
import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { untilDestroyed } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { TourMatMenuModule, TourService } from 'ngx-ui-tour-md-menu';
import { BehaviorSubject, Observable, Subject, timer } from 'rxjs';
import { distinctUntilChanged, filter, map, startWith, switchMap, takeUntil } from 'rxjs/operators';

import staticLang from '@common/language/language_i18n_static.json';
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
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxTagComponent } from '@components/tag/tag.component';
import { DirectivesModule } from '@directives/directives.module';
import { icons } from '@lib/variables/static-variables';
import { NxImageComponent } from '@pages/health/table-components/image/image.component';
import { PipesModule } from '@pipes/pipes.module';
import { NxLayoutGridService } from '@services/layout-grid/layout-grid.service';
import { LayoutStateService } from '@services/layout-state/layout-state.service';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { Layout } from '@services/system-api.types';
import { NxSystem } from '@services/system.service/system';
import { cleanId } from '@utils/general';

@Component({
    selector: 'nx-layout-grid-tree',
    standalone: true,
    imports: [
        AngularSvgIconModule,
        CdkDrag,
        CdkDropList,
        CdkTreeModule,
        CommonModule,
        DirectivesModule,
        NxImageComponent,
        NxPreLoaderComponent,
        PipesModule,
        TourMatMenuModule,
        TranslateModule,
        NxTagComponent,
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
    @Input() treeControl: NestedTreeControl<ResourceNode>;
    @Input() errorIcons: Record<string, string>;
    @Input() dragging: boolean;
    @Input() showTooltip$: Observable<boolean>;
    @Input() changingLayout: string | boolean = true;

    icons = icons;

    ServerStats: ServerStats;
    LANG = staticLang;
    CONFIG: IConfig;
    playable: string[] = ['online', 'recording', 'scheduled'];
    readonly RESOURCE_TYPE = ResourceType;

    cleanId = cleanId;

    constructor(
        configService: NxConfigService,
        public layoutGridService: NxLayoutGridService,
        public tourService: TourService,
        public layoutStateService: LayoutStateService,
    ) {
        this.CONFIG = configService.config;
        if (this.CONFIG.featureFlags.layoutsTimeline) {
            this.playable.push('archive');
        }
    }

    hasActions: Partial<
        Record<ResourceType, { action: string; icon: string; handler: unknown; tooltip?: string }[]>
    > = {
        [ResourceType.LAYOUTS]: [
            {
                action: 'create',
                icon: 'plus',
                tooltip: this.LANG.layouts.createNew,
                handler: () => this.layoutStateService.createNewLocalLayout(),
            },
        ],
        [ResourceType.LAYOUT]: [
            {
                action: 'edit',
                icon: 'edit',
                tooltip: this.LANG.layouts.edit,
                handler: (_, layout: Layout) =>
                    this.layoutStateService.updateLayout({
                        ...layout,
                        name: prompt('Updated Layout Name'),
                    }),
            },
            {
                action: 'delete',
                icon: 'delete',
                tooltip: this.LANG.layouts.delete,
                handler: (_, layout: Layout) => this.layoutStateService.deleteLayout(layout.id),
            },
        ],
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
    protected readonly console = console;
}
