import { DragDropModule } from '@angular/cdk/drag-drop';
import { CdkContextMenuTrigger, CdkMenuTrigger } from '@angular/cdk/menu';
import { CommonModule, Location } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    EventEmitter,
    inject,
    input,
    Output,
} from '@angular/core';
import { Router } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { LetDirective } from '@ngrx/component';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { TourMatMenuModule } from 'ngx-ui-tour-md-menu';
import { lastValueFrom } from 'rxjs';

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
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxResizeObserver } from '@directives/resize/nx-resize.directive';
import { NxTooltipV2Directive } from '@directives/tooltip-v2/tooltip-v2.directive';
import staticLang from '@language_static';
import { ConnectionError } from '@openLibs/webrtc-stream-manager';
import { NxImageComponent } from '@pages/health/table-components/image/image.component';
import { Translatable } from '@pipes/nx-translate.types';
import { PipesModule } from '@pipes/pipes.module';
import { NxAccountService } from '@services/account.service';
import { LayoutItemsErrorsStore } from '@services/layout-items/layout-items-errors.store';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { nxConfig } from '@services/nx-config/config';
import { OauthService } from '@services/oauth.service';
import {
    CameraTypeId,
    NxSystemCamera,
} from '@services/system.service/camera-manager/camera-manager-types';
import { NxSystemsService } from '@services/systems.service';
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

const requires2fa: Placeholder = {
    message: messagesLang.requires2fa,
    isError: true,
    icon: 'lock',
    actionName: actionsLang.requires2fa,
    hint: hintsLang.requires2fa,
};

const enable2fa: Placeholder = {
    message: messagesLang.enable2fa,
    isError: true,
    icon: 'lock',
    actionName: actionsLang.enable2fa,
    hint: hintsLang.enable2fa,
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
    offlineCamera: {
        ...offline,
        hint: hintsLang.offlineCamera,
    },
    offlineServer: {
        ...offline,
    },
    offlineSystem: {
        ...offline,
        icon: 'unavailable',
        message: messagesLang.systemIsOffline,
    },
    defaultPassword: {
        ...unauthorized,
        message: messagesLang.passwordRequired,
        hint: hintsLang.defaultPassword,
    },
    unauthorizedCamera: {
        ...unauthorized,
        actionName: actionsLang.unauthorizedCamera,
        hint: hintsLang.unauthorizedCamera,
    },
    unauthorizedServer: {
        ...unauthorized,
    },
    incompatible: {
        message: messagesLang.incompatible,
        isError: true,
    },
    unavailableCamera: {
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
    virtualCamera: {
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
        hint: { value: hintsLang.noAccessToSystem, params: { systemName: '' } },
    },
    systemOffline: {
        ...unavailable,
        message: messagesLang.systemIsOffline,
    },
    versionNotSupported: {
        ...not_supported,
        description: descriptionsLang.systemVersionNotCompatible,
        hint: hintsLang.systemVersionNotCompatible,
    },
    codecNotSupported: {
        ...not_supported,
        description: '',
        hint: hintsLang.codecNotSupported,
    },
    system2faRequired: requires2fa,
    account2faDisabled: enable2fa,
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
];

const CAMERA_PLACEHOLDERS = {
    offline: PLACEHOLDERS.offlineCamera,
    defaultPassword: PLACEHOLDERS.defaultPassword,
    unauthorized: PLACEHOLDERS.unauthorizedCamera,
    incompatible: PLACEHOLDERS.incompatible,
    unavailable: PLACEHOLDERS.unavailableCamera,
    virtualCamera: PLACEHOLDERS.virtualCamera,
    noAccess: PLACEHOLDERS.noAccess,
    [ConnectionError.transcodingDisabled]: PLACEHOLDERS.codecNotSupported,
    [ConnectionError.mjpegDisabled]: PLACEHOLDERS.codecNotSupported,
};

const SERVER_PLACEHOLDERS = {
    offline: PLACEHOLDERS.offlineServer,
    incompatible: PLACEHOLDERS.incompatible,
    unauthorized: PLACEHOLDERS.unauthorizedServer,
    noAccess: PLACEHOLDERS.noAccess,
};

const SYSTEM_PLACEHOLDERS = {
    systemOffline: PLACEHOLDERS.offlineSystem,
    systemIncompatible: PLACEHOLDERS.incompatible,
    systemNoAccess: PLACEHOLDERS.noAccessToSystem,
    systemNoPermission: PLACEHOLDERS.noAccess,
    systemVersionNotSupported: PLACEHOLDERS.not_supported,
    system2faRequired: PLACEHOLDERS.system2faRequired,
    account2faDisabled: PLACEHOLDERS.account2faDisabled,
};

const DEVICE_PLACEHOLDERS = {
    noAccess: PLACEHOLDERS.noAccess,
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
    layoutItemStatus = input.required<string | null>();
    itemDetail = input<LayoutResourceTree[string]>();
    /** for debug purposes only */
    item = input<ParsedLayoutItem>();
    /** to be deprecated */
    renderConfig = input.required<ParsedLayoutItem['renderConfig']>();
    /** to be deprecated */
    systemStatus = input.required<Translatable>();

    @Output() updateCameraCredentials = new EventEmitter<NxSystemCamera>();

    readonly CONFIG = nxConfig;
    readonly icons = icons;
    readonly LANG = staticLang;
    readonly layoutsItemNewPlaceholder: boolean = !!nxConfig.featureFlags.layoutsItemNewPlaceholder;
    readonly layoutsDebugPlaceholder: boolean = !!nxConfig.featureFlags.layoutsDebugPlaceholder;

    constructor(
        private layoutItemsErrorsStore: LayoutItemsErrorsStore,
        private systemsService: NxSystemsService,
    ) {}

    adjustedStatus = computed(() => {
        if (this.layoutsItemNewPlaceholder) {
            // the latter one `this.status()` is used when status changes
            // on the fly.
            // Like camera or server going offline
            return this.layoutItemStatus() || this.status();
        }

        const status = this.status();
        const statuses = this.layoutItemsErrorsStore.statuses$$();
        const itemDetail = this.itemDetail();
        if (!itemDetail) {
            // this is for the old placeholder and the old placeholder handles no item in the html template
            return;
        }

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
            } else if (isCamera && itemDetail.details.isDefaultPassword) {
                adjustedStatus = 'defaultPassword';
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
        let placeholder: Placeholder | undefined;

        if (!status) {
            return this.getDefaultPlaceholder();
        }

        if (itemDetail) {
            if (assertResourceOfType.camera(itemDetail)) {
                placeholder = CAMERA_PLACEHOLDERS[status];
                if (!placeholder && status in KNOWN_STATUSES) {
                    placeholder = CAMERA_PLACEHOLDERS.offline;
                }
            }
            if (assertResourceOfType.server(itemDetail)) {
                placeholder = SERVER_PLACEHOLDERS[status];
            }
            if (assertResourceOfType.webpage(itemDetail)) {
                // hide web pages ff
                placeholder = PLACEHOLDERS.webPage;
            }
            if (assertResourceOfType.iodevice(itemDetail)) {
                // hide ioDevice pages ff
                placeholder = PLACEHOLDERS.ioDevice;
            }
        } else {
            placeholder = DEVICE_PLACEHOLDERS[status];
        }

        if (SYSTEM_PLACEHOLDERS[status]) {
            placeholder = SYSTEM_PLACEHOLDERS[status];
        }

        if (!placeholder) {
            // this is an error state as a matter of fact
            // we show a fallback placeholder to avoid breaking the layout
            // ff layoutsDebugPlaceholder can provide more info
            return this.getDefaultPlaceholder();
        }

        return this.getWithIconFullPath(placeholder);
    });

    getDefaultPlaceholder = (): Placeholder => {
        const itemDetail = this.itemDetail();
        const status = this.adjustedStatus();
        const placeholder = this.getWithIconFullPath(PLACEHOLDERS.default);

        if (this.layoutsDebugPlaceholder) {
            placeholder.hint = `${placeholder.hint || ''}
            layoutItemStatus: ${this.layoutItemStatus()}
            adjustedStatus: ${status}
            itemDetailsId: ${itemDetail?.details?.id}
            itemType: ${itemDetail?.type}
            resourcePath: ${this.item()?.resourcePath}`;
        }

        return placeholder;
    };

    getWithIconFullPath = (placeholder: Placeholder): Placeholder => {
        if (!placeholder?.icon) {
            return placeholder;
        }

        return {
            ...placeholder,
            icon: `${this.icons.dirLayouts}placeholders/48/${placeholder.icon}.svg`,
        };
    };

    accountService = inject(NxAccountService);
    oauthService = inject(OauthService);
    cloudApi = inject(NxCloudApiService);
    routerState = inject(Router);
    dialogs = inject(NxDialogsService);

    action = computed(() => {
        const itemDetail = this.itemDetail();
        if (
            itemDetail &&
            assertResourceOfType.camera(itemDetail) &&
            itemDetail.details.unauthorized
        ) {
            return () => {
                this.updateCameraCredentials.emit(itemDetail.details);
            };
        }

        if (this.has2faAction()) {
            return async () => {
                if (this.accountService.account.totpExistsForAccount) {
                    const accessToken = await lastValueFrom(this.cloudApi.getAccessToken());
                    return this.oauthService.redirectOauth({
                        state: 'system2faAuth',
                        email: this.accountService.account.email,
                        accessToken,
                        redirectTo: Location.joinWithSlash(
                            window.location.origin,
                            this.routerState.routerState.snapshot.url,
                        ),
                    });
                }

                return this.dialogs.account2faEnable().then(enabled => {
                    if (enabled) {
                        return this.accountService.get(true);
                    }
                });
            };
        }
    });

    has2faAction = computed(() =>
        ['system2faRequired', 'account2faDisabled'].includes(this.adjustedStatus() || ''),
    );

    hasAction = computed(() => {
        // this method is weird. We do not have any other actions though so it is fine so far
        const itemDetail = this.itemDetail();
        const isCamera = !!itemDetail && assertResourceOfType.camera(itemDetail);

        const hasAuthorize =
            isCamera &&
            itemDetail.details.unauthorized &&
            !!this.CONFIG.featureFlags.layoutsAuthorizeCamera &&
            this.systemsService
                .systemsPermissionsManager$$()
                [itemDetail.details.systemId].canEditDevice(itemDetail.details.id);

        return hasAuthorize || this.has2faAction();
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
                  ? status.toLowerCase()
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
