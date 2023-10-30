import { DragDropModule } from '@angular/cdk/drag-drop';
import { CdkMenuTrigger } from '@angular/cdk/menu';
import { CommonModule, DOCUMENT, formatDate } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    ElementRef,
    EventEmitter,
    HostListener,
    Inject,
    Input,
    LOCALE_ID,
    Output,
    signal,
    WritableSignal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import FileSaver from 'file-saver';
import { round } from 'lodash-es';
import { TourMatMenuModule } from 'ngx-ui-tour-md-menu';
import {
    distinctUntilChanged,
    map,
    switchMap,
    EMPTY,
    interval,
    finalize,
    startWith,
    tap,
} from 'rxjs';

import { NxContextMenu } from '@components/context-menu/context-menu';
import {
    MenuItem,
    MenuItemAction,
    MenuItemsOrMenuItemsCallback,
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
    item$$ = signal<LayoutItem | null>(null);
    @Input() set item(value: LayoutItem) {
        this.item$$.set(value);
    }
    node$$ = signal<BaseResourceNode | null>(null);
    @Input() set node(value: BaseResourceNode) {
        this.node$$.set(value);
    }
    showRemove$$ = signal(false);
    @Input() set showRemove(value: boolean) {
        this.showRemove$$.set(value);
    }
    @Input() hide: boolean;
    @Input() fullScreenTarget: HTMLElement;
    canEdit$$ = signal(true);
    @Input() set canEdit(value: boolean) {
        this.canEdit$$.set(value);
    }
    @Input() system: NxSystem;

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
        if (node?.details.online) {
            const primaryStream = (node.details.parameters.mediaStreams?.streams ?? []).find(
                ({ encoderIndex }) => encoderIndex === 0,
            );

            const nonWebRtcCodec = primaryStream && [7, 173].includes(primaryStream.codec);
            if (!nonWebRtcCodec || this.system.version >= 6) {
                return true;
            }
        }

        return false;
    });

    extraCameraTooltip$$ = computed(() => {
        const node = this.checkGetCameraNode();
        return node ? `: ${node.name}` : '';
    });

    bitrateInfo$ = toObservable(this.displayInfo$$).pipe(
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
                    loading,
                    streamType: { primary, secondary, stream },
                    resolution: { high, low },
                } = staticLang.layouts.overlay.info;
                const mediaStreams = cameraNode.details.parameters?.mediaStreams?.streams || [];

                const sampleRateSeconds = 0.33;
                let sampleSizeSeconds = 0;
                const minSampleSizeSeconds = 0.66;
                const maxBufferSeconds = 6;

                const videoElement =
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    this.ref.nativeElement.querySelector<HTMLVideoElement>(
                        'video.original-stream',
                    )!;
                let frames: number[] = [];
                let rvfcHandle: number;
                const updateFrames = (): void => {
                    frames.push(videoElement.currentTime);
                    rvfcHandle = videoElement.requestVideoFrameCallback(updateFrames);
                };
                const removeRvfc = (): void => videoElement.cancelVideoFrameCallback(rvfcHandle);

                updateFrames();

                return interval(sampleRateSeconds * 1000).pipe(
                    startWith(0),
                    map(() => {
                        const videoLoaded = [
                            videoElement.videoWidth,
                            videoElement.videoHeight,
                        ].every(Boolean);

                        if (sampleSizeSeconds < maxBufferSeconds) {
                            sampleSizeSeconds += sampleRateSeconds;
                        }

                        const actualFps =
                            sampleSizeSeconds < minSampleSizeSeconds
                                ? 0
                                : frames.length / sampleSizeSeconds;
                        const currentResolution = `${videoElement.videoWidth}x${videoElement.videoHeight}`;
                        const currentStream = mediaStreams.find(
                            ({ resolution }) => resolution === currentResolution,
                        );

                        const codecLookup = {
                            27: 'H264',
                            173: 'H265',
                            7: 'MJPEG',
                        };

                        const hasStreamInfo = Boolean(currentStream);
                        const isPrimary = currentStream?.encoderIndex === 0;
                        const streamTitle = !hasStreamInfo
                            ? stream
                            : isPrimary
                            ? primary
                            : secondary;
                        const streamDescription = hasStreamInfo && {
                            value: isPrimary ? high : low,
                            params: { codec: codecLookup[currentStream.codec] },
                        };
                        const fpsText = actualFps && {
                            value: fps,
                            params: { fps: actualFps.toFixed(2) },
                        };
                        return videoLoaded
                            ? [streamTitle, fpsText, currentResolution, streamDescription].filter(
                                  Boolean,
                              )
                            : [streamTitle, loading];
                    }),
                    tap(() => {
                        frames = frames.filter(
                            frame => frame > videoElement.currentTime - maxBufferSeconds,
                        );
                    }),
                    finalize(removeRvfc),
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

    readonly MENU_ITEMS: Record<string, MenuItem<ResourceNode>> = {
        menu: {
            id: 'menu',
            icon: icons.dirLayoutsOverlay + 'menu.svg',
            ...LANG.menu,
        },
        ptz: {
            id: 'ptz',
            icon: icons.dirLayoutsOverlay + 'ptz.svg',
            ...LANG.ptz,
            ...EMPTY_MENU_ACTION,
        },
        fisheye: {
            id: 'fisheye',
            icon: icons.dirLayoutsOverlay + 'fisheye.svg',
            ...LANG.fisheye,
            ...EMPTY_MENU_ACTION,
        },
        motion: {
            id: 'motion',
            icon: icons.dirLayoutsOverlay + 'motion.svg',
            ...LANG.motion,
            ...EMPTY_MENU_ACTION,
        },
        object: {
            id: 'object',
            icon: icons.dirLayoutsOverlay + 'object.svg',
            ...LANG.object,
            ...EMPTY_MENU_ACTION,
        },
        zoomWindow: {
            id: 'zoomWindow',
            icon: icons.dirLayoutsOverlay + 'zoom_window.svg',
            ...LANG.zoomWindow,
            ...EMPTY_MENU_ACTION,
        },
        info: {
            id: 'info',
            icon: icons.dirLayoutsOverlay + 'info.svg',
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
            icon: icons.dirLayoutsOverlay + 'rotate.svg',
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
            icon: icons.dirLayoutsOverlay + 'screenshot.svg',
            ...LANG.screenshot,
            action: () => {
                const video = this.ref.nativeElement.querySelector(
                    'video.web-rtc-stream',
                ) as HTMLVideoElement;
                if (!video) {
                    return;
                }
                const canvas = this.document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const { videoHeight, videoWidth } = video;

                if (!ctx || !videoHeight || !videoWidth) {
                    return;
                }

                const fileName = `${encodeURIComponent(this.node$$()?.name || '')}_${formatDate(
                    new Date(),
                    'YYYY_MM_dd_HH_mm_ss',
                    this.locale,
                )}.png`;

                const vertical = this.item$$().rotation % 180;
                canvas.width = vertical ? videoHeight : videoWidth;
                canvas.height = vertical ? videoWidth : videoHeight;

                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate((this.item$$().rotation * Math.PI) / 180);
                ctx.drawImage(video, -videoWidth / 2, -videoHeight / 2, videoWidth, videoHeight);

                FileSaver.saveAs(canvas.toDataURL('image/png'), fileName);
            },
        },
        fullscreenOn: {
            id: 'fullscreenOn',
            icon: icons.dirLayoutsOverlay + 'full_screen.svg',
            ...LANG.fullscreenOn,
            action: () => {
                this.fullScreenTarget.requestFullscreen({
                    navigationUI: 'hide',
                });
            },
        },
        fullscreenOff: {
            id: 'fullscreenOff',
            icon: icons.dirLayoutsOverlay + 'collapse.svg',
            ...LANG.fullscreenOff,
            action: () => {
                this.document.exitFullscreen();
            },
        },
        remove: {
            id: 'remove',
            icon: icons.dirLayoutsOverlay + 'close.svg',
            ...LANG.remove,
            action: ($event, item) => this.removeItem.emit(this.item$$()),
        },
        recordingOn: {
            id: 'recordingOn',
            icon: icons.dirLayoutsOverlay + 'camera_rec_on.svg',
            ...LANG.recordingOn,
        },
        recordingOff: {
            id: 'recordingOff',
            icon: icons.dirLayoutsOverlay + 'camera_rec_off.svg',
            ...LANG.recordingOff,
        },
        divider: {
            name: 'divider',
        },
    };

    quickActions$$ = computed(() => {
        if (!this.checkGetCameraNode()) {
            return null;
        }
        return [
            this.allowDebugMode && this.canEdit$$() && this.MENU_ITEMS.ptz,
            this.allowDebugMode && this.MENU_ITEMS.fisheye,
            this.allowDebugMode && this.MENU_ITEMS.motion,
            this.allowDebugMode && this.canEdit$$() && this.MENU_ITEMS.object,
            this.allowDebugMode && this.canEdit$$() && this.MENU_ITEMS.zoomWindow,
            this.cameraOnline$$() && this.MENU_ITEMS.info,
            this.allowDebugMode && this.canEdit$$() && this.MENU_ITEMS.rotate,
            this.MENU_ITEMS.screenshot,
        ].filter(Boolean);
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
        if (this.canEdit$$() && this.showRemove$$() && !this.isFullscreen$$()) {
            return this.MENU_ITEMS.remove;
        }
        return null;
    });

    menuItemsByType: Partial<{
        [key in keyof ResourceNodeMap]: MenuItemsOrMenuItemsCallback<ResourceNodeMap[key]>;
    }> = {
        [ResourceType.CAMERA]: (item): MenuItem<ResourceNode>[] =>
            [
                this.fullscreenAction$$(),
                this.allowDebugMode && this.canEdit$$() && this.MENU_ITEMS.rotate,
                this.allowDebugMode && this.MENU_ITEMS.resolution,
                this.allowDebugMode && this.MENU_ITEMS.zoomWindow,
                this.MENU_ITEMS.screenshot,
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
        @Inject(LOCALE_ID) private locale: string,
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
        if (!node || !assertResourceOfType.camera(node)) {
            return null;
        }
        return node;
    }
}
