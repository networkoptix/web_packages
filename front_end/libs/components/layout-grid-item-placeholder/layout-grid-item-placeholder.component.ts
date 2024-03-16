import { DragDropModule } from '@angular/cdk/drag-drop';
import { CdkContextMenuTrigger, CdkMenuTrigger } from '@angular/cdk/menu';
import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    EventEmitter,
    input,
    Output,
} from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { TourMatMenuModule } from 'ngx-ui-tour-md-menu';

import { NxContextMenu } from '@components/context-menu/context-menu';
import { NxMonitoringGraphComponent } from '@components/graph/graph.component';
import { assertResourceOfType } from '@components/layout-grid/layout-grid.type-guards';
import {
    LayoutResourceTree,
    ParsedLayoutItem,
    ResourceType,
} from '@components/layout-grid/layout-grid.types';
import { NxLayoutGridItemPlaceholderTemplateComponent } from '@components/layout-grid-item-placeholder-template/layout-grid-item-placeholder-template.component';
import { NxLayoutGridItemPlaceholderTemplateLegacyComponent } from '@components/layout-grid-item-placeholder-template-legacy/layout-grid-item-placeholder-template-legacy.component';
import { NxLayoutGridTreeComponent } from '@components/layout-grid-tree/layout-grid-tree.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxVideoPlayerComponent } from '@components/video-player/video-player.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxTooltipDirective } from '@directives/nx-tooltip.directive';
import { NxResizeObserver } from '@directives/resize/nx-resize.directive';
import staticLang from '@language_static';
import { NxImageComponent } from '@pages/health/table-components/image/image.component';
import { PipesModule } from '@pipes/pipes.module';
import { LayoutItemsErrorsStore } from '@services/layout-items/layout-items-errors.store';
import { nxConfig } from '@services/nx-config/config';
import { NxSystemCamera } from '@services/system.service/camera-manager/camera-manager-types';
import { icons } from '@static-variables';

@UntilDestroy()
@Component({
    selector: 'nx-layout-grid-item-placeholder',
    templateUrl: 'layout-grid-item-placeholder.component.html',
    styleUrls: ['layout-grid-item-placeholder.component.scss'],
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AngularSvgIconModule,
        CommonModule,
        DragDropModule,
        NxImageComponent,
        NxLayoutGridTreeComponent,
        NxMonitoringGraphComponent,
        NxPreLoaderComponent,
        PipesModule,
        TourMatMenuModule,
        TranslateModule,
        NxVideoPlayerComponent,
        NxResizeObserver,
        NxAddSvgSrcDirective,
        NxTooltipDirective,
        NxContextMenu,
        CdkMenuTrigger,
        CdkContextMenuTrigger,
        NxLayoutGridItemPlaceholderTemplateComponent,
        NxLayoutGridItemPlaceholderTemplateLegacyComponent,
    ],
    hostDirectives: [NxResizeObserver],
})
export class NxLayoutGridItemPlaceholderComponent {
    status$$ = input.required<string | null>({ alias: 'status' });
    itemDetail$$ = input.required<LayoutResourceTree[string]>({ alias: 'itemDetail' });
    renderConfig$$ = input.required<ParsedLayoutItem['renderConfig']>({ alias: 'renderConfig' });
    isEditable$$ = input.required<boolean>({ alias: 'isEditable' });

    @Output() updateCameraCredentials = new EventEmitter<NxSystemCamera>();

    readonly CONFIG = nxConfig;
    readonly icons = icons;
    readonly LANG = staticLang;
    readonly layoutsItemNewPlaceholder: boolean = !!nxConfig.featureFlags.layoutsItemNewPlaceholder;

    constructor(private layoutItemsStore: LayoutItemsErrorsStore) {}

    adjustedStatus$$ = computed(() => {
        const status = this.status$$();
        const errors = this.layoutItemsStore.errors$$();
        const itemDetail = this.itemDetail$$();

        return (
            status ||
            errors[itemDetail.details.id] ||
            (assertResourceOfType.camera(itemDetail) && itemDetail.details.unauthorized
                ? 'unauthorized'
                : !(
                        (assertResourceOfType.camera(itemDetail) ||
                            assertResourceOfType.server(itemDetail)) &&
                        itemDetail.details.online
                    )
                  ? 'offline'
                  : (assertResourceOfType.camera(itemDetail) ||
                          assertResourceOfType.server(itemDetail)) &&
                      itemDetail.details.status !== 'archive'
                    ? (assertResourceOfType.camera(itemDetail) ||
                          assertResourceOfType.server(itemDetail)) &&
                      itemDetail.details.status
                    : 'offline')
        );
    });

    action$$ = computed(() => {
        const itemDetail = this.itemDetail$$();
        if (
            itemDetail &&
            assertResourceOfType.camera(itemDetail) &&
            (this.adjustedStatus$$() === 'defaultPassword' || itemDetail.details.unauthorized)
        ) {
            return () => {
                this.updateCameraCredentials.emit(itemDetail.details);
            };
        }
    });

    notSupported$$ = computed(() => {
        const itemDetail = this.itemDetail$$();
        return (
            !itemDetail ||
            assertResourceOfType.webpage(itemDetail) ||
            assertResourceOfType.iodevice(itemDetail)
        );
    });

    hasAction$$ = computed(() => {
        const itemDetail = this.itemDetail$$();
        const status = this.adjustedStatus$$();
        const isEditable = this.isEditable$$();
        return (
            itemDetail &&
            assertResourceOfType.camera(itemDetail) &&
            isEditable &&
            (status === 'defaultPassword' || itemDetail.details.unauthorized)
        );
    });

    placeholderIcon$$ = computed(() => {
        const status = this.adjustedStatus$$();
        const itemDetail = this.itemDetail$$();

        if (!status || !itemDetail) {
            return '';
        }

        return (
            this.icons.dirLayouts +
            'placeholders/' +
            ([
                'online',
                'unauthorized',
                'defaultPassword',
                'transcodingDisabled',
                'mjpegDisabled',
            ].includes(status)
                ? status
                      .replace('defaultPassword', 'alert')
                      .replace('transcodingDisabled', 'offline')
                      .replace('mjpegDisabled', 'offline')
                : [ResourceType.WEB_PAGE, ResourceType.IO_DEVICE].includes(itemDetail.type)
                  ? status
                  : itemDetail.type === ResourceType.SERVER
                    ? 'unavailable'
                    : 'offline') +
            '.svg'
        );
    });

    placeholderMessage$$ = computed(() => {
        const status = this.adjustedStatus$$();
        const itemDetail = this.itemDetail$$();

        if (!status || !itemDetail) {
            return status;
        }

        return (
            (itemDetail.type === ResourceType.CAMERA
                ? this.LANG.common.cameraStates
                : this.LANG.common.serverStates)[status] ||
            this.LANG.layouts.errors[status] ||
            status
        );
    });

    placeholderAdditionalMessage$$ = computed(() => {
        const status = this.adjustedStatus$$();
        const itemDetail = this.itemDetail$$();
        const additionalErrorMessages = this.layoutItemsStore.messages$$();

        if (!status || !itemDetail) {
            return '';
        }

        return additionalErrorMessages[itemDetail.details.id] || additionalErrorMessages[status];
    });
}
