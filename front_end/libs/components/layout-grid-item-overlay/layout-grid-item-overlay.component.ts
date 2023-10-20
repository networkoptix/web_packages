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
    WritableSignal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { round } from 'lodash-es';
import { TourMatMenuModule } from 'ngx-ui-tour-md-menu';
import {
    distinctUntilChanged,
    map,
    repeat,
    defer,
    switchMap,
    combineLatest,
    EMPTY,
    delay,
    catchError,
} from 'rxjs';

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
    ResourceNodeMap,
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
import { NxSystemRestAPI2 } from '@services/system-rest-api-v2.service';
import { RecordingStatus } from '@services/system.service/camera-manager/camera-manager-types';
import { NxSystem } from '@services/system.service/system';
import { icons } from '@static-variables';
import { isDefinedOrTrue } from '@utils/array';
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
    node$$ = signal<BaseResourceNode | null>(null);
    @Input() set node(value: BaseResourceNode) {
        this.node$$.set(value);
    }
    @Input() showRemove: boolean;
    @Input() hide: boolean;
    @Input() fullScreenTarget: HTMLElement;
    @Input({ alias: 'canEdit', transform: (value: boolean) => signal(value) })
    canEdit$$: Signal<boolean> = signal(true);
    @Input() system: NxSystem;

    @Output() removeItem = new EventEmitter<LayoutItem>();

    isFullscreen$$ = signal(false);
    isMenuOpened$$ = signal(false);
    hovered$$ = signal(false);

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
    temporaryManualDisplayInfoToggle$$: WritableSignal<boolean | null> = signal(null);
    allowDebugMode: boolean;
    layoutsEditable: boolean;

    displayInfo$$ = computed(() => {
        if (!this.cameraOnline$$()) {
            return false;
        }
        const manualToggle = this.temporaryManualDisplayInfoToggle$$();
        if (manualToggle !== null) {
            return manualToggle;
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
    cameraOnline$$ = computed(() => {
        const node = this.checkGetCameraNode();
        return node ? node.details.online : null;
    });

    extraCameraTooltip$$ = computed(() => {
        const node = this.checkGetCameraNode();
        return node ? `: ${node.name}` : '';
    });

    updateMetrics$$ = computed(() => this.hovered$$() || this.isFullscreen$$());

    bitrateInfo$ = combineLatest([
        toObservable(this.displayInfo$$),
        toObservable(this.cameraOnline$$),
        toObservable(this.updateMetrics$$),
    ]).pipe(
        map(([displayInfo, cameraOnline, hovered]) =>
            [displayInfo, cameraOnline, hovered].every(Boolean),
        ),
        delay(1000),
        distinctUntilChanged(),
        switchMap(displayInfo => {
            const cameraNode = this.checkGetCameraNode();
            const mediaserver = this.system.mediaserver;

            if (!displayInfo || !cameraNode) {
                return EMPTY;
            }

            if (mediaserver instanceof NxSystemRestAPI2) {
                const {
                    fps,
                    unableToLoad,
                    unavailable,
                    streamType: { primary, secondary },
                    resolution: { high, low },
                } = staticLang.layouts.overlay.info;

                return defer(() => mediaserver.getCameraStreamMetrics(cameraNode.details.id)).pipe(
                    map(({ primaryStream, secondaryStream }) => {
                        if (!primaryStream) {
                            return [unavailable, unableToLoad];
                        }

                        const videoElement =
                            this.ref.nativeElement.querySelector<HTMLVideoElement>(
                                'video.original-stream',
                            );
                        if (!videoElement) {
                            return null;
                        }

                        const currentResolution = `${videoElement.videoWidth}x${videoElement.videoHeight}`;
                        const streams = [primaryStream, secondaryStream];
                        const stream =
                            streams.find(({ resolution }) => resolution === currentResolution) ||
                            primaryStream;
                        const resolution = stream?.resolution;
                        const fpsText = stream?.actualFps && {
                            value: fps,
                            params: { fps: stream.actualFps.toFixed(2) },
                        };
                        const bitrate =
                            stream?.actualBitrateBps &&
                            `${((stream.actualBitrateBps / 1024 ** 2) * 8).toFixed(2)} Mbps`;
                        const streamTitle = stream === primaryStream ? primary : secondary;
                        const streamDescription = {
                            value: stream === primaryStream ? high : low,
                            params: { codec: stream.codec },
                        };
                        return [
                            streamTitle,
                            resolution,
                            fpsText,
                            bitrate,
                            streamDescription,
                        ].filter(Boolean);
                    }),
                    catchError(() => Promise.resolve([unavailable, unableToLoad])),
                    repeat({ delay: 1000 }),
                );
            } else {
                return EMPTY;
            }
        }),
    );

    @HostListener('document:fullscreenchange')
    onFullscreenChange(): void {
        this.isFullscreen$$.set(this.document.fullscreenElement === this.fullScreenTarget);
    }

    @HostListener('mouseenter') onHoverStart(): void {
        this.hovered$$.set(true);
    }

    @HostListener('mouseleave') onHoverEnd(): void {
        this.hovered$$.set(false);
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
            action: () => this.temporaryManualDisplayInfoToggle$$.update(value => !value),
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
                    return;
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
                    return;
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
            this.allowDebugMode && this.MENU_ITEMS.ptz,
            this.allowDebugMode && this.MENU_ITEMS.fisheye,
            this.allowDebugMode && this.MENU_ITEMS.motion,
            this.allowDebugMode && this.MENU_ITEMS.object,
            this.allowDebugMode && this.MENU_ITEMS.zoomWindow,
            this.cameraOnline$$() && this.MENU_ITEMS.info,
            this.allowDebugMode && this.canEdit$$() && this.MENU_ITEMS.rotate,
            this.allowDebugMode && this.MENU_ITEMS.screenshot,
        ].filter(isDefinedOrTrue<MenuItem<ResourceNode>>);
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
        return null;
    });

    menuItemsByType: Partial<{
        [key in keyof ResourceNodeMap]:
            | MenuItem<ResourceNodeMap[key]>[]
            | MenuItemsFactoryCallback<ResourceNodeMap[key]>;
    }> = {
        [ResourceType.CAMERA]: (item): MenuItem<ResourceNode>[] =>
            [
                this.fullscreenAction$$(),
                this.allowDebugMode && this.canEdit$$() && this.MENU_ITEMS.rotate,
                this.allowDebugMode && this.MENU_ITEMS.resolution,
                this.allowDebugMode && this.MENU_ITEMS.zoomWindow,
                this.allowDebugMode && this.MENU_ITEMS.screenshot,
                this.allowDebugMode && this.MENU_ITEMS.divider,
                this.allowDebugMode && this.MENU_ITEMS.showOnItem,
                this.removeAction$$() && this.MENU_ITEMS.divider,
                this.removeAction$$(),
            ].filter(isDefinedOrTrue<MenuItem<ResourceNode>>),
        [ResourceType.SERVER]: item =>
            [
                this.fullscreenAction$$(),
                this.removeAction$$() && this.MENU_ITEMS.divider,
                this.removeAction$$(),
            ].filter(isDefinedOrTrue<MenuItem<ResourceNode>>),
    };

    constructor(
        @Inject(DOCUMENT) public document: Document,
        public ref: ElementRef<HTMLElement>,
        private resizeObserver: NxResizeObserver,
        configService: NxConfigService,
    ) {
        this.allowDebugMode = configService.getConfig().allowDebugMode;
        this.layoutsEditable = configService.getConfig().featureFlags.layoutsEditable || false;
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
