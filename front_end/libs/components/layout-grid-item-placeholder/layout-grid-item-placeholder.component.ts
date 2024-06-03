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
import { LetDirective } from '@ngrx/component';
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
import { Placeholder } from '@components/layout-grid-item-placeholder/layout-grid-item-placeholder.types';
import { NxLayoutGridItemPlaceholderTemplateComponent } from '@components/layout-grid-item-placeholder-template/layout-grid-item-placeholder-template.component';
import { NxLayoutGridItemPlaceholderTemplateLegacyComponent } from '@components/layout-grid-item-placeholder-template-legacy/layout-grid-item-placeholder-template-legacy.component';
import { NxLayoutGridTreeComponent } from '@components/layout-grid-tree/layout-grid-tree.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxVideoPlayerComponent } from '@components/video-player/video-player.component';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxResizeObserver } from '@directives/resize/nx-resize.directive';
import { NxTooltipV2Directive } from '@directives/tooltip-v2/tooltip-v2.directive';
import staticLang from '@language_static';
import { NxImageComponent } from '@pages/health/table-components/image/image.component';
import { PipesModule } from '@pipes/pipes.module';
import { LayoutItemsErrorsStore } from '@services/layout-items/layout-items-errors.store';
import { nxConfig } from '@services/nx-config/config';
import {
    CameraTypeId,
    NxSystemCamera,
} from '@services/system.service/camera-manager/camera-manager-types';
import { NxSystemService } from '@services/system.service/system.service';
import { icons } from '@static-variables';

const messagesLang = staticLang.layouts.itemPlaceholders.messages;
const hintsLang = staticLang.layouts.itemPlaceholders.hints;
const actionsLang = staticLang.layouts.itemPlaceholders.actions;
const descriptionsLang = staticLang.layouts.itemPlaceholders.descriptions;
const errorsLang = staticLang.layouts.itemPlaceholders.errors;

const not_supported: Placeholder = {
    message: messagesLang.notSupported,
    isError: false,
    icon: 'future',
    description: descriptionsLang.expectInFutureVersions,
};

const unavailable: Placeholder = {
    message: messagesLang.unavailable,
    isError: true,
    icon: 'unavailable',
};

const offline: Placeholder = {
    message: messagesLang.offline,
    isError: true,
    icon: 'error',
};

const unauthorized: Placeholder = {
    message: messagesLang.unauthorized,
    isError: false,
    icon: 'lock',
};

const PLACEHOLDERS: Record<string, Placeholder> = {
    offline_camera: {
        ...offline,
        hint: hintsLang.offlineCamera,
    },
    offline_server: {
        ...offline,
    },
    defaultPassword: {
        ...unauthorized,
        message: messagesLang.passwordRequired,
        actionName: actionsLang.defaultPassword,
        hint: hintsLang.defaultPassword,
    },
    unauthorized_camera: {
        ...unauthorized,
        actionName: actionsLang.unauthorizedCamera,
        hint: hintsLang.unauthorizedCamera,
    },
    unauthorized_server: {
        ...unauthorized,
    },
    incompatible: {
        message: messagesLang.incompatible,
        isError: true,
    },
    unavailable_camera: {
        ...unavailable,
        hint: hintsLang.unavailableCamera,
    },
    ioDevice: {
        ...not_supported,
        hint: hintsLang.ioDevice,
    },
    webPage: {
        ...not_supported,
        hint: hintsLang.webPage,
    },
    intercom: {
        ...not_supported,
        hint: hintsLang.intercom,
    },
    virtual_camera: {
        message: messagesLang.noLiveStream,
        isError: false,
        hint: hintsLang.virtualCamera,
    },
    noAccess: {
        ...unavailable,
        message: messagesLang.noAccess,
        hint: hintsLang.noAccess,
    },
    noAccessToSystem: {
        ...unavailable,
        message: messagesLang.noAccessToSystem,
        hint: hintsLang.noAccessToSystem,
    },
    systemOffline: {
        ...unavailable,
        message: messagesLang.systemIsOffline,
    },
    default: {
        ...unavailable,
    },
};

// temporary list of statuses that are known.
// Should be invalidated and removed when old placeholder is retired
const KNOWN_STATUSES = [
    'offline',
    ResourceType.WEB_PAGE,
    `${ResourceType.WEB_PAGE}_error`,
    ResourceType.IO_DEVICE,
    'unauthorized',
    'unavailable',
    'websocket',
    'authorization',
    'transcodingDisabled',
    'lostConnection',
    'mjpegDisabled',
    'defaultPassword',
    'unauthorized',
];

const CAMERA_PLACEHOLDERS = {
    offline: PLACEHOLDERS.offline_camera,
    defaultPassword: PLACEHOLDERS.defaultPassword,
    unauthorized: PLACEHOLDERS.unauthorized_camera,
    incompatible: PLACEHOLDERS.incompatible,
    unavailable: PLACEHOLDERS.unavailable_camera,
    virtualCamera: PLACEHOLDERS.virtual_camera,
};

const SERVER_PLACEHOLDERS = {
    offline: PLACEHOLDERS.offline_server,
    unauthorized: PLACEHOLDERS.unauthorized_server,
    incompatible: PLACEHOLDERS.incompatible,
};

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
        NxTooltipV2Directive,
        NxContextMenu,
        CdkMenuTrigger,
        CdkContextMenuTrigger,
        NxLayoutGridItemPlaceholderTemplateComponent,
        NxLayoutGridItemPlaceholderTemplateLegacyComponent,
        LetDirective,
    ],
    hostDirectives: [NxResizeObserver],
})
export class NxLayoutGridItemPlaceholderComponent {
    status = input.required<string | null>();
    itemDetail = input.required<LayoutResourceTree[string]>();
    renderConfig = input.required<ParsedLayoutItem['renderConfig']>();
    isEditable = input.required<boolean>();

    @Output() updateCameraCredentials = new EventEmitter<NxSystemCamera>();

    readonly CONFIG = nxConfig;
    readonly icons = icons;
    readonly LANG = staticLang;
    readonly layoutsItemNewPlaceholder: boolean = !!nxConfig.featureFlags.layoutsItemNewPlaceholder;

    constructor(
        private layoutItemsErrorsStore: LayoutItemsErrorsStore,
        private systemService: NxSystemService,
    ) {}

    adjustedStatus = computed(() => {
        const status = this.status();
        const statuses = this.layoutItemsErrorsStore.statuses$$();
        const itemDetail = this.itemDetail();

        const isCamera = assertResourceOfType.camera(itemDetail);
        const isServer = assertResourceOfType.server(itemDetail);
        const isCamOrSrv = isCamera || isServer;
        const isOnline = isCamOrSrv && itemDetail.details.online;
        const isUnauthorized = isCamera && itemDetail.details.unauthorized;
        const isNotArchived = isCamOrSrv && itemDetail.details.status !== 'archive';
        let adjustedStatus = status || statuses[itemDetail.details.id];

        if (!adjustedStatus) {
            if (isCamera && itemDetail.details.typeId === CameraTypeId.Virtual) {
                adjustedStatus = 'virtualCamera';
            } else if (isUnauthorized) {
                adjustedStatus = 'unauthorized';
            } else if (!isOnline) {
                adjustedStatus = 'offline';
            } else if (isNotArchived) {
                adjustedStatus = itemDetail.details.status;
            } else {
                adjustedStatus = 'offline';
            }
        }

        return adjustedStatus;
    });

    placeholder = computed(() => {
        const status = this.adjustedStatus();
        const itemDetail = this.itemDetail();
        let placeholder = PLACEHOLDERS.default;

        if (!itemDetail || !status) {
            return placeholder;
        }

        if (assertResourceOfType.camera(itemDetail)) {
            placeholder = CAMERA_PLACEHOLDERS[status];
            if (!placeholder && status in KNOWN_STATUSES) {
                placeholder = CAMERA_PLACEHOLDERS.offline;
            }
        }
        if (assertResourceOfType.server(itemDetail)) {
            placeholder = SERVER_PLACEHOLDERS[status];
        }
        if (assertResourceOfType.webpage(itemDetail) || status === ResourceType.WEB_PAGE) {
            placeholder = PLACEHOLDERS.webPage;
        }
        if (assertResourceOfType.iodevice(itemDetail) || status === ResourceType.IO_DEVICE) {
            placeholder = PLACEHOLDERS.ioDevice;
        }

        if (!placeholder) {
            placeholder = PLACEHOLDERS.default;
        }

        return {
            ...placeholder,
            icon: this.getIconFullPath(placeholder.icon),
        };
    });

    getIconFullPath = (icon: string | undefined): string => {
        if (!icon) {
            return '';
        }

        return `${this.icons.dirLayouts}placeholders/48/${icon}.svg`;
    };

    action = computed(() => {
        const itemDetail = this.itemDetail();
        if (
            itemDetail &&
            assertResourceOfType.camera(itemDetail) &&
            (this.adjustedStatus() === 'defaultPassword' || itemDetail.details.unauthorized)
        ) {
            return () => {
                this.updateCameraCredentials.emit(itemDetail.details);
            };
        }
    });

    hasAction = computed(() => {
        // this method is weird. We do not have any other actions though so it is fine so far
        const itemDetail = this.itemDetail();
        const status = this.adjustedStatus();
        const isEditable = this.isEditable();

        const isCamera = itemDetail && assertResourceOfType.camera(itemDetail);
        const hasAuthorize =
            isCamera &&
            (status === 'defaultPassword' || itemDetail.details.unauthorized) &&
            !!this.CONFIG.featureFlags.layoutsAuthorizeCamera &&
            this.systemService.getCurrentSystem().permissionManager.permissions$$().editCameras;

        return isEditable && hasAuthorize;
    });

    notSupported = computed(() => {
        const itemDetail = this.itemDetail();
        return (
            !itemDetail ||
            assertResourceOfType.webpage(itemDetail) ||
            assertResourceOfType.iodevice(itemDetail)
        );
    });

    placeholderIcon = computed(() => {
        const status = this.adjustedStatus();
        const itemDetail = this.itemDetail();

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

    placeholderMessage = computed(() => {
        const status = this.adjustedStatus();
        const itemDetail = this.itemDetail();

        if (!status || !itemDetail) {
            return status;
        }

        return (
            (itemDetail.type === ResourceType.CAMERA
                ? this.LANG.common.cameraStates
                : this.LANG.common.serverStates)[status] ||
            errorsLang[status] ||
            status
        );
    });

    placeholderAdditionalMessage = computed(() => {
        const status = this.adjustedStatus();
        const itemDetail = this.itemDetail();
        const additionalErrorMessages = this.layoutItemsErrorsStore.messages$$();

        if (!status || !itemDetail) {
            return '';
        }

        return (
            additionalErrorMessages[itemDetail.details.id] || additionalErrorMessages[status] || ''
        );
    });
}
