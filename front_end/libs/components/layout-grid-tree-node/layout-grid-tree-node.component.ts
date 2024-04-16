import { DragDropModule } from '@angular/cdk/drag-drop';
import { CdkContextMenuTrigger, CdkMenuTrigger } from '@angular/cdk/menu';
import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    HostBinding,
    input,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { TourMatMenuModule } from 'ngx-ui-tour-md-menu';

import { NxContextMenu } from '@components/context-menu/context-menu';
import { MenuItemsOrMenuItemsFactory } from '@components/context-menu/context-menu.types';
import { EditableModule } from '@components/editable/editable.module';
import { NxMonitoringGraphComponent } from '@components/graph/graph.component';
import { assertResourceOfType } from '@components/layout-grid/layout-grid.type-guards';
import {
    BaseResourceNode,
    MergedResourceNode,
    ResourceNode,
    ResourceType,
} from '@components/layout-grid/layout-grid.types';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSearchHighlightComponent } from '@components/search-highlight/search-highlight.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxTooltipDirective } from '@directives/nx-tooltip.directive';
import { NxResizeObserver } from '@directives/resize/nx-resize.directive';
import staticLang from '@language_static';
import { NxImageComponent } from '@pages/health/table-components/image/image.component';
import { PipesModule } from '@pipes/pipes.module';
import { LayoutItemsErrorsStore } from '@services/layout-items/layout-items-errors.store';
import { LayoutStateService } from '@services/layout-state/layout-state.service';
import { nxConfig } from '@services/nx-config/config';
import { Layout } from '@services/system-api.types/layouts.types';
import { icons } from '@static-variables';

@UntilDestroy()
@Component({
    selector: 'nx-layout-grid-tree-node',
    templateUrl: 'layout-grid-tree-node.component.html',
    styleUrls: ['layout-grid-tree-node.component.scss'],
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AngularSvgIconModule,
        CommonModule,
        DragDropModule,
        NxImageComponent,
        NxMonitoringGraphComponent,
        NxPreLoaderComponent,
        PipesModule,
        TourMatMenuModule,
        TranslateModule,
        NxResizeObserver,
        NxAddSvgSrcDirective,
        NxTooltipDirective,
        NxContextMenu,
        CdkMenuTrigger,
        CdkContextMenuTrigger,
        CdkOverlayOrigin,
        CdkConnectedOverlay,
        NxSearchHighlightComponent,
        EditableModule,
        FormsModule,
    ],
    hostDirectives: [NxResizeObserver],
})
export class NxLayoutGridTreeNode {
    expanded$$ = input<boolean>(false, { alias: 'expanded' });
    preview$$ = input<boolean>(false, { alias: 'preview' });
    active$$ = input<boolean>(false, { alias: 'active' });
    selected$$ = input<boolean>(false, { alias: 'selected' });
    checked$$ = input<boolean>(false, { alias: 'checked' });
    isRoot$$ = input<boolean>(false, { alias: 'isRoot' });
    menuItems$$ = input.required<
        MenuItemsOrMenuItemsFactory<Partial<MergedResourceNode<{ id: string }>> & BaseResourceNode>
    >({ alias: 'menuItems' });
    treeMenuItems$$ = input.required<
        MenuItemsOrMenuItemsFactory<Partial<MergedResourceNode<{ id: string }>> & BaseResourceNode>
    >({ alias: 'treeMenuItems' });
    node$$ = input.required<ResourceNode>({ alias: 'node' });
    query$$ = input.required<string | RegExp | null>({ alias: 'query' });

    readonly CONFIG = nxConfig;
    readonly icons = icons;
    readonly LANG = staticLang;
    protected readonly RESOURCE_TYPE = ResourceType;
    value: string;

    @HostBinding('class') get class(): Record<string, boolean> {
        return {
            offline: this.offline$$(),
            active: this.active$$(),
            selected: this.selected$$(),
            checked: this.checked$$(),
            'leaf-node': !this.isRoot$$(),
            'root-node': this.isRoot$$(),
            'renaming-node': this.isRenaming$$(),
            'new-node': this.isNew$$(),
        };
    }

    constructor(
        public layoutItemsStore: LayoutItemsErrorsStore,
        public layoutStateService: LayoutStateService,
    ) {
        effect(() => {
            this.value = this.node$$().name;
        });
    }

    offline$$ = computed(() => {
        const node = this.node$$();
        return (
            assertResourceOfType.camera(node) &&
            !node.details?.unauthorized &&
            !node.details?.online
        );
    });

    expandable$$ = computed(() => {
        const isRoot = this.isRoot$$();
        const node = this.node$$();

        if (this.isRoot$$() && 'children' in node) {
            return isRoot && node.children?.length && !node.hidden;
        }

        return false;
    });

    planeMenuItems$$ = computed(() => {
        const menuItems = this.menuItems$$();

        if (Array.isArray(menuItems)) {
            return menuItems;
        }
        return [];
    });

    cameraNodeStatus$$ = computed(() => {
        const node = this.node$$();
        if (assertResourceOfType.camera(node)) {
            return node.details.status;
        }
    });

    isNodeLocked$$ = computed(() => {
        const node = this.node$$();
        if (assertResourceOfType.layout(node)) {
            return node.locked;
        }
    });

    unsavedLayoutString$$ = computed(() => {
        const id = this.node$$().details?.id;
        const unsavedLayoutsIds = this.layoutStateService.unsavedLayoutsIds$$();

        return id && unsavedLayoutsIds[id];
    });

    iconSrc$$ = computed(() => {
        const node = this.node$$();
        const status =
            (node.details?.id && this.layoutItemsStore.icons$$()[node.details?.id]) ||
            ((assertResourceOfType.camera(node) || assertResourceOfType.server(node)) &&
                node.details.status) ||
            '';

        return (
            this.icons.dirLayouts +
            node.type +
            (node.details && status
                ? '_' +
                  (node.type !== 'camera' || ['warning', 'unauthorized'].includes(status)
                      ? status.replace('mismatchedCertificate', 'incompatible')
                      : assertResourceOfType.camera(node) &&
                        (node.details?.unauthorized
                            ? 'unauthorized'
                            : node.details?.online && node.details?.requiresTranscoding
                              ? 'warning'
                              : node.details?.online
                                ? 'online'
                                : 'offline'))
                : '') +
            (assertResourceOfType.layout(node) && node.shared ? '_shared' : '') +
            (assertResourceOfType.layout(node) && node.crossSystem ? '_cloud' : '') +
            '.svg'
        );
    });

    isRenaming$$ = computed(
        () => this.layoutStateService.editedLayout$$()?.id === this.node$$().details?.id,
    );

    isNew$$ = computed(() => !!this.layoutStateService.editedLayout$$()?.isNew);

    handleRename = (): void => {
        this.layoutStateService.editedLayout$$.set(null);
        const layout = this.node$$().details as Layout;

        if (this.node$$().name === layout.name) {
            return;
        }

        this.layoutStateService.updateLayout({
            ...layout,
            name: this.node$$().name,
        });
    };
    protected readonly assertResourceOfType = assertResourceOfType;
}
