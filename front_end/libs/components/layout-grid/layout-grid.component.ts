import { CdkDrag, CdkDropList, DragDropModule } from '@angular/cdk/drag-drop';
import { PortalModule } from '@angular/cdk/portal';
import { NestedTreeControl } from '@angular/cdk/tree';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    computed,
    EventEmitter,
    HostListener,
    Inject,
    Input,
    Output,
    signal,
    Signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { cloneDeep, flatten, groupBy, isEqual, mapValues, pick, values } from 'lodash-es';
import { TourMatMenuModule, TourService } from 'ngx-ui-tour-md-menu';
import {
    BehaviorSubject,
    combineLatest,
    forkJoin,
    from,
    fromEvent,
    interval,
    Observable,
    of,
    Subject,
    throwError,
} from 'rxjs';
import {
    catchError,
    delay,
    delayWhen,
    distinctUntilChanged,
    filter,
    map,
    repeat,
    retry,
    shareReplay,
    startWith,
    switchMap,
    take,
    tap,
    timeout,
} from 'rxjs/operators';
import { v4 as uuid } from 'uuid';

import { NxMonitoringGraphComponent } from '@components/graph/graph.component';
import { NxLayoutGridItemOverlayComponent } from '@components/layout-grid-item-overlay/layout-grid-item-overlay.component';
import { NxLayoutGridTreeComponent } from '@components/layout-grid-tree/layout-grid-tree.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { ToastType } from '@components/toast-container/toast.types';
import { VideoPlayerModule } from '@components/video-player/video-player.module';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxClickElsewhereDirective } from '@directives/nx-click-elsewhere';
import { NxResizeObserver } from '@directives/resize/nx-resize.directive';
import staticLang from '@language_static';
import { ConnectionError, WebRTCStreamManager } from '@openLibs/webrtc-stream-manager';
import { NxImageComponent } from '@pages/health/table-components/image/image.component';
import { Translatable } from '@pipes/nx-translate.types';
import { PipesModule } from '@pipes/pipes.module';
import { NxLayoutGridService } from '@services/layout-grid/layout-grid.service';
import { LayoutStateService } from '@services/layout-state/layout-state.service';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxPageService } from '@services/page.service';
import { Layout, LayoutItem, LayoutItems } from '@services/system-api.types';
import {
    CameraStatus,
    NxSystemCamera,
} from '@services/system.service/camera-manager/camera-manager-types';
import { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';
import { NxToastService } from '@services/toast.service';
import { WINDOW } from '@services/window-provider';
import { icons } from '@static-variables';
import { ViewportBreakpoints } from '@styles/theme-variables-common';
import { cleanId, dirtyId } from '@utils/general';
import { NgChanges } from '@utils/ng-changes';
import { ExtractObservable } from '@utils/type-helpers';
import { WebGLTimelineModule } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/webgl-timeline.module';

import { assertResourceOfType, assertResourceParentNode } from './layout-grid.type-guards';
import {
    LayoutRenderConfig,
    LayoutResourceTree,
    ParsedLayout,
    ParsedLayoutItem,
    ParsedLayoutItems,
    PlaceholderClasses,
    PlaceholderState,
    Point,
    Position,
    ResourceNode,
    ResourceType,
    Setting,
    Size,
} from './layout-grid.types';

const SETTINGS_CONFIG: Setting[] = [
    { label: 'Layout', type: 'heading' },
    { name: 'name', label: 'Layout Name', type: 'string' },
    { name: 'locked', label: 'Locked', type: 'boolean' },
    { name: 'logicalId', label: 'Logical Identifier', type: 'number', step: 1, min: 0, max: 1 },
    {
        name: 'cellAspectRatio',
        label: 'Cell Aspect Ratio',
        type: 'number',
        step: 'any',
        min: 0.3,
        max: 4,
    },
    { name: 'cellSpacing', label: 'Cell Spacing', type: 'number', step: 0.01, min: 0, max: 0.25 },
    { name: 'fixedHeight', label: 'Fixed Height', type: 'number', step: 1, min: 0, max: 999 },
    { name: 'fixedWidth', label: 'Fixed Width', type: 'number', step: 1, min: 0, max: 999 },
    { label: 'Background', type: 'heading' },
    { name: 'backgroundImageFilename', label: 'Background Image Filename', type: 'readonly' },
    {
        name: 'backgroundOpacity',
        label: 'Background Opacity',
        type: 'number',
        step: 'any',
        min: 0,
        max: 1,
    },
    {
        name: 'backgroundHeight',
        label: 'Background Height',
        type: 'number',
        step: 1,
        min: -1,
        max: 99999,
    },
    {
        name: 'backgroundWidth',
        label: 'Background Width',
        type: 'number',
        step: 1,
        min: -1,
        max: 99999,
    },
];

const DEFAULT_ASPECT_RATIO = 1.7777777910232544 as const;
const DEFAULT_CELL_ASPECT_RATIO = DEFAULT_ASPECT_RATIO;

interface Transform {
    transform: string;
    transformOrigin: string;
}

interface HighlightTransform {
    [id: string]: Transform;
}

type HighlightState = Point & Size & { resize: Point } & HighlightTransform;

interface DragPosition extends Size {
    move: Point;
    resize: Point;
    origin: Point;
    transformOrigin: string;
    id: string;
}

interface Collisions {
    moveTo?: unknown;
    opacity?: number;
    background?: string;
}

enum VerticalAlign {
    TOP = 'top',
    BOTTOM = 'bottom',
}

enum HorizontalAlign {
    LEFT = 'left',
    RIGHT = 'right',
}

const calculateResize = (
    { x, y }: Point,
    { width, height }: Size,
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    [horizontalOrVerticalAlign, horizontalAlign]: NxLayoutGridComponent['alignments'][number] = [
        VerticalAlign.BOTTOM,
        HorizontalAlign.RIGHT,
    ],
    origin: Point,
): { move?: Point; resize: Point; transformOrigin?: string } => {
    const verticalAlign = Object.values(VerticalAlign).includes(
        horizontalOrVerticalAlign as VerticalAlign,
    )
        ? (horizontalOrVerticalAlign as VerticalAlign)
        : null;

    horizontalAlign = verticalAlign
        ? horizontalAlign
        : (horizontalOrVerticalAlign as HorizontalAlign);

    const move = { x: 0, y: 0 };

    const moveMinX = Math.abs(x) < width && Math.abs(x) > 16;
    const moveMinY = Math.abs(y) < height && Math.abs(y) > 16;
    const calcX = moveMinX ? (x > 0 ? 1 : -1) : 0;
    const calcY = moveMinY ? (y > 0 ? 1 : -1) : 0;
    const actualX = Math.round(x / width);
    const actualY = Math.round(y / height);

    x = Math.abs(actualX) > Math.abs(calcX) ? actualX : calcX;
    y = Math.abs(actualY) > Math.abs(calcY) ? actualY : calcY;

    const initialState = {
        resize: {
            x: 0,
            y: 0,
        },
        transformOrigin: 'top left',
    };

    if (!x && !y) {
        return initialState;
    }

    if (verticalAlign === VerticalAlign.TOP) {
        y *= -1;
    }

    if (!verticalAlign) {
        y = x;
    }

    if (!horizontalAlign) {
        x = y;
    }

    x = [x, y].find(val => Math.abs(val) === Math.min(Math.abs(x), Math.abs(y)));
    y = x;

    if (verticalAlign === VerticalAlign.TOP) {
        move.y = -y;
        initialState.transformOrigin = initialState.transformOrigin.replace(
            VerticalAlign.TOP,
            VerticalAlign.BOTTOM,
        );
    }

    if (horizontalAlign === HorizontalAlign.LEFT) {
        x *= -1;
        move.x = -x;
        initialState.transformOrigin = initialState.transformOrigin.replace(
            HorizontalAlign.LEFT,
            HorizontalAlign.RIGHT,
        );
    }

    initialState.resize.x = x;
    initialState.resize.y = y;

    if (verticalAlign === VerticalAlign.TOP && horizontalAlign === HorizontalAlign.LEFT) {
        return {
            ...initialState,
            move: {
                x: -initialState.resize.x,
                y: initialState.resize.y,
            },
        };
    }

    return { ...initialState, move };
};

@UntilDestroy()
@Component({
    selector: 'nx-layout-grid',
    templateUrl: 'layout-grid.component.html',
    styleUrls: ['layout-grid.component.scss'],
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
        NxClickElsewhereDirective,
        PortalModule,
        NxLayoutGridItemOverlayComponent,
    ],
})
export class NxLayoutGridComponent {
    @Input() layout: Layout;
    @Input() layoutItemLookup: LayoutResourceTree;
    @Input() system: NxSystem;
    @Input() cameras: string[];

    @Output() layoutChanged = new EventEmitter<string>();
    @Output() showPtz = new EventEmitter<NxSystemCamera>();

    @HostListener('document:keydown.escape', ['$event']) onKeydownHandler(
        event: KeyboardEvent,
    ): void {
        this.removeFocus();
        this.layoutStateService.portal = null;
    }

    ngOnDestroy(): void {
        this.layoutStateService.portal = null;
    }

    editCameras$$: Signal<boolean> = computed(
        () => this.system.permissionManager.permissions$$().editCameras || false,
    );

    #lastWidth: number = Infinity;

    alignments: ([VerticalAlign, HorizontalAlign] | [VerticalAlign] | [HorizontalAlign])[] = [
        [VerticalAlign.BOTTOM, HorizontalAlign.RIGHT],
        [VerticalAlign.BOTTOM, HorizontalAlign.LEFT],
        [VerticalAlign.TOP, HorizontalAlign.RIGHT],
        [VerticalAlign.TOP, HorizontalAlign.LEFT],
        [VerticalAlign.BOTTOM],
        [VerticalAlign.TOP],
        [HorizontalAlign.RIGHT],
        [HorizontalAlign.LEFT],
    ];

    assertResourceOfType = assertResourceOfType;
    unsavedStates = staticLang.layouts.unsavedStates;

    mouseMoving$ = fromEvent(this.window.document, 'mousemove').pipe(
        switchMap(() => of(false).pipe(delay(5000), startWith(true))),
        distinctUntilChanged(),
        shareReplay({ bufferSize: 1, refCount: false }),
    );

    @HostListener('window:resize', ['$event'])
    onResize({ target: { innerWidth: width } }: { target: Window }): void {
        const closeOnResize =
            this.#lastWidth > ViewportBreakpoints.Tablet.width &&
            width <= ViewportBreakpoints.Tablet.width;

        const openOnResize =
            this.#lastWidth < ViewportBreakpoints.Tablet.width &&
            width > ViewportBreakpoints.Tablet.width;

        if (closeOnResize) {
            this.layoutGridService.handleMenuClose();
        } else if (openOnResize) {
            this.layoutGridService.handleMenuOpen();
        }

        this.#lastWidth = width;
    }

    SAVE_DELAY = 0;

    treeControl = new NestedTreeControl<ResourceNode, string>(
        node => (assertResourceParentNode(node) ? node.children : []),
        {
            trackBy: node => node.details?.id,
        },
    );

    previousOpenMenu: 'left' | 'right' | 'both' = null;
    unsaved: Layout | false = false;
    addingItem$$ = signal(false);
    addOffset = 0;
    changingLayout: string | boolean = true;
    errors: Record<string, string> = {};
    skipDefaultCredentialsCheck: Record<string, true> = {};
    errorIcons: Record<string, string> = {};
    additionalErrorMessages: Record<string, Translatable> = {};
    icons = icons;
    readonly RESOURCE_TYPE = ResourceType;
    readonly EDGE_GAP = 60;
    readonly INITIAL_DRAG_STATE = {
        move: { x: 0, y: 0 },
        resize: { x: 0, y: 0 },
        id: '',
        transformOrigin: 'top left',
    };
    readonly SETTINGS_CONFIG = SETTINGS_CONFIG;

    initialLayout$ = new BehaviorSubject<Layout>(null);
    #wrapperSize$ = new BehaviorSubject<Size>(null);
    unsubTooltip$ = new Subject<string>();

    // : Observable<{ items: ParsedLayoutItems[], renderConfig: any }>
    layout$ = combineLatest([this.initialLayout$, this.#wrapperSize$]).pipe(
        filter(([layout]) => !!layout),
        map(
            ([layout, wrapperSize]) =>
                [
                    this.parseLayout({
                        ...layout,
                        items: this.filterRemovedResources(layout.items || []),
                    }),
                    wrapperSize,
                ] as const,
        ),
        map(([{ items, renderConfig, ...layout }, size]) => ({
            ...layout,
            renderConfig,
            items: this.annotateWithRenderConfig({ items, renderConfig, ...layout }, size),
        })),
        shareReplay({
            bufferSize: 1,
            refCount: true,
        }),
    );

    showTooltip$ = this.#wrapperSize$.pipe(
        filter(Boolean),
        map(
            ({ width }) =>
                !this.window.matchMedia('(any-hover: none)').matches &&
                width > 288 &&
                this.#lastWidth >= ViewportBreakpoints.Tablet.width,
        ),
    );

    removeFocusDefault: () => void = () => null;
    removeFocus: () => void = this.removeFocusDefault;

    focusToggle = (id: string): void => {
        if (this.removeFocus !== this.removeFocusDefault) {
            this.removeFocus();
            return;
        }

        const originalLayout = cloneDeep(this.layout);
        this.initialLayout$.next({
            ...originalLayout,
            items: [this.layout.items.find(({ id: itemId }) => itemId === id)],
        });
        this.removeFocus = () => {
            this.initialLayout$.next(originalLayout);
            this.removeFocus = this.removeFocusDefault;
        };
    };

    resizeItem = ($event: Size, dragContainer: HTMLElement): void => {
        const aspectRatio = parseFloat(dragContainer.style?.aspectRatio.split('/')[0]);

        if (!aspectRatio) {
            dragContainer.classList.remove('wide', 'narrow');
            return;
        }

        const wide = $event.width / $event.height > aspectRatio;
        dragContainer.classList.toggle('wide', wide);
        dragContainer.classList.toggle('narrow', !wide);
    };

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    calculateAspect = ([
        { width: wrapperWidth, height: wrapperHeight },
        {
            cellAspectRatio,
            items,
            renderConfig: { gridWrapper, rows, columns, origin },
        },
    ]: [Size, ExtractObservable<typeof this.layout$>]) => {
        const findCommonAspectRatio = (items: ParsedLayoutItems): number => {
            const aspects = items
                .map(({ resourceId, rotation }) => {
                    const unknownItem = this.layoutItemLookup[resourceId];
                    if (assertResourceOfType.camera(unknownItem)) {
                        const initialAspect =
                            unknownItem.details.parameters?.overrideAr ||
                            unknownItem.details.defaultRatio;
                        const isRotated = Boolean(
                            (Math.round(
                                (rotation || unknownItem.details.parameters?.rotation || 0) / 90,
                            ) *
                                90) %
                                180,
                        );

                        return isRotated ? 1 / initialAspect : initialAspect;
                    }

                    return null;
                })
                .filter(Boolean);
            const commonAspect = aspects.every(aspect => aspect === aspects[0]) && aspects[0];
            return commonAspect || DEFAULT_CELL_ASPECT_RATIO;
        };
        wrapperWidth = wrapperWidth - this.EDGE_GAP;
        wrapperHeight = wrapperHeight - this.EDGE_GAP;
        cellAspectRatio ||=
            items.length === 1 ? wrapperWidth / wrapperHeight : findCommonAspectRatio(items);
        const aspect = wrapperWidth / columns / (wrapperHeight / rows);
        const tooWide = aspect > cellAspectRatio;
        const calcWidth = tooWide
            ? (wrapperHeight / rows) * columns * cellAspectRatio
            : wrapperWidth;
        const calcHeight = tooWide
            ? wrapperHeight
            : ((wrapperWidth / columns) * rows) / cellAspectRatio;
        const width = `${calcWidth}px`;
        const height = `${calcHeight}px`;
        const cellSize = {
            width: calcWidth / columns,
            height: calcHeight / rows,
        };
        const wrapperPosition = {
            left: (wrapperWidth - calcWidth + this.EDGE_GAP) / 2,
            top: (wrapperHeight - calcHeight + this.EDGE_GAP) / 2,
        };
        const outerWrapper = {
            'background-position': `${wrapperPosition.left}px ${wrapperPosition.top}px`,
            'background-size': `${cellSize.width}px ${cellSize.height}px`,
        };
        this.addOffset = cellSize.height / 2;
        return {
            width,
            height,
            outerWrapper,
            wrapperPosition,
            cellSize,
            origin,
            ...gridWrapper,
        };
    };

    aspectHandler$ = combineLatest([this.#wrapperSize$, this.layout$]).pipe(
        filter(([wrapper]) => !!wrapper),
        map(this.calculateAspect),
        shareReplay({
            bufferSize: 1,
            refCount: true,
        }),
    );

    previewSize$ = this.aspectHandler$.pipe(
        map(({ cellSize: { width, height } }) => ({ 'width.px': width, 'height.px': height })),
        shareReplay({
            bufferSize: 1,
            refCount: false,
        }),
        untilDestroyed(this),
    );

    #draggingPosition$ = new BehaviorSubject(
        this.INITIAL_DRAG_STATE as {
            move?: { x: number; y: number };
            id: string;
            resize?: { x: number; y: number };
            alignment?: NxLayoutGridComponent['alignments'][number];
            transformOrigin?: string;
        },
    );

    draggingPosition$$ = toSignal(this.#draggingPosition$);

    dragging$$ = computed(() => {
        const { move = {}, resize = {} } = this.draggingPosition$$();
        return [...Object.values(move), ...Object.values(resize)].some(Boolean);
    });

    getCursor = (): string => {
        if (this.addingItem$$()) {
            return 'copy';
        }

        if (this.dragging$$()) {
            return 'move';
        }

        return 'inherit';
    };

    cursorStyle$$ = computed(() => ({ cursor: this.getCursor() }));

    #distinctDraggingPosition$: Observable<DragPosition> = combineLatest([
        this.#draggingPosition$,
        this.aspectHandler$,
    ]).pipe(
        map(
            ([
                {
                    move = this.INITIAL_DRAG_STATE.move,
                    resize = this.INITIAL_DRAG_STATE.resize,
                    id,
                    transformOrigin = this.INITIAL_DRAG_STATE.transformOrigin,
                    alignment,
                },
                {
                    cellSize: { width, height },
                    wrapperPosition,
                    origin,
                },
            ]) => ({
                transformOrigin,
                move:
                    id === 'added'
                        ? this.calculatePosition(move, {
                              cellSize: { width, height },
                              wrapperPosition,
                              origin,
                          })
                        : {
                              x: Math.round(move.x / width),
                              y: Math.round(move.y / height),
                          },
                ...calculateResize(resize, { width, height }, alignment, origin),
                id,
                width,
                height,
                origin,
            }),
        ),
        distinctUntilChanged(isEqual),
        shareReplay({
            bufferSize: 1,
            refCount: true,
        }),
    );

    highlightState$: Observable<HighlightState> = this.#distinctDraggingPosition$.pipe(
        map(
            ({ move: { x, y }, resize, transformOrigin, id, width, height, origin }) =>
                <HighlightState>{
                    [id]: {
                        // TODO: Use resize to determine scale,
                        transform:
                            this.getScale(id, resize) ||
                            `translate(${(id === 'added' ? x - origin.x : x) * width}px, ${
                                (id === 'added' ? y - origin.y : y) * height
                            }px)`,
                        transformOrigin,
                    },
                    x,
                    y,
                    resize,
                    width,
                    height,
                },
        ),
        shareReplay({
            bufferSize: 1,
            refCount: true,
        }),
    );

    #collisions$ = this.#distinctDraggingPosition$.pipe(
        map(({ id, move, resize }) => {
            const currentlyDragging = this.layout.items.find(({ id: itemId }) => itemId === id);

            if (!currentlyDragging) {
                const { y: top, x: left } = move;
                return id
                    ? {
                          id: 'added',
                          top,
                          bottom: top + 1,
                          left,
                          right: left + 1,
                      }
                    : {};
            }
            const constrainedResize = this.getConstraint(currentlyDragging, resize);

            return {
                ...currentlyDragging,
                top: currentlyDragging.top + move.y,
                bottom: currentlyDragging.bottom + move.y + constrainedResize.y,
                left: currentlyDragging.left + move.x,
                right: currentlyDragging.right + move.x + constrainedResize.x,
            };
        }),
        map(draggingItem => ({
            draggingItem,
            collisions: this.layout.items.reduce(
                (collided, item) =>
                    this.checkCollision(item, draggingItem)
                        ? { ...collided, [item.id]: item }
                        : collided,
                {},
            ),
        })),
        shareReplay({
            bufferSize: 1,
            refCount: true,
        }),
    );

    collisions$: Observable<Collisions> = combineLatest([this.#collisions$, this.layout$]).pipe(
        map(([{ draggingItem, collisions }, { items }]) =>
            Object.keys(collisions).reduce((collisions, currentId) => {
                const current = items.find(({ id }) => id === currentId && id !== draggingItem.id);
                if (!current) {
                    return collisions;
                }

                return {
                    ...collisions,
                    [currentId]: this.getCollisionStyle(current, draggingItem, items),
                    [draggingItem.id]: {
                        opacity: 0.25,
                        background: 'var(--error)',
                    },
                };
            }, {}),
        ),
        shareReplay({
            bufferSize: 1,
            refCount: true,
        }),
    );

    LANG = staticLang;
    CONFIG: IConfig;
    playable: string[] = ['online', 'recording', 'scheduled'];

    constructor(
        configService: NxConfigService,
        private cd: ChangeDetectorRef,
        private dialogsService: NxDialogsService,
        private toastService: NxToastService,
        public tourService: TourService,
        private systemService: NxSystemService,
        @Inject(WINDOW) public window: Window,
        private pageService: NxPageService,
        public layoutGridService: NxLayoutGridService,
        public layoutStateService: LayoutStateService,
    ) {
        this.CONFIG = configService.config;
        if (this.CONFIG.featureFlags.layoutsTimeline) {
            this.playable.push('archive');
        }

        // TODO - start - following should be moved to layout-greed-tree
        layoutGridService.changeView
            .pipe(untilDestroyed(this))
            .subscribe(resourceNode => this.changeView(resourceNode));
        layoutGridService.addItem
            .pipe(untilDestroyed(this))
            .subscribe(resourceNode => this.addItem(resourceNode));
        layoutGridService.moveAddedItem
            .pipe(untilDestroyed(this))
            .subscribe(({ event, itemParent }) => this.moveAddedItem(event, itemParent));
        // TODO - end -
    }

    async ngOnChanges({ layout }: NgChanges<NxLayoutGridComponent>): Promise<void> {
        if (layout?.currentValue && !isEqual(layout.currentValue, layout.previousValue)) {
            // this.openMenu = false;
            this.initialLayout$.next(layout.currentValue);
            this.changingLayout = false;
            this.updateLayout();
        }
    }

    /**
     * The nx-video-player player internally handles reconnect behavior for cameras
     * that were online and successfully connected when the layout was opened.
     *
     * The reconnecting logic from within the nx-video-player is more aggressive
     * because it's mostly meant to handle cases where the connection was lost
     * for a short ammount of time.
     *
     * For cameras that were either offline or initial connection failed we'll
     * assume that they're still unreachable and use more conservative as not to
     * spam the mediaservers with requests to open a websocket connection.
     */
    pingOfflineCameras(pollingInterval = this.CONFIG.offlineCameraPollingInterval): void {
        const getOfflineCameras = (): Record<string, NxSystemCamera[]> => {
            const offlineCameras = this.layout.items
                .map(({ resourceId }) => this.layoutItemLookup[resourceId])
                .filter(assertResourceOfType.camera)
                .map(({ details }) => details)
                .filter(({ status }) => status === CameraStatus.Offline);
            return groupBy(offlineCameras, 'parentId');
        };

        const filterByOnlineServers = (
            groupedCameras: Record<string, NxSystemCamera[]>,
        ): Observable<NxSystemCamera[]> =>
            forkJoin(
                mapValues(groupedCameras, (cameras, serverId) =>
                    this.system.serverManager.mediaserverConnections[serverId].ping().pipe(
                        map(() => cameras),
                        catchError(() => Promise.resolve([])),
                    ),
                ),
            ).pipe(
                map(groupedCamerasOnlineServers => flatten(values(groupedCamerasOnlineServers))),
            );
        const filterByReachableWithWebRtc = (cameras: NxSystemCamera[]): Observable<string[]> =>
            forkJoin(
                cameras.reduce(
                    (acc, { id, webRtcUrl }) => ({
                        ...acc,
                        [id]: WebRTCStreamManager.connect(webRtcUrl).pipe(
                            timeout(10000),
                            catchError(() => of([])),
                            take(1),
                            map(([mediaStream]) => !!mediaStream),
                        ),
                    }),
                    {} as Record<string, Observable<boolean>>,
                ),
            ).pipe(
                map(webRtcStatuses =>
                    Object.keys(webRtcStatuses).filter(cameraId => webRtcStatuses[cameraId]),
                ),
            );

        const updateReachableCameras = (cameraIds: string[]): void =>
            cameraIds.forEach(cameraId => {
                const camera = this.layoutItemLookup[cameraId];

                if (assertResourceOfType.camera(camera)) {
                    camera.details.status = CameraStatus.Online;
                    delete this.errors[cameraId];
                    delete this.errorIcons[cameraId];
                    delete this.additionalErrorMessages[cameraId];
                }
            });

        of(true)
            .pipe(
                delay(pollingInterval * 1000),
                map(getOfflineCameras),
                switchMap(filterByOnlineServers),
                switchMap(filterByReachableWithWebRtc),
                tap(updateReachableCameras),
                repeat(),
                untilDestroyed(this),
            )
            .subscribe();
    }

    // ngOnInit(): void {
    //     this.pingOfflineCameras();
    // }

    ngAfterViewInit(): void {
        this.onResize({ target: this.window });
    }

    startTour = (): void => this.tourService.start();

    checkIframeContent(id: string, frame: HTMLIFrameElement): void {
        const loaded = frame.contentWindow.window.length;
        try {
            if (frame.contentWindow.location.href) {
                return;
            }
        } catch ({ message }) {
            this.additionalErrorMessages[id] = message;
        }
        if (!loaded) {
            this.errors[id] = `${ResourceType.WEB_PAGE}_error`;
        } else if (id in this.additionalErrorMessages) {
            delete this.additionalErrorMessages[id];
        }

        if (loaded) {
            frame.style.opacity = '1';
            frame.style.zIndex = '100';
        }
    }

    cleanId = cleanId;

    getScale = (itemId: string, resize: Point): string => {
        if (resize.x === 0 && resize.y === 0) {
            return;
        }

        const item = this.initialLayout$.value.items.find(({ id }) => id === itemId);
        return `scale(${this.getConstraint(item, resize).scale})`;
    };

    calculatePosition = (
        { x, y }: Point,
        {
            cellSize: { width, height },
            wrapperPosition,
            origin,
        }: {
            cellSize: { width: number; height: number };
            wrapperPosition: Pick<Position, 'left' | 'top'>;
            origin: Point;
        },
    ): Point => ({
        x: Math.round((x - width / 2 - wrapperPosition.left) / width) + origin.x,
        y: Math.round((y - height - wrapperPosition.top) / height) + origin.y,
    });

    getConstraint = (item: LayoutItem, { x, y }: Point): Point & { scale: number } => {
        const { top, right, bottom, left } = item;
        const width = right - left;
        const height = bottom - top;
        const constrainedByWidth = Math.abs(x) / width > Math.abs(y) / height;

        const scale = constrainedByWidth ? (height + y) / height : (width + x) / width;
        if (scale <= 0) {
            return { scale: 1, x: 0, y: 0 };
        }

        return { x: width * scale - width, y: height * scale - height, scale };
    };

    PLACEHOLDER_STATE = PlaceholderState;

    updatePlaceholderConfig = (
        { width, height }: Size,
        { renderConfig, id }: ParsedLayoutItem,
        status: string,
    ): void => {
        const hasAdditionalMessage = Boolean(
            this.additionalErrorMessages[this.layoutItemLookup[id]?.details.id || status],
        );
        const iconSizeConfigs: {
            minWidth: number;
            minHeight: number;
            maxSize: number;
            padding: number;
            minTitleHeight: number;
            titleSize: number;
            minAdditionalHeight: number;
            additionalSize: number;
            placeholderClass: `${PlaceholderClasses}`;
        }[] = [
            {
                minWidth: 1000,
                minHeight: 500,
                maxSize: 320,
                padding: 48,
                minTitleHeight: 0,
                titleSize: 48,
                minAdditionalHeight: 348,
                additionalSize: 36,
                placeholderClass: PlaceholderClasses.LARGE,
            },
            {
                minWidth: 300,
                minHeight: 188,
                maxSize: 128,
                padding: 24,
                minTitleHeight: 218,
                titleSize: 64,
                minAdditionalHeight: 288,
                additionalSize: 24,
                placeholderClass: PlaceholderClasses.MEDIUM,
            },
            {
                minWidth: 0,
                minHeight: 0,
                maxSize: 128,
                padding: 12,
                minTitleHeight: Infinity,
                titleSize: 120,
                minAdditionalHeight: Infinity,
                additionalSize: 64,
                placeholderClass: PlaceholderClasses.SMALL,
            },
        ];

        const config = iconSizeConfigs.find(
            ({ minWidth, minHeight }) => width >= minWidth && height >= minHeight,
        );

        const getPlaceholderState = (height: number): PlaceholderState => {
            if (
                height > (hasAdditionalMessage ? config.minAdditionalHeight : config.minTitleHeight)
            ) {
                return PlaceholderState.FULL;
            }

            if (height > config.minTitleHeight) {
                return PlaceholderState.WITH_TITLE;
            }

            return PlaceholderState.ICON_ONLY;
        };

        const getSizeOffset = (placeholderState: PlaceholderState): number => {
            let baseSize = config.padding * 2;

            if (placeholderState === PlaceholderState.FULL) {
                baseSize += config.additionalSize;
            }

            if (placeholderState >= PlaceholderState.WITH_TITLE) {
                baseSize += config.titleSize;
            }

            return baseSize;
        };
        renderConfig.placeholderClass = config.placeholderClass;
        renderConfig.placeholderState = getPlaceholderState(height);
        renderConfig.hasSecondaryPanel = renderConfig.placeholderState !== PlaceholderState.FULL;
        renderConfig.maxPlaceholderSize =
            config.placeholderClass === PlaceholderClasses.SMALL
                ? Math.min(width, height) - getSizeOffset(renderConfig.placeholderState)
                : config.maxSize;
        this.cd.detectChanges();
    };

    generateItemRenderConfig =
        (layoutRenderConfig: LayoutRenderConfig, wrapperSize: Size, layout: ParsedLayout) =>
        item => {
            const { aspectRatio, origin } = layoutRenderConfig;
            const calcFactory = (origin: number) => (point: number) => point - origin + 1;

            const calcX = calcFactory(origin.x);
            const calcY = calcFactory(origin.y);
            const { top, bottom, left, right } = item;
            const renderConfig = {
                'grid-column': `${calcX(left)} / ${calcX(right)}`,
                'grid-row': `${calcY(top)} / ${calcY(bottom)}`,
                aspect: aspectRatio,
                placeholderState: PlaceholderState.NONE,
                maxPlaceholderSize: 300,
            };

            const node = this.layoutItemLookup[item.resourceId];

            const updatedItem = { ...item, renderConfig };

            const itemSize = this.calculateItemSize(
                wrapperSize,
                updatedItem,
                node,
                layout as ExtractObservable<typeof this.layout$>,
            );

            if (
                itemSize &&
                (assertResourceOfType.camera(node) || assertResourceOfType.server(node))
            ) {
                this.updatePlaceholderConfig(itemSize, updatedItem, node?.details.status);
            }
            return updatedItem;
        };

    annotateWithRenderConfig = (layout: ParsedLayout, wrapperSize: Size): ParsedLayoutItems =>
        layout.items.map(this.generateItemRenderConfig(layout.renderConfig, wrapperSize, layout));

    calculateEdges(
        { top: prevTop, bottom: prevBottom, left: prevLeft, right: prevRight }: Position,
        { top, bottom, left, right }: Position,
    ): Position {
        return {
            top: Math.min(prevTop, top ?? Infinity),
            right: Math.max(prevRight, right ?? -Infinity),
            bottom: Math.max(prevBottom, bottom ?? 0),
            left: Math.min(prevLeft, left ?? Infinity),
        };
    }

    calculateSize(items: LayoutItems): {
        width: number;
        height: number;
        originX: number;
        originY: number;
    } {
        const initialValues = {
            top: Infinity,
            bottom: -Infinity,
            left: Infinity,
            right: -Infinity,
        };
        const {
            top: originY,
            bottom,
            left: originX,
            right,
        } = items.reduce(this.calculateEdges, initialValues);
        const height = Math.floor(bottom - originY);
        const width = Math.floor(right - originX);
        return { width, height, originY, originX };
    }

    calculateItemSize = (
        size: Size,
        item: ParsedLayoutItem,
        node: ResourceNode,
        layout: ExtractObservable<typeof this.layout$>,
    ): Size => {
        if (!size || !item) {
            return;
        }

        const { height, width } = this.window.document.fullscreenElement
            ? size
            : this.calculateAspect([size, layout]).cellSize;
        const { renderConfig, rotation } = item;

        renderConfig.showTooltip = width < 360;
        if (assertResourceOfType.camera(node) && node.details.online) {
            const initialAspect = node.aspectRatio || renderConfig.aspect;

            const isRotated = Boolean((Math.round(rotation / 90) * 90) % 180);

            const aspect = isRotated ? 1 / initialAspect : initialAspect;

            renderConfig.child = {
                'aspect-ratio': aspect,
            };
        }

        return {
            width,
            height,
        };
    };

    generateRenderConfig({
        cellAspectRatio,
        cellSpacing,
        items,
        fixedWidth,
        fixedHeight,
    }: Layout): LayoutRenderConfig {
        const aspectRatio = cellAspectRatio || DEFAULT_ASPECT_RATIO;
        const spacing = cellSpacing ?? 0.1;
        const { width, height, originX: x, originY: y } = this.calculateSize(items);
        const columns = items.length <= 1 ? 1 : fixedWidth || width;
        const rows = items.length <= 1 ? 1 : fixedHeight || height;
        // const widthPercent = 1 / columns * 100;
        // const heightPercent = 1 / rows * 100;
        const gridWrapper = {
            'grid-template-columns': `repeat(${columns}, 1fr)`,
            'grid-template-rows': `repeat(${rows}, 1fr)`,
        };
        return { aspectRatio, spacing, columns, rows, gridWrapper, origin: { x, y } };
    }

    updateWrapperSize = ({ height, width }: Size): void => {
        this.#wrapperSize$.next({ height, width });
    };

    filterRemovedResources = (items: LayoutItems): LayoutItems =>
        items.filter(({ resourceId }) => !!this.layoutItemLookup[resourceId]);

    parseLayout = (layout: Layout): ParsedLayout => ({
        ...layout,
        locked:
            (!this.CONFIG.featureFlags.layoutsEditable && !this.CONFIG.featureFlags.layoutsDemo) ||
            layout.locked,
        renderConfig: this.generateRenderConfig(layout),
        settings: this.SETTINGS_CONFIG,
    });

    updateBackground = (
        { distance }: { distance: Point },
        { id }: ParsedLayoutItem,
        action = 'move',
        alignment: NxLayoutGridComponent['alignments'][number] = [
            VerticalAlign.BOTTOM,
            HorizontalAlign.RIGHT,
        ],
    ): void => {
        this.#draggingPosition$.next({ [action]: distance, id, alignment });
    };

    moveAddedItem = (
        { pointerPosition: move }: { pointerPosition: Point },
        itemParent?: HTMLElement,
    ): void => {
        this.addingItem$$.set(true);
        if (itemParent) {
            move.x -= itemParent.offsetLeft + itemParent.offsetWidth;

            if (move.x < 0) {
                return this.updateLayout();
            }

            move.y += this.addOffset - 108;
        }
        this.#draggingPosition$.next({ move, id: 'added' });
    };

    updateLayout = (): void => {
        this.#draggingPosition$.next(this.INITIAL_DRAG_STATE);
        this.cd.markForCheck();
    };

    moveItem = ({ id }: LayoutItem): void => {
        combineLatest([this.highlightState$, this.collisions$])
            .pipe(take(1))
            .subscribe(([{ x, y, resize }, collisions]) => {
                const unresolvedCollisions = Object.values(collisions).reduce(
                    (prevCollision, { moveTo }) => prevCollision || !moveTo,
                    false,
                );
                const notMoved = [x, y, resize.x, resize.y].every(change => !change);
                if (unresolvedCollisions || notMoved) {
                    return this.updateLayout();
                }

                const items = this.layout.items.map(item => {
                    item = structuredClone(item);
                    const dragging = item.id === id;
                    if (dragging) {
                        const { x: resizeX, y: resizeY } = this.getConstraint(item, resize);
                        item.top += y;
                        item.bottom += y + resizeY;
                        item.left += x;
                        item.right += x + resizeX;
                    }
                    return item;
                });

                this.layoutStateService.updateLayout({ ...this.layout, items });
                this.updateLayout();
            });
    };

    async changeView(node: ResourceNode | LayoutItem): Promise<void> {
        if (!('children' in node) && this.#lastWidth <= ViewportBreakpoints.Tablet.width) {
            this.layoutGridService.handleMenuClose();
        }

        const isLayoutItem = 'id' in node;
        const id = isLayoutItem ? node.id : node.details?.id;

        if (id && cleanId(id) !== cleanId(this.layout.id)) {
            this.changingLayout = cleanId(id);
            this.errors = {};
            this.additionalErrorMessages = this.LANG.layouts.additionalErrorMessages;
            if (!this.system.permissionManager.permissions$$().editCameras) {
                delete this.additionalErrorMessages.defaultPassword;
                delete this.additionalErrorMessages.unauthorized;
            }
            this.layoutStateService.portal = null;
            this.layoutChanged.emit(id);
        }

        const systemName = this.systemService.getCurrentSystem().info.name;

        this.pageService.pageTitle(
            [staticLang.pageTitles.layouts, systemName, this.CONFIG.cloudName].join(' - '),
        );
    }

    handleVideoError(
        itemDetail: ResourceNode<{
            id: string;
            online: boolean;
            previewUrl: Observable<unknown>;
            status: string;
            parentId: string;
        }>,
        error: string,
    ): void {
        const showOfflineError = (): void => {
            itemDetail.details.online = false;
            this.errors[itemDetail.details.id] = staticLang.common.cameraStates.unavailable;
            this.errorIcons[itemDetail.details.id] = 'offline';
            this.additionalErrorMessages[itemDetail.details.id] =
                staticLang.layouts.additionalErrorMessages.UNAVAILABLE;
        };

        const showTranscodingDisabledError = (error: ConnectionError): void => {
            this.errors[itemDetail.details.id] = error;
            this.errorIcons[itemDetail.details.id] = 'warning';
        };

        const showDefaultPasswordError = (): void => {
            this.errors[itemDetail.details.id] = 'defaultPassword';
            this.errorIcons[itemDetail.details.id] = 'warning';
        };

        const isConnectionError = (error: string): error is ConnectionError =>
            !!ConnectionError[error];

        if (
            isConnectionError(error) &&
            [ConnectionError.transcodingDisabled, ConnectionError.mjpegDisabled].includes(error)
        ) {
            showTranscodingDisabledError(error);
        } else if (error === ConnectionError.authorization) {
            /**
             * This error is explicitly emitted by the nx-video-player component by checking that the previewUrl loads before trying to establish a connection.
             *
             * There seems to be a bug on initiating the WebRTC connection from the server side that allows the connection to be established even if the credentials are wrong.
             *
             * We could probably remove this check once the bug is fixed but it also doesn't really hurt to have it here.
             */
            showDefaultPasswordError();
        } else {
            itemDetail.details.previewUrl.subscribe({
                next: showOfflineError,
                error: (previewError: HttpErrorResponse) => {
                    if (previewError.status === 403) {
                        showDefaultPasswordError();
                    } else {
                        showOfflineError();
                    }
                },
            });
        }
    }

    updateCameraCredentials(system: NxSystem, camera: NxSystemCamera): void {
        const defaultPassword = camera.status !== CameraStatus.Unauthorized;
        const retriesTimeout = 30 * 1000;
        const firstCheckTimeout = 10 * 1000;
        const cameraCredentialUpdateTimeout = 5 * 1000;
        const retries = Math.round(
            (retriesTimeout - firstCheckTimeout) / cameraCredentialUpdateTimeout,
        );
        let firstCheck = true;
        const update = (): Promise<void> => {
            return of('')
                .pipe(
                    delayWhen(() => {
                        if (firstCheck) {
                            firstCheck = false;
                            return interval(firstCheckTimeout);
                        }
                        return interval(cameraCredentialUpdateTimeout);
                    }),
                    switchMap(() =>
                        from(system.cameraManager.getCameras()).pipe(
                            switchMap(cameras => {
                                const selectedCamera = cameras.find(({ id }) => id === camera.id);
                                const keepChecking = selectedCamera.status !== CameraStatus.Online;
                                if (keepChecking) {
                                    return throwError(
                                        selectedCamera.status === CameraStatus.Unauthorized
                                            ? 'Camera Unauthorized'
                                            : 'Camera Offline',
                                    );
                                }
                                return of(selectedCamera);
                            }),
                            delay(cameraCredentialUpdateTimeout),
                        ),
                    ),
                    retry(retries),
                    catchError(err => {
                        console.error(err);
                        return of(err);
                    }),
                )
                .toPromise()
                .finally(() => {
                    const selectedCamera = system.cameraManager.cameras.find(
                        ({ id }) => id === camera.id,
                    );

                    if (selectedCamera.status === CameraStatus.Unauthorized && !defaultPassword) {
                        this.toastService.notify(
                            {
                                value: staticLang.layouts.errors.unableToAuthorizeCamera,
                                params: pick(camera, 'name'),
                            },
                            ToastType.Warning,
                        );
                    } else {
                        delete this.errors[selectedCamera.id];
                        delete this.errorIcons[selectedCamera.id];
                        if (defaultPassword) {
                            this.skipDefaultCredentialsCheck[selectedCamera.id] = true;
                        }
                    }

                    // TODO: This needs to be updated to update the resources store once it's setup.
                    // this.updateLayoutItems.emit();
                });
        };

        this.dialogsService.updateCameraCredentials({
            camera,
            system,
            defaultPassword,
            updateCallback: update,
        });
    }

    generateLayoutItem = (
        { details: { id: resourceId } }: ResourceNode,
        { x, y }: Point,
    ): LayoutItem => {
        const left = x === Infinity ? 0 : x;
        const top = y === Infinity ? 0 : y;
        const right = left + 1;
        const bottom = top + 1;
        const id = dirtyId(uuid());
        let rotation = 0;
        const unknownItem = this.layoutItemLookup[dirtyId(resourceId)];

        if (assertResourceOfType.camera(unknownItem)) {
            rotation = unknownItem.details.parameters?.rotation ?? 0;
        }

        return {
            bottom,
            contrastParams: {
                blackLevel: 0.001,
                enabled: false,
                gamma: 1,
                whiteLevel: 0.0005,
            },
            controlPtz: false,
            dewarpingParams: {
                enabled: false,
                fov: 1.2217304763960306,
                panoFactor: 1,
                xAngle: 0,
                yAngle: 0,
            },
            displayAnalyticsObjects: false,
            displayInfo: false,
            displayRoi: false,
            flags: 1,
            id,
            left,
            resourceId: dirtyId(resourceId),
            resourcePath: '',
            right,
            rotation,
            top,
            zoomBottom: 0,
            zoomLeft: 0,
            zoomRight: 0,
            zoomTargetId: '{00000000-0000-0000-0000-000000000000}',
            zoomTop: 0,
        };
    };

    addItem = (node: ResourceNode): void => {
        combineLatest([this.highlightState$, this.collisions$])
            .pipe(take(1))
            .subscribe(([{ x, y, resize }, collisions]) => {
                const unresolvedCollisions = Object.values(collisions).some(c => !c.moveTo);
                const notMoved = [x, y, resize.x, resize.y].every(change => !change);
                this.addingItem$$.set(false);
                if (unresolvedCollisions || notMoved) {
                    return this.updateLayout();
                }

                const items = [...this.layout.items, this.generateLayoutItem(node, { x, y })];
                if (assertResourceOfType.layout(this.layoutItemLookup[dirtyId(this.layout.id)])) {
                    const currentUser = this.system.permissionManager.currentUser$$();

                    // If user doesn't have permissions to edit a layout then create duplicate local layout
                    if (!currentUser.isAdmin && currentUser.id !== this.layout.parentId) {
                        this.layoutStateService.duplicateLayoutAsNewLocalLayout({
                            ...this.layout,
                            items,
                        });
                    } else {
                        this.layoutStateService.updateLayout({ ...this.layout, items });
                    }
                } else {
                    this.layoutStateService.createNewLocalLayout(items);
                }
                if (this.layoutItemLookup[`{${this.layout.id}}`]) {
                    this.layout.id = '';
                    this.showPtz.emit();
                }
            });
    };

    itemId = (index: number, { id }: LayoutItem): string => id;

    checkCollision = (item: LayoutItem, itemTwo: Partial<Position>): boolean =>
        item.left < itemTwo.right &&
        item.right > itemTwo.left &&
        item.top < itemTwo.bottom &&
        item.bottom > itemTwo.top;

    getCollisionStyle = (
        item: LayoutItem,
        dragging: Partial<Position>,
        items: LayoutItems,
    ): Collisions => {
        const collided = items.length;

        if (collided) {
            return {
                moveTo: null,
                opacity: 0.5,
                background: 'var(--error)',
            };
        }

        return {};
    };

    preventDrop = (dragging: CdkDrag<LayoutItem>, target: CdkDropList<LayoutItem>): boolean => {
        const dragId = dragging?.data?.id;
        const targetId = target?.data?.id;
        return dragId === targetId;
    };

    removeItem = async ({ id, resourceId }: LayoutItem): Promise<void> => {
        const item = this.layoutItemLookup[resourceId];
        let update = true;
        if (item) {
            const { title, message, footer } = this.LANG.layouts.removeItem;
            update =
                !this.CONFIG.featureFlags.layoutsRemoveItemDialog ||
                (await this.dialogsService.confirm({
                    title,
                    message: {
                        value: message,
                        params: { name: item.name, layoutName: this.layout.name },
                    },
                    footer,
                }));
        }

        if (update) {
            const items = this.layout.items.filter(item => item.id !== id);
            this.layoutStateService.updateLayout({ ...this.layout, items });
        }
    };

    pingServer =
        ({ parentId: serverId }: { parentId: string }) =>
        (): Observable<unknown> =>
            this.system.serverManager.mediaserverConnections[serverId]
                .ping()
                .pipe(catchError(() => Promise.resolve()));
}
