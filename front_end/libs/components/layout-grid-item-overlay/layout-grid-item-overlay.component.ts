import { DragDropModule } from '@angular/cdk/drag-drop';
import { CdkContextMenuTrigger, CdkMenuTrigger } from '@angular/cdk/menu';
import { CommonModule, formatDate } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    ElementRef,
    EventEmitter,
    HostListener,
    inject,
    input,
    NgZone,
    Output,
    signal,
    WritableSignal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import FileSaver from 'file-saver';
import { round } from 'lodash-es';
import { TourMatMenuModule } from 'ngx-ui-tour-md-menu';
import {
    throttleByFrameRate,
    WebRTCStreamManager,
} from 'nx-open-web/packages/webrtc-stream-manager';
import {
    distinctUntilChanged,
    EMPTY,
    finalize,
    firstValueFrom,
    fromEvent,
    map,
    merge,
    sampleTime,
    startWith,
    switchMap,
    tap,
    timer,
} from 'rxjs';

import { NxContextMenu } from '@components/context-menu/context-menu';
import {
    MenuItem,
    MenuItemAction,
    MenuItemsOrMenuItemsFactory,
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
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxResizeObserver } from '@directives/resize/nx-resize.directive';
import { NxTooltipV2Directive } from '@directives/tooltip-v2/tooltip-v2.directive';
import staticLang from '@language_static';
import { NxImageComponent } from '@pages/health/table-components/image/image.component';
import { PipesModule } from '@pipes/pipes.module';
import { LayoutStateService } from '@services/layout-state/layout-state.service';
import { selectActiveLayoutState } from '@services/layout-state/store/active-layout/active-layout.selectors';
import { selectCameraResolution } from '@services/layout-state/store/layouts-resolution/resolution.selectors';
import { Resolution } from '@services/layout-state/store/layouts-resolution/resolution.types';
import { nxConfig } from '@services/nx-config/config';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { LayoutItem } from '@services/system-api.types/layouts.types';
import { NxSystemRestAPI2 } from '@services/system-rest-api-v2.service';
import { NxSystem } from '@services/system.service/system';
import { NxSystemsService } from '@services/systems.service';
import { icons } from '@static-variables';
import { extractSystemAndResourceId } from '@utils/extract-system-and-resources';
import { cleanId, isDewarpingCapable } from '@utils/general';

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
        CdkContextMenuTrigger,
        CdkMenuTrigger,
        CommonModule,
        DragDropModule,
        NxAddSvgSrcDirective,
        NxContextMenu,
        NxImageComponent,
        NxLayoutGridTreeComponent,
        NxMonitoringGraphComponent,
        NxPreLoaderComponent,
        NxResizeObserver,
        NxTooltipV2Directive,
        PipesModule,
        TourMatMenuModule,
        TranslateModule,
    ],
    hostDirectives: [NxResizeObserver],
    exportAs: 'overlay',
})
export class NxLayoutGridItemOverlayComponent {
    item$$ = input.required<LayoutItem | undefined>({ alias: 'item' });
    node$$ = input.required<BaseResourceNode | null>({ alias: 'node' });
    hideRemove$$ = input.required({ alias: 'hideRemove' });

    hideInput$$ = input.required({ alias: 'hide' });
    fullScreenTarget$$ = input.required<HTMLElement | null>({ alias: 'fullScreenTarget' });
    canEdit$$ = input.required({ alias: 'canEdit' });
    system$$ = input.required<NxSystem>({ alias: 'system' });

    @Output() removeItem = new EventEmitter<LayoutItem>();

    toggleShowFishEye$ = signal<boolean | null>(null);

    showFisheye$$ = computed(() => {
        const toggled = this.toggleShowFishEye$();

        if (toggled !== null) {
            return toggled;
        }

        return !!this.item$$()?.dewarpingParams?.enabled;
    });

    isFullscreen$$ = signal(false);
    isMenuOpened$$ = signal(false);

    scale$ = this.resizeObserver.resize.pipe(
        throttleByFrameRate(),
        map(({ width, height }) => {
            const minWidth = 108;
            const minHeight = 72;
            const scaleWidth = minWidth / width;
            const scaleHeight = minHeight / height;
            const scaleClamp = 1;
            return round(Math.max(scaleWidth, scaleHeight, scaleClamp), 2);
        }),
        distinctUntilChanged(),
        untilDestroyed(this),
    );

    scaled$$ = toSignal(this.scale$.pipe(map(scale => scale !== 1)), { initialValue: false });

    getScaleStyle$ = this.scale$.pipe(
        throttleByFrameRate(),
        map(scale => ({
            'height.%': scale * 100,
            'width.%': scale * 100,
            transform: `scale(${1 / scale})`,
            'transform-origin': 'top left',
        })),
        untilDestroyed(this),
    );

    // TODO remove when Action Dispatcher for displayInfo is implemented
    // the name is long and stupid intentionally
    temporaryManualDisplayInfoToggle$$: WritableSignal<boolean | null> = signal(null);
    allowDebugMode: boolean;
    layoutsEditable: boolean;
    layoutsItemStatus: boolean;

    nodeName$$ = computed(() => {
        const node = this.node$$();
        const item = this.item$$();
        const name = node?.name || item?.name;
        const resourcePath = item?.resourcePath;
        const { systemId } = extractSystemAndResourceId(resourcePath || '');
        const currentSystemId =
            this.layoutStateService.paramStateHandler.state$$()?.params?.systemId;
        const systemName = this.systemsService.systems$$()?.find(({ id }) => id === systemId)?.name;

        if (!name || systemId === currentSystemId || !systemName) {
            return name || '';
        }

        return `${systemName} / ${name}`;
    });

    displayInfo$$ = computed(() => {
        if (!this.cameraOnline$$()) {
            return false;
        }
        const manualToggle = this.temporaryManualDisplayInfoToggle$$();
        if (manualToggle !== null) {
            return manualToggle;
        }
        return this.item$$()?.displayInfo || false;
    });
    hasStatus$$ = computed(() => {
        const node = this.node$$();
        const name = this.nodeName$$();
        return node && name && assertResourceOfType.camera(node);
    });
    primaryStream$$ = computed(() => {
        return this.cameraStreams$$() ? this.cameraStreams$$().primary : null;
    });
    secondaryStream$$ = computed(() => {
        return this.cameraStreams$$() ? this.cameraStreams$$().secondary : null;
    });
    disableResolution$$ = computed(() => {
        if (!this.cameraOnline$$()) {
            return true;
        }
        const primary = !!this.primaryStream$$();
        const secondary = !!this.secondaryStream$$();
        return (primary && !secondary) || (!primary && secondary);
    });
    cameraStreams$$ = computed(() => {
        const node = this.checkGetCameraNode();
        const result = {
            primary: null,
            secondary: null,
        };
        if (node?.details.online) {
            return (node.details.parameters.mediaStreams?.streams ?? []).reduce(
                (streams, stream) => {
                    if (stream.encoderIndex === 0) {
                        streams.primary = stream;
                    }
                    if (stream.encoderIndex === 1) {
                        streams.secondary = stream;
                    }
                    return streams;
                },
                result,
            );
        }
        return result;
    });
    cameraOnline$$ = computed(() => {
        const primaryStream = this.primaryStream$$();
        if (primaryStream) {
            const nonWebRtcCodec = primaryStream && [7, 173].includes(primaryStream.codec);
            if (!nonWebRtcCodec || this.system$$().version >= 6) {
                return true;
            }
        }

        return false;
    });

    extraCameraTooltip$$ = computed(() => {
        const node = this.checkGetCameraNode();
        return node ? `: ${node.name}` : '';
    });

    ngZone = inject(NgZone);

    bitrateInfo$ = toObservable(this.displayInfo$$).pipe(
        distinctUntilChanged(),
        switchMap(displayInfo => {
            const cameraNode = this.checkGetCameraNode();
            const mediaserver = this.system$$().mediaserver;

            if (!displayInfo || !cameraNode) {
                return EMPTY;
            }

            if (mediaserver instanceof NxSystemRestAPI2) {
                const {
                    loading,
                    streamType: { primary, secondary, stream },
                    resolution: { high, low },
                    connectionTypeMessages,
                    candidateTypeDescriptions,
                    relayed,
                } = staticLang.layouts.overlay.info;
                const mediaStreams = cameraNode.details.parameters?.mediaStreams?.streams || [];

                const sampleRateSeconds = 0.33;
                let sampleSizeSeconds = 0;
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

                return timer(0, sampleRateSeconds * 1000).pipe(
                    map(() => {
                        const videoLoaded = [
                            videoElement.videoWidth,
                            videoElement.videoHeight,
                        ].every(Boolean);

                        if (sampleSizeSeconds < maxBufferSeconds) {
                            sampleSizeSeconds += sampleRateSeconds;
                        }

                        const currentResolution = `${videoElement.videoWidth}x${videoElement.videoHeight}`;
                        const currentStream = mediaStreams.find(
                            ({ resolution }) => resolution === currentResolution,
                        );

                        const connection = this.ngZone.runOutsideAngular(() =>
                            WebRTCStreamManager.getInstance(cameraNode.details),
                        )!;

                        const hasStreamInfo = Boolean(currentStream);
                        const isPrimary = currentStream?.encoderIndex === 0;
                        const streamTitle = !hasStreamInfo
                            ? stream
                            : isPrimary
                              ? primary
                              : secondary;
                        const h265Regex = /hvc1|hev1|hevc/i;
                        const isH265 = h265Regex.test(connection?.mimeType || '');
                        const streamDescription = hasStreamInfo && {
                            value: isPrimary ? high : low,
                            params: {
                                codec: isH265 ? 'H265' : 'H264',
                            },
                        };

                        const connectionType = connection?.connectionType;

                        const debugConnectionInfo = connectionType
                            ? (() => {
                                  if (!nxConfig.allowDebugMode) {
                                      return connectionType.usingRelay ? [relayed] : [];
                                  }

                                  return [
                                      {
                                          value: connectionTypeMessages[
                                              connectionType.usingRelay ? 'relay' : 'peer'
                                          ][
                                              connectionType.localCandidateType ===
                                              connectionType.remoteCandidateType
                                                  ? 'matches'
                                                  : 'varies'
                                          ],
                                          params: connectionType as Omit<
                                              typeof connectionType,
                                              'usingRelay'
                                          >,
                                      },
                                      ...[
                                          ...new Set([
                                              connectionType.localCandidateType,
                                              connectionType.remoteCandidateType,
                                          ]),
                                      ].map(val => candidateTypeDescriptions[val]),
                                  ];
                              })()
                            : [];

                        return videoLoaded
                            ? [
                                  streamTitle,
                                  currentResolution,
                                  streamDescription,
                                  ...debugConnectionInfo,
                              ].filter(Boolean)
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
        throttleByFrameRate(),
        untilDestroyed(this),
    );

    @HostListener('document:fullscreenchange')
    onFullscreenChange(): void {
        this.isFullscreen$$.set(document.fullscreenElement === this.fullScreenTarget$$());
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
            checked$$: this.showFisheye$$,
            action: () => this.toggleShowFishEye$.set(!this.showFisheye$$()),
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
            disabled$$: computed(() => !this.cameraOnline$$()),
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
                const rotation = this.item$$()?.rotation;
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
            disabled$$: this.disableResolution$$,
            subMenu: async (node: ResourceNode) => {
                if (!assertResourceOfType.camera(node)) {
                    return;
                }
                const menuItems = [
                    {
                        resolution: Resolution.AUTO,
                        lang: LANG.resolutionAuto,
                    },
                    {
                        resolution: Resolution.LOW,
                        lang: LANG.resolutionLow,
                    },
                    {
                        resolution: Resolution.HIGH,
                        lang: LANG.resolutionHigh,
                    },
                ];

                const layoutId = await firstValueFrom(this.store.select(selectActiveLayoutState));

                const cameraResolution = await firstValueFrom(
                    this.store.select(selectCameraResolution(layoutId, node.details.id)),
                );

                return menuItems.reduce((menu: MenuItem<ResourceNode>[], menuItem) => {
                    menu.push({
                        id: menuItem.resolution,
                        ...menuItem.lang,
                        checked$$: signal(menuItem.resolution === cameraResolution),
                        action: () => {
                            this.layoutStateService.setCameraResolution({
                                layoutId,
                                cameraId: node.details.id,
                                resolution: menuItem.resolution,
                            });
                        },
                    });
                    return menu;
                }, []);
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
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const { videoHeight, videoWidth } = video;

                if (!ctx || !videoHeight || !videoWidth) {
                    return;
                }

                const fileName = `${encodeURIComponent(this.node$$()?.name || '')}_${formatDate(
                    new Date(),
                    'YYYY_MM_dd_HH_mm_ss',
                    navigator.language,
                )}.png`;

                const rotation = this.item$$()?.rotation || 0;
                const vertical = rotation % 180;
                canvas.width = vertical ? videoHeight : videoWidth;
                canvas.height = vertical ? videoWidth : videoHeight;

                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate((rotation * Math.PI) / 180);
                ctx.drawImage(video, -videoWidth / 2, -videoHeight / 2, videoWidth, videoHeight);

                FileSaver.saveAs(canvas.toDataURL('image/png'), fileName);
            },
        },
        fullscreenOn: {
            id: 'fullscreenOn',
            icon: icons.dirLayoutsOverlay + 'full_screen.svg',
            ...LANG.fullscreenOn,
            action: () => {
                this.fullScreenTarget$$()?.requestFullscreen({
                    navigationUI: 'hide',
                });
            },
        },
        fullscreenOff: {
            id: 'fullscreenOff',
            icon: icons.dirLayoutsOverlay + 'collapse.svg',
            ...LANG.fullscreenOff,
            action: () => {
                document.exitFullscreen();
            },
        },
        remove: {
            id: 'remove',
            icon: icons.dirLayoutsOverlay + 'close.svg',
            ...LANG.remove,
            action: ($event, item) => this.removeItem.emit(this.item$$()),
        },
        recording: {
            id: 'recording',
            icon: icons.dirLayoutsOverlay + 'camera_recording.svg',
            ...LANG.recording,
        },
        scheduled: {
            id: 'scheduled',
            icon: icons.dirLayoutsOverlay + 'camera_scheduled.svg',
            ...LANG.scheduled,
        },
        archive: {
            id: 'archive',
            icon: icons.dirLayoutsOverlay + 'camera_archive.svg',
            ...LANG.archive,
        },
        divider: {
            name: 'divider',
        },
        newTab: {
            id: 'openNewTab',
            ...LANG.openNewTab,
            action: ($event, node) => this.openWindow(node, false),
        },
        newWindow: {
            id: 'openNewWindow',
            ...LANG.openNewWindow,
            action: ($event, node) => this.openWindow(node, true),
        },
    };

    quickActions$$ = computed(() => {
        const cameraNode = this.checkGetCameraNode();

        if (!cameraNode) {
            return null;
        }

        return [
            this.allowDebugMode && this.canEdit$$() && this.MENU_ITEMS.ptz,
            nxConfig.featureFlags.layoutsFisheye &&
                isDewarpingCapable(cameraNode.details.dewarpingParams) &&
                this.MENU_ITEMS.fisheye,
            this.allowDebugMode && this.MENU_ITEMS.motion,
            this.allowDebugMode && this.canEdit$$() && this.MENU_ITEMS.object,
            this.allowDebugMode && this.canEdit$$() && this.MENU_ITEMS.zoomWindow,
            this.cameraOnline$$() && this.MENU_ITEMS.info,
            this.allowDebugMode && this.canEdit$$() && this.MENU_ITEMS.rotate,
            this.MENU_ITEMS.screenshot,
        ].filter(Boolean) as (false | MenuItem<ResourceNode>)[];
    });

    recordingIcon$$ = computed(() => {
        const node = this.node$$();
        const recordingStatus =
            node &&
            assertResourceOfType.camera(node) &&
            node.details.recordingStatus?.toLowerCase();
        if (recordingStatus) {
            return this.MENU_ITEMS[recordingStatus];
        }
        return null;
    });

    quickActionsMenu$$ = computed(() => {
        const type = this.node$$()?.type;
        if (type && this.menuItemsByType[type]) {
            return this.MENU_ITEMS.menu;
        }
        return undefined;
    });

    fullscreenAction$$ = computed(() => {
        return this.MENU_ITEMS[this.isFullscreen$$() ? 'fullscreenOff' : 'fullscreenOn'];
    });

    removeAction$$ = computed(() => {
        if (this.hideRemove$$()) {
            return null;
        }

        return {
            ...this.MENU_ITEMS.remove,
            disabled$$: signal(!this.canEdit$$()),
        };
    });

    mouseInactive$$ = toSignal(
        merge(
            fromEvent<MouseEvent>(document, 'mousemove'),
            fromEvent<KeyboardEvent>(document, 'keydown'),
            fromEvent<MouseEvent>(document, 'mousedown'),
        ).pipe(
            throttleByFrameRate(),
            sampleTime(250),
            switchMap(() =>
                timer(15_000).pipe(
                    map(() => true),
                    startWith(false),
                ),
            ),
        ),
    );

    hide$$ = computed(() => {
        return this.hideInput$$() || (!this.isMenuOpened$$() && this.mouseInactive$$());
    });

    menuItemsByType: Partial<{
        [key in keyof ResourceNodeMap]: MenuItemsOrMenuItemsFactory<ResourceNodeMap[key]>;
    }> = {
        [ResourceType.CAMERA]: (item): MenuItem<ResourceNode>[] =>
            (
                [
                    this.MENU_ITEMS.newTab,
                    this.MENU_ITEMS.newWindow,
                    this.MENU_ITEMS.divider,
                    this.fullscreenAction$$(),
                    this.MENU_ITEMS.showOnItem,
                    this.MENU_ITEMS.screenshot,
                    this.allowDebugMode && this.canEdit$$() && this.MENU_ITEMS.rotate,
                    nxConfig.featureFlags.layoutsItemChangeResolution && this.MENU_ITEMS.resolution,
                    this.allowDebugMode && this.MENU_ITEMS.zoomWindow,
                    this.removeAction$$() && this.MENU_ITEMS.divider,
                    this.removeAction$$(),
                ] as MenuItem<ResourceNode>[]
            ).filter(Boolean),
        [ResourceType.SERVER]: item =>
            (
                [
                    this.fullscreenAction$$(),
                    this.removeAction$$() && this.MENU_ITEMS.divider,
                    this.removeAction$$(),
                ] as MenuItem<ResourceNode>[]
            ).filter(Boolean),
    };

    constructor(
        public ref: ElementRef<HTMLElement>,
        private resizeObserver: NxResizeObserver,
        configService: NxConfigService,
        public layoutStateService: LayoutStateService,
        private router: Router,
        private store: Store,
        private systemsService: NxSystemsService,
    ) {
        this.allowDebugMode = configService.getConfig().allowDebugMode;
        this.layoutsItemStatus = !!configService.getConfig().featureFlags.layoutsItemStatus;
        this.layoutsEditable = !!configService.getConfig().featureFlags.layoutsEditable;
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

    // should be moved to common component to be reused on grid and tree and overlay
    openWindow = (node: ResourceNode | undefined, isNewWindow = false): void => {
        const id = node?.details?.id;
        if (!id) {
            return;
        }

        const params = [`${this.router.url.split('layouts')[0]}layouts/${cleanId(id)}`, '_blank'];
        if (isNewWindow) {
            params.push('"width=100%, height=100%"');
        }

        window.open(...params);
    };
    protected readonly staticLang = staticLang;
}
