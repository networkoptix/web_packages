import { DragDropModule } from '@angular/cdk/drag-drop';
import { CdkContextMenuTrigger, CdkMenuTrigger } from '@angular/cdk/menu';
import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { TourMatMenuModule } from 'ngx-ui-tour-md-menu';

import { NxContextMenu } from '@components/context-menu/context-menu';
import { MenuItemsOrMenuItemsFactory } from '@components/context-menu/context-menu.types';
import { EditableModule } from '@components/editable/editable.module';
import { NxMonitoringGraphComponent } from '@components/graph/graph.component';
import {
    assertResourceOfType,
    assertResourceBaseNode,
    assertOtherSystemsBaseNode,
    assertIsNoResultsNode,
} from '@components/layout-grid/layout-grid.type-guards';
import {
    BaseResourceNode,
    MergedResourceNode,
    ResourceNode,
} from '@components/layout-grid/layout-grid.types';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSearchHighlightComponent } from '@components/search-highlight/search-highlight.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxTooltipDirective } from '@directives/nx-tooltip.directive';
import { NxResizeObserver } from '@directives/resize/nx-resize.directive';
import { NxImageComponent } from '@pages/health/table-components/image/image.component';
import { PipesModule } from '@pipes/pipes.module';
import { NxAccountService } from '@services/account.service';
import { LayoutItemsErrorsStore } from '@services/layout-items/layout-items-errors.store';
import { LayoutStateService } from '@services/layout-state/layout-state.service';
import { SelectedCameraStore } from '@services/layout-state/store/selected-camera.store';
import { nxConfig } from '@services/nx-config/config';
import { Layout } from '@services/system-api.types/layouts.types';
import { CameraTypeId } from '@services/system.service/camera-manager/camera-manager-types';
import { NxSystemService } from '@services/system.service/system.service';
import { NxSystemInfo } from '@services/systems.service.types';
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
    // eslint-disable-next-line @angular-eslint/no-host-metadata-property
    host: {
        '[class]': 'this.class$$()',
    },
})
export class NxLayoutGridTreeNode {
    expanded$$ = input<boolean>(false, { alias: 'expanded' });
    preview$$ = input<boolean>(false, { alias: 'preview' });
    selected$$ = input<boolean>(false, { alias: 'selected' });
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

    baseNodeType$$ = computed(() => {
        const node = this.node$$();
        return [assertResourceBaseNode, assertOtherSystemsBaseNode, assertIsNoResultsNode].some(
            assertion => assertion(node),
        );
    });

    class$$ = computed(() => ({
        offline: this.offline$$(),
        activated: this.activated$$(),
        selected: this.selected$$(),
        checked: this.checked$$(),
        'leaf-node': !this.isRoot$$(),
        'root-node': this.isRoot$$(),
        'renaming-node': this.isRenaming$$(),
        'new-node': this.isNew$$(),
    }));

    constructor(
        public layoutItemsStore: LayoutItemsErrorsStore,
        public layoutStateService: LayoutStateService,
    ) {}

    offline$$ = computed(() => {
        const node = this.node$$();

        if (assertResourceOfType.camera(node)) {
            return !node.details?.unauthorized && !node.details?.online;
        }

        if (assertResourceOfType.server(node)) {
            return !node.details.online;
        }

        if (assertResourceOfType.system_cloud(node)) {
            return !!node.details.status;
        }
        return false;
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

    selectedStateStore = inject(SelectedCameraStore);

    systemService = inject(NxSystemService);

    activated$$ = computed(() => {
        const node = this.node$$();
        const selectedCamera = this.selectedStateStore.selectedLayoutItem$$();

        const currentSystem = this.systemService.currentSystem$$();

        if (!node.details || !currentSystem || !selectedCamera) {
            return false;
        }

        const id = node.details.id;

        const resourcePath = `cloud://${
            'systemId' in node.details ? node.details.systemId : currentSystem.id
        }.${id}`;
        return resourcePath === selectedCamera.resourcePath;
    });

    checked$$ = computed(() => {
        const node = this.node$$();
        if (!node.details?.id) {
            return false;
        }
        const activeResourcePaths = this.layoutStateService.activeLayoutItemsResourceIdAndPath$$();

        if (assertResourceOfType.camera(node)) {
            const { id, systemId } = node.details;
            return activeResourcePaths
                .map(({ resourcePath }) => resourcePath)
                .includes(`cloud://${systemId}.${id}`);
        }
        return activeResourcePaths.map(({ resourceId }) => resourceId).includes(node.details.id);
    });

    unsavedLayoutString$$ = computed(() => {
        const id = this.node$$().details?.id;
        const unsavedLayoutsIds = this.layoutStateService.unsavedLayoutsIds$$();

        return id && unsavedLayoutsIds[id];
    });

    accountService = inject(NxAccountService);

    iconSrc$$ = computed(() => {
        const node = this.node$$();
        const account = this.accountService.account;
        const statusFromLayoutItemsStore =
            node.details?.id && this.layoutItemsStore.icons$$()[node.details?.id];
        const statusForDevice =
            (assertResourceOfType.camera(node) || assertResourceOfType.server(node)) &&
            node.details.status;
        const statusForCrossSiteSystem = (() => {
            if (assertResourceOfType.system_cloud(node)) {
                const { status, system2faEnabled, version } = node.details as NxSystemInfo;
                const minimumVersion = nxConfig.featureFlags.layouts51Enabled ? 5.1 : 6;
                const incompatible = status === 'incompatible' || version < minimumVersion;
                const requires2fa = system2faEnabled && !account?.sessionVerified;
                if (incompatible || requires2fa) {
                    return 'unauthorized';
                }
            }
            return '';
        })();
        const status =
            [statusFromLayoutItemsStore, statusForDevice, statusForCrossSiteSystem].find(
                status => status,
            ) || '';

        if (statusForCrossSiteSystem) {
            console.info('Cross site system status:', statusForCrossSiteSystem);
        }

        return (
            this.icons.dirLayouts +
            node.type +
            (node.details && status
                ? '_' +
                  (node.type !== 'camera' || ['warning', 'unauthorized'].includes(status)
                      ? status.replace('mismatchedCertificate', 'incompatible')
                      : assertResourceOfType.camera(node) &&
                        (node.details.typeId === CameraTypeId.Virtual
                            ? 'virtual'
                            : node.details?.unauthorized
                              ? 'unauthorized'
                              : node.details?.online && node.details?.requiresTranscoding
                                ? 'warning'
                                : node.details.online
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
