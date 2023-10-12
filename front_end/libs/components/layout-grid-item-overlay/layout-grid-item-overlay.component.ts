import { DragDropModule } from '@angular/cdk/drag-drop';
import { CdkMenuTrigger } from '@angular/cdk/menu';
import { CommonModule, DOCUMENT } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    ElementRef,
    EventEmitter,
    HostListener,
    Inject,
    Input,
    Output,
    Signal,
    signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { round } from 'lodash-es';
import { TourMatMenuModule } from 'ngx-ui-tour-md-menu';
import { distinctUntilChanged, map } from 'rxjs';

import { NxContextMenu } from '@components/context-menu/context-menu';
import {
    MenuItem,
    MenuItemAction,
    MenuItemsFactoryCallback,
} from '@components/context-menu/context-menu.types';
import { NxMonitoringGraphComponent } from '@components/graph/graph.component';
import { assertResourceOfType } from '@components/layout-grid/layout-grid.type-guards';
import {
    BaseResourceNode,
    NxSystemCameraWithMappedFields,
    ResourceLeafNode,
    ResourceNode,
    ResourceType,
} from '@components/layout-grid/layout-grid.types';
import { NxLayoutGridTreeComponent } from '@components/layout-grid-tree/layout-grid-tree.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { VideoPlayerModule } from '@components/video-player/video-player.module';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxTooltipDirective } from '@directives/nx-tooltip.directive';
import { NxResizeObserver } from '@directives/resize/nx-resize.directive';
import staticLang from '@language_static';
import { NxImageComponent } from '@pages/health/table-components/image/image.component';
import { PipesModule } from '@pipes/pipes.module';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { LayoutItem } from '@services/system-api.types';
import { RecordingStatus } from '@services/system.service/camera-manager/camera-manager-types';
import { icons } from '@static-variables';
import { WebGLTimelineModule } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/webgl-timeline.module';

const LANG = staticLang.layouts.overlay.menuActions;

const ROTATION_TO_TEXT = {
    '0': '0°',
    '90': '90°',
    '-180': '180°',
    '-90': '270°',
};
const EMPTY_MENU_ACTION = {
    action: () => alert('Not implemented'),
};

@UntilDestroy()
@Component({
    selector: 'nx-layout-grid-item-overlay',
    templateUrl: 'layout-grid-item-overlay.component.html',
    styleUrls: ['layout-grid-item-overlay.component.scss'],
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
        VideoPlayerModule,
        WebGLTimelineModule,
        NxResizeObserver,
        NxAddSvgSrcDirective,
        NxTooltipDirective,
        NxContextMenu,
        CdkMenuTrigger,
    ],
    hostDirectives: [NxResizeObserver],
})
export class NxLayoutGridItemOverlayComponent {
    @Input({ alias: 'item', transform: (value: LayoutItem) => signal(value) })
    item$$: Signal<LayoutItem>;
    @Input({ alias: 'node', transform: (value: BaseResourceNode) => signal(value) })
    node$$: Signal<BaseResourceNode>;
    @Input() showRemove: boolean;
    @Input() hide: boolean;
    @Input() fullScreenTarget: HTMLElement;
    @Input({ alias: 'canEdit', transform: (value: boolean) => signal(value) })
    canEdit$$: Signal<boolean> = signal(true);

    @Output() removeItem = new EventEmitter<LayoutItem>();

    isFullscreen$$ = signal(false);
    isMenuOpened$$ = signal(false);

    scale$ = this.resizeObserver.resize.pipe(
        map(({ width, height }) => {
            const minWidth = 108;
            const minHeight = 72;
            const scaleWidth = minWidth / width;
            const scaleHeight = minHeight / height;
            const scaleClamp = 1;
            return round(Math.max(scaleWidth, scaleHeight, scaleClamp), 2);
        }),
        distinctUntilChanged(),
    );

    scaled$$ = toSignal(this.scale$.pipe(map(scale => scale !== 1)), { initialValue: false });

    getScaleStyle$ = this.scale$.pipe(
        map(scale => ({
            'height.%': scale * 100,
            'width.%': scale * 100,
            transform: `scale(${1 / scale})`,
            'transform-origin': 'top left',
        })),
    );

    // TODO remove when Action Dispatcher for displayInfo is implemented
    // the name is long and stupid intentionally
    temporaryManualDisplayInfoToggle$$ = signal(null);
    allowDebugMode: boolean;
    layoutsEditable: boolean;

    displayInfo$$ = computed(() => {
        if (this.temporaryManualDisplayInfoToggle$$() !== null) {
            return this.temporaryManualDisplayInfoToggle$$();
        }
        return this.item$$().displayInfo;
    });
    statusText$$ = computed(() => {
        const node = this.checkGetCameraNode();
        return node ? node.details.status : '';
    });
    isRecording$$ = computed(() => {
        const node = this.checkGetCameraNode();
        return node ? node.details.recordingStatus === RecordingStatus.Recording : null;
    });

    extraCameraTooltip$$ = computed(() => {
        const node = this.checkGetCameraNode();
        return node ? `: ${node.name}` : '';
    });

    @HostListener('document:fullscreenchange')
    onFullscreenChange(): void {
        this.isFullscreen$$.set(this.document.fullscreenElement === this.fullScreenTarget);
    }

    readonly MENU_ITEMS: Record<string, MenuItem<ResourceNode>> = {
        menu: {
            id: 'menu',
            icon: icons.dirLayouts + 'menu.svg',
            ...LANG.menu,
        },
        ptz: {
            id: 'ptz',
            icon: icons.dirLayoutsCamera + 'ptz.svg',
            ...LANG.ptz,
            ...EMPTY_MENU_ACTION,
        },
        fisheye: {
            id: 'fisheye',
            icon: icons.dirLayoutsCamera + 'fisheye.svg',
            ...LANG.fisheye,
            ...EMPTY_MENU_ACTION,
        },
        motion: {
            id: 'motion',
            icon: icons.dirLayoutsCamera + 'motion.svg',
            ...LANG.motion,
            ...EMPTY_MENU_ACTION,
        },
        object: {
            id: 'object',
            icon: icons.dirLayoutsCamera + 'object.svg',
            ...LANG.object,
            ...EMPTY_MENU_ACTION,
        },
        zoomWindow: {
            id: 'zoomWindow',
            icon: icons.dirLayoutsCamera + 'zoom_window.svg',
            ...LANG.zoomWindow,
            ...EMPTY_MENU_ACTION,
        },
        info: {
            id: 'info',
            icon: icons.dirLayoutsCamera + 'info.svg',
            ...LANG.info,
            checked$$: this.displayInfo$$,
            action: () =>
                this.temporaryManualDisplayInfoToggle$$.set(
                    !this.temporaryManualDisplayInfoToggle$$(),
                ),
        },
        showOnItem: {
            id: 'showOnItem',
            ...LANG.showOnItem,
            subMenu: () => [this.MENU_ITEMS.info],
        },
        rotate: {
            id: 'rotate',
            icon: icons.dirLayoutsCamera + 'rotate.svg',
            ...LANG.rotate,
            ...EMPTY_MENU_ACTION,
            subMenu: (node: ResourceNode) => {
                if (!assertResourceOfType.camera(node)) {
                    return null;
                }
                const rotation = this.item$$().rotation;
                return Object.entries(ROTATION_TO_TEXT).map(
                    ([rotationString, rotationName]: [string, string]) => ({
                        id: rotationString,
                        name: rotationName,
                        checked$$: signal(rotation === parseInt(rotationString)),
                        ...EMPTY_MENU_ACTION,
                    }),
                );
            },
        },
        resolution: {
            id: 'resolution',
            ...LANG.resolution,
            ...EMPTY_MENU_ACTION,
            subMenu: (node: ResourceNode) => {
                if (!assertResourceOfType.camera(node)) {
                    return null;
                }
                return [
                    {
                        id: 'auto',
                        ...LANG.resolutionAuto,
                        checked$$: signal(true),
                        ...EMPTY_MENU_ACTION,
                    },
                    {
                        id: 'high',
                        ...LANG.resolutionHigh,
                        ...EMPTY_MENU_ACTION,
                    },
                    {
                        id: 'low',
                        ...LANG.resolutionLow,
                        ...EMPTY_MENU_ACTION,
                    },
                ];
            },
        },
        screenshot: {
            id: 'screenshot',
            icon: icons.dirLayoutsCamera + 'screenshot.svg',
            ...LANG.screenshot,
            ...EMPTY_MENU_ACTION,
        },
        fullscreenOn: {
            id: 'fullscreenOn',
            icon: icons.dirLayoutsCamera + 'full_screen.svg',
            ...LANG.fullscreenOn,
            action: () => {
                this.fullScreenTarget.requestFullscreen({
                    navigationUI: 'hide',
                });
            },
        },
        fullscreenOff: {
            id: 'fullscreenOff',
            icon: icons.dirLayoutsCamera + 'collapse.svg',
            ...LANG.fullscreenOff,
            action: () => {
                this.document.exitFullscreen();
            },
        },
        remove: {
            id: 'remove',
            icon: icons.dirLayoutsCamera + 'close.svg',
            ...LANG.remove,
            action: ($event, item) => this.removeItem.emit(this.item$$()),
        },
        recordingOn: {
            id: 'recordingOn',
            icon: icons.dirLayoutsCamera + 'camera_rec_on.svg',
            ...LANG.recordingOn,
        },
        recordingOff: {
            id: 'recordingOff',
            icon: icons.dirLayoutsCamera + 'camera_rec_off.svg',
            ...LANG.recordingOff,
        },
        divider: {
            name: 'divider',
        },
    };

    quickActions$$ = computed(() => {
        if (this.node$$().type !== ResourceType.CAMERA) {
            return null;
        }
        return [
            this.allowDebugMode ? this.MENU_ITEMS.ptz : null,
            this.allowDebugMode ? this.MENU_ITEMS.fisheye : null,
            this.allowDebugMode ? this.MENU_ITEMS.motion : null,
            this.allowDebugMode ? this.MENU_ITEMS.object : null,
            this.allowDebugMode ? this.MENU_ITEMS.zoomWindow : null,
            this.allowDebugMode ? this.MENU_ITEMS.info : null,
            this.allowDebugMode && this.canEdit$$() ? this.MENU_ITEMS.rotate : null,
            this.allowDebugMode ? this.MENU_ITEMS.screenshot : null,
        ].filter(i => !!i);
    });

    recordingIcon$$ = computed(() => {
        if (this.isRecording$$() === null) {
            return null;
        }
        return this.MENU_ITEMS[this.isRecording$$() ? 'recordingOn' : 'recordingOff'];
    });

    menu$$ = computed(() => {
        return this.MENU_ITEMS.menu;
    });

    fullscreenAction$$ = computed(() => {
        return this.MENU_ITEMS[this.isFullscreen$$() ? 'fullscreenOff' : 'fullscreenOn'];
    });

    removeAction$$ = computed(() => {
        if (this.canEdit$$() && this.showRemove && !this.isFullscreen$$()) {
            return this.MENU_ITEMS.remove;
        }
    });

    menuItemsByType: Partial<
        Record<ResourceType, MenuItem<ResourceNode>[] | MenuItemsFactoryCallback<ResourceNode>>
    > = {
        [ResourceType.CAMERA]: item =>
            [
                this.fullscreenAction$$(),
                this.allowDebugMode && this.canEdit$$() && this.MENU_ITEMS.rotate,
                this.allowDebugMode ? this.MENU_ITEMS.resolution : null,
                this.allowDebugMode ? this.MENU_ITEMS.zoomWindow : null,
                this.allowDebugMode ? this.MENU_ITEMS.screenshot : null,
                this.allowDebugMode ? this.MENU_ITEMS.divider : null,
                this.allowDebugMode ? this.MENU_ITEMS.showOnItem : null,
                this.removeAction$$() && this.MENU_ITEMS.divider,
                this.removeAction$$(),
            ].filter(i => !!i),
        [ResourceType.SERVER]: item =>
            [
                this.fullscreenAction$$(),
                this.removeAction$$() && this.MENU_ITEMS.divider,
                this.removeAction$$(),
            ].filter(i => !!i),
    };

    constructor(
        @Inject(DOCUMENT) public document: Document,
        public ref: ElementRef<HTMLElement>,
        private resizeObserver: NxResizeObserver,
        configService: NxConfigService,
    ) {
        this.allowDebugMode = configService.getConfig().allowDebugMode;
        this.layoutsEditable = configService.getConfig().featureFlags.layoutsEditable || true;
    }

    handleIconClick(action: MenuItemAction<LayoutItem> | undefined, $event: MouseEvent): void {
        if (!action) {
            return;
        }
        $event.preventDefault();
        $event.stopPropagation();
        action($event, this.item$$());
    }

    checkGetCameraNode(): ResourceLeafNode<NxSystemCameraWithMappedFields> | null {
        const node = this.node$$();
        if (!assertResourceOfType.camera(node)) {
            return null;
        }
        return node;
    }
}
