import {
    CdkDrag,
    CdkDragMove,
    CdkDragRelease,
    CdkDropList,
    DragDropModule,
    Point,
} from '@angular/cdk/drag-drop';
import { CdkContextMenuTrigger } from '@angular/cdk/menu';
import { PortalModule } from '@angular/cdk/portal';
import { NestedTreeControl } from '@angular/cdk/tree';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    computed,
    effect,
    ElementRef,
    EventEmitter,
    HostListener,
    inject,
    Input,
    Output,
    signal,
    Signal,
    untracked,
    viewChild,
    ViewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { cloneDeep, flatten, groupBy, isEqual, mapValues, pick, values } from 'lodash-es';
import { TourMatMenuModule, TourService } from 'ngx-ui-tour-md-menu';
import {
    BehaviorSubject,
    combineLatest,
    firstValueFrom,
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
    debounceTime,
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
import { NxLayoutGridItemPlaceholderComponent } from '@components/layout-grid-item-placeholder/layout-grid-item-placeholder.component';
import { NxLayoutGridTreeComponent } from '@components/layout-grid-tree/layout-grid-tree.component';
import { NxWebGLCanvasComponent } from '@components/nx-webgl-canvas/webgl-canvas.component';
import { NxPagePlaceholderComponent } from '@components/placeholders/page/page-placeholder.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxLinesLoaderComponent } from '@components/skeleton-loader/variants/lines-loader/lines-loader.component';
import { ToastType } from '@components/toast-container/toast.types';
import { NxVideoPlayerComponent } from '@components/video-player/video-player.component';
import { NxAsyncActionButtonComponent } from '@dialogs/async-action-button/async-action-button.component';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { NxClickElsewhereDirective } from '@directives/nx-click-elsewhere';
import { NxResizeObserver } from '@directives/resize/nx-resize.directive';
import staticLang from '@language_static';
import {
    ConnectionError,
    isRequiresTranscoding,
    WebRTCStreamManager,
} from '@openLibs/webrtc-stream-manager';
import { NxImageComponent } from '@pages/health/table-components/image/image.component';
import { GroupsCacheStore } from '@pages/home/store/groups/groups-cache.store';
import { PipesModule } from '@pipes/pipes.module';
import { NxLayoutGridService } from '@services/layout-grid/layout-grid.service';
import { LayoutItemsErrorsStore } from '@services/layout-items/layout-items-errors.store';
import { LayoutStateService } from '@services/layout-state/layout-state.service';
import { Resolution } from '@services/layout-state/store/layouts-resolution/resolution.types';
import { SelectedCameraStore } from '@services/layout-state/store/selected-camera.store';
import { createAddedItems } from '@services/layout-state/store/utils/create-added-items';
import { nxConfig } from '@services/nx-config/config';
import { NxPageService } from '@services/page.service';
import { Layout, LayoutItem, LayoutItems } from '@services/system-api.types/layouts.types';
import {
    CameraStatus,
    CameraTypeId,
    NxSystemCamera,
} from '@services/system.service/camera-manager/camera-manager-types';
import { NxSystem } from '@services/system.service/system';
import { NxSystemService } from '@services/system.service/system.service';
import { NxSystemsService } from '@services/systems.service';
import { NxSystemInfo } from '@services/systems.service.types';
import { NxToastService } from '@services/toast.service';
import { icons } from '@static-variables';
import { SystemResourcesSelectors } from '@store/system-resources';
import { SystemResourcesTypeMap } from '@store/system-resources/system-resources.types';
import { ViewportBreakpoints } from '@styles/theme-variables-common';
import { ensureLayoutItemResourcePath } from '@utils/ensure-layout-item-resource-path';
import { extractSystemAndResourceId } from '@utils/extract-system-and-resources';
import { cleanId, cleanIdLegacy, dirtyId } from '@utils/general';
import { hasCrossSystemItems } from '@utils/has-cross-system-items';
import { NgChanges } from '@utils/ng-changes';
import { paramModel } from '@utils/signals';
import { ExtractObservable } from '@utils/type-helpers';

import { filterOtherSites } from './filter-other-sites';
import { findOtherSite } from './find-other-site';
import { assertResourceOfType, assertResourceParentNode } from './layout-grid.type-guards';
import {
    isResourceParentNode,
    LayoutRenderConfig,
    LayoutResourceTree,
    NxSystemCameraWithMappedFields,
    ParsedLayout,
    ParsedLayoutItem,
    ParsedLayoutItems,
    ParsedLayoutWithItems,
    PlaceholderClasses,
    placeholderNameLookup,
    PlaceholderState,
    Position,
    ResourceNode,
    ResourceType,
    Setting,
    Size,
} from './layout-grid.types';
import { removeSystemChildren } from './remove-system-children';

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

const enum HighlightClasses {
    SWAP = 'swap',
}

interface Transform {
    transform?: string;
    highlightClass?: HighlightClasses;
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
    moveTo?: Partial<Position> | false;
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
        NxVideoPlayerComponent,
        NxResizeObserver,
        NxAddSvgSrcDirective,
        NxClickElsewhereDirective,
        PortalModule,
        NxLayoutGridItemOverlayComponent,
        NxLayoutGridItemPlaceholderComponent,
        CdkContextMenuTrigger,
        NxWebGLCanvasComponent,
        NxPagePlaceholderComponent,
        NxLinesLoaderComponent,
        NxAsyncActionButtonComponent,
    ],
})
export class NxLayoutGridComponent {
    @Input() layout: Layout;
    @Input() layoutItemLookup: LayoutResourceTree;
    layoutItemLookup$$ = signal<LayoutResourceTree>({ tree: [] } as unknown as LayoutResourceTree);
    @Input() system: NxSystem;

    @Output() layoutChanged = new EventEmitter<string>();
    @Output() showPtz = new EventEmitter<NxSystemCamera>();

    @HostListener('document:keydown.escape', ['$event']) onKeydownHandler(
        event: KeyboardEvent,
    ): void {
        this.removeFocus();
        this.layoutStateService.portal = null;
    }

    @HostListener('document:fullscreenchange', ['$event']) onFullscreenChange(event: Event): void {
        this.#fullscreenElement$.next(event.target as Element);
    }

    @ViewChild('gridSection') set gridSection(value: ElementRef) {
        this.layoutStateService.gridSection = value.nativeElement;
    }

    @ViewChild('otherSystems') set otherSystems(element: ElementRef<HTMLDetailsElement>) {
        this.detailsRef$$.set(element?.nativeElement);
    }

    otherSitesMenu$$ = viewChild<NxLayoutGridTreeComponent>('otherSitesMenu');

    groupsCacheStore = inject(GroupsCacheStore);

    detailsRef$$ = signal<HTMLDetailsElement | null>(null);
    otherSystemsOpen$$ = computed(() => {
        const otherSitesMenuOpen =
            this.layoutStateService.paramStateHandler.state$$().queryParams?.otherSitesMenuOpen;
        return !!otherSitesMenuOpen?.includes('true');
    });

    showFirst$$ = computed(() => {
        const edited = this.layoutStateService.editedLayout$$();
        return edited?.isNew ? edited.id : null;
    });

    toggleOtherSystemsOpen = (open: boolean): void =>
        this.layoutStateService.paramStateHandler.state$$.set({
            queryParams: { otherSitesMenuOpen: [open.toString()] },
        });

    toggleSystemsEffect$$ = effect(() => {
        const otherSystemsDetails = this.detailsRef$$();
        const otherSystemsOpen = this.otherSystemsOpen$$();

        if (otherSystemsDetails && otherSystemsOpen) {
            otherSystemsDetails.open = true;
        }
    });

    /**
     * Configuration for grid cell spacing calculation.
     *
     * Set below 1 to lower the spacing between cells or above to increase.
     */
    readonly CELL_SPACE_RATIO = 0.5;

    LANG = staticLang;
    CONFIG = nxConfig;
    readonly PLACEHOLDER_NAME_LOOKUP = placeholderNameLookup;

    ngOnDestroy(): void {
        this.layoutStateService.portal = null;
    }

    editItems$$: Signal<boolean> = computed(() => {
        const layout = this.layout$$?.();
        return !layout?.locked && layout?.name !== this.layoutStateService.focusViewToken;
    });

    cameras$$ = signal<NxSystemCameraWithMappedFields[]>([]);

    currentLayoutCameras$$ = computed(() => {
        const layoutItems = this.layout$$?.()?.items || [];
        const cameraIds = layoutItems.map(({ resourceId }) => cleanId(resourceId));
        const allCameras = this.cameras$$();
        return allCameras.filter(({ id }) => cameraIds.includes(id));
    });

    selectedCameraStore = inject(SelectedCameraStore);

    layoutItemsWithDefaultOrder$$ = computed(
        () => {
            const layout = this.layout$$();
            const layoutItemLookup = this.layoutItemLookup$$();

            if (!layout || !layoutItemLookup) {
                return null;
            }

            const items = layout.items
                .filter(({ resourceId }) => {
                    const isCamera = assertResourceOfType.camera(layoutItemLookup[resourceId]);
                    const hasPermission = this.system.permissionManager.canViewDevice(resourceId);
                    return isCamera && hasPermission;
                })
                .sort((a, b) => {
                    const top = a.top - b.top;
                    const left = a.left - b.left;
                    return top || left;
                })
                .map(({ id, resourcePath }) => ({ id, resourcePath }));

            return {
                id: layout.id,
                items,
            };
        },
        {
            equal: (a, b) => {
                if (!a || !b) {
                    return false;
                }

                if (a.id !== b.id) {
                    return false;
                }

                const previousDefault = a.items[0];
                return previousDefault && !!b.items.find(({ id }) => previousDefault.id === id);
            },
        },
    );

    updateSelectedCameraEffect = effect(
        () => {
            const layout = this.layoutItemsWithDefaultOrder$$();

            if (!layout) {
                return;
            }

            const layoutItemIds = layout.items;

            const selectedItemState = untracked(() =>
                this.selectedCameraStore.selectedLayoutItemState$$(),
            );

            if (!layout?.id || !selectedItemState || selectedItemState.id !== cleanId(layout.id)) {
                // this.layout$$ is asynchronous and this.selectedStateStore.selectedLayoutItemState$$
                // is synchronous, this is to handle potential race conditions.
                return;
            }

            const defaultLayoutItemId = layoutItemIds[0];

            if (!layoutItemIds.length) {
                return;
            }

            const selectedInLayout = layoutItemIds
                .map(({ id }) => id)
                .includes(selectedItemState.selected.id);

            if (selectedInLayout) {
                return;
            }

            this.selectedCameraStore.updateSelectedResource(defaultLayoutItemId, true);
        },
        {
            allowSignalWrites: true,
        },
    );

    selectedCameraId$$ = computed(() => {
        const selectedLayoutItemId = this.selectedCameraStore.selectedLayoutItem$$();
        const layoutItem = this.layout$$()?.items.find(
            ({ id }) => cleanId(id) === selectedLayoutItemId.id,
        );

        return layoutItem ? cleanId(layoutItem.resourceId) : '';
    });

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

    mouseMoving$ = fromEvent(document, 'mousemove').pipe(
        switchMap(() => of(false).pipe(delay(10000), startWith(true))),
        distinctUntilChanged(),
        shareReplay({ bufferSize: 1, refCount: false }),
    );

    mouseMoving$$ = toSignal(this.mouseMoving$, { initialValue: true });

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

    unsaved: Layout | false = false;
    addingItem$$ = signal(false);
    addOffset = 0;
    changingLayout: string | boolean = true;
    skipDefaultCredentialsCheck: Record<string, true> = {};
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
    readonly dirtyId = dirtyId;

    initialLayout$ = new BehaviorSubject<Layout>(null);
    #wrapperSize$ = new BehaviorSubject<Size>(null);
    #fullscreenElement$ = new BehaviorSubject<Element>(null);
    unsubTooltip$ = new Subject<string>();

    layout$: Observable<ParsedLayoutWithItems> = combineLatest([
        this.initialLayout$,
        this.#wrapperSize$,
        this.store.select(SystemResourcesSelectors.selectResourceValuesAllSystems),
        this.systemsService.systemsSubject,
    ]).pipe(
        filter(([layout, _, systemResources, systems]) => !!layout),
        map(
            ([layout, wrapperSize]) =>
                [
                    this.parseLayout({
                        ...layout,
                        items: this.filterRemovedResources(
                            layout.items.map(
                                ensureLayoutItemResourcePath(layout.systemId || this.system.id),
                            ) || [],
                        ),
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

    layout$$ = toSignal(this.layout$);

    wrapperSize$$ = toSignal(this.#wrapperSize$);

    showTooltip$ = this.#wrapperSize$.pipe(
        filter(Boolean),
        map(
            ({ width }) =>
                !window.matchMedia('(any-hover: none)').matches &&
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

    checkUpdateAspectRatio = ($event: Size, dragContainer: HTMLElement): void => {
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
                            (!unknownItem.details.parameters.VideoLayout &&
                                unknownItem.details.parameters?.overrideAr) ||
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
        cellAspectRatio ||= findCommonAspectRatio(items);
        columns = Math.max(columns, 1);
        rows = Math.max(rows, 1);

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
        const { move = {}, resize = {} } = this.draggingPosition$$() || {};
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

    unsavedLayoutState$$ = computed(() => {
        const unsavedLayouts = this.layoutStateService.unsavedLayoutsIds$$();
        const layout = this.layout$$();
        const state = (unsavedLayouts && layout && unsavedLayouts[layout.id]) || undefined;
        return state !== this.unsavedStates.saving && state;
    });

    layoutSaving$$ = computed(() => {
        const unsavedLayouts = this.layoutStateService.unsavedLayoutsIds$$();
        return (
            (unsavedLayouts &&
                Object.values(unsavedLayouts).some(
                    layoutState => layoutState === this.unsavedStates.saving,
                )) ||
            undefined
        );
    });

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

    #collisions$ = this.#distinctDraggingPosition$.pipe(
        map(({ id, move, resize }) => {
            const currentlyDragging = this.layout.items.find(({ id: itemId }) => itemId === id);

            if (!currentlyDragging) {
                const { y: top, x: left } = move;
                return [
                    false,
                    id
                        ? {
                              id: 'added',
                              top,
                              bottom: top + 1,
                              left,
                              right: left + 1,
                          }
                        : {},
                ] as const;
            }
            const constrainedResize = this.getConstraint(currentlyDragging, resize);

            return [
                true,
                {
                    ...currentlyDragging,
                    top: currentlyDragging.top + move.y,
                    bottom: currentlyDragging.bottom + move.y + constrainedResize.y,
                    left: currentlyDragging.left + move.x,
                    right: currentlyDragging.right + move.x + constrainedResize.x,
                },
            ] as const;
        }),
        map(([resized, draggingItem]) => {
            const collisions = this.layout.items.reduce(
                (collided, item) =>
                    this.checkCollision(item, draggingItem)
                        ? { ...collided, [item.id]: item }
                        : collided,
                {},
            );

            const swap = Object.values(collisions).length === 2 && !resized;

            return {
                swap,
                draggingItem,
                collisions,
            };
        }),
        shareReplay({
            bufferSize: 1,
            refCount: true,
        }),
    );

    collisions$: Observable<Collisions> = combineLatest([this.#collisions$, this.layout$]).pipe(
        map(([{ draggingItem, collisions, swap }, { items }]) => {
            const reducedCollisions = Object.keys(collisions).reduce(
                (collisions, currentId) => {
                    const current = items.find(
                        ({ id }) => id === currentId && id !== draggingItem.id,
                    );
                    if (!current) {
                        return collisions;
                    }

                    return {
                        ...collisions,
                        [currentId]: this.getCollisionStyle(current, draggingItem, items),
                        [draggingItem.id || '']: {
                            opacity: 0.25,
                            background: 'var(--error)',
                        },
                    };
                },
                {} as Record<string, Collisions>,
            );

            const collisionInfo = Object.values(reducedCollisions);
            if (swap && draggingItem.id) {
                collisionInfo.forEach(collision => {
                    collision.background = 'var(--success)';
                });

                collisionInfo[draggingItem.id] = {
                    opacity: 0.25,
                    background: 'var(--success)',
                };
            }

            return reducedCollisions;
        }),
        shareReplay({
            bufferSize: 1,
            refCount: true,
        }),
    );

    highlightState$: Observable<HighlightState> = combineLatest([
        this.#distinctDraggingPosition$,
        this.collisions$,
    ]).pipe(
        map(
            ([
                {
                    move: { x, y },
                    resize,
                    transformOrigin,
                    id,
                    width,
                    height,
                    origin,
                },
                collisions,
            ]) => {
                const hidden = [x, y].every(val => val === Infinity);
                const swap =
                    Object.values(collisions).length === 2 && !Object.values(resize).some(Boolean);
                const transform = hidden
                    ? 'translate(100000px, 100000px)'
                    : this.getScale(id, resize) ||
                      `translate(${(id === 'added' ? x - origin.x : x) * width}px, ${
                          (id === 'added' ? y - origin.y : y) * height
                      }px)`;

                const styles = swap
                    ? { highlightClass: HighlightClasses.SWAP }
                    : { transform, background: 'var(--dragging-highlight)' };
                return <HighlightState>{
                    [id]: {
                        // TODO: Use resize to determine scale,
                        ...styles,
                        transformOrigin,
                    },
                    x,
                    y,
                    swap,
                    resize,
                    width,
                    height,
                };
            },
        ),
        shareReplay({
            bufferSize: 1,
            refCount: true,
        }),
    );
    playable: string[] = ['online', 'recording', 'scheduled'];

    window = window;

    constructor(
        private cd: ChangeDetectorRef,
        private dialogsService: NxDialogsService,
        private toastService: NxToastService,
        public tourService: TourService,
        private systemService: NxSystemService,
        public systemsService: NxSystemsService,
        private pageService: NxPageService,
        public layoutGridService: NxLayoutGridService,
        public layoutStateService: LayoutStateService,
        private store: Store,
        public layoutItemsErrorsStore: LayoutItemsErrorsStore,
    ) {
        if (nxConfig.featureFlags.layoutsTimeline) {
            this.playable.push('archive');
        }

        this.layoutItemsErrorsStore.reset();

        // TODO - start - following should be moved to layout-greed-tree
        layoutGridService.changeView
            .pipe(untilDestroyed(this))
            .subscribe(resourceNode => this.changeView(resourceNode));
        layoutGridService.addItem
            .pipe(untilDestroyed(this))
            .subscribe(resourceNode => this.addItem(resourceNode));
        layoutGridService.moveAddedItem
            .pipe(untilDestroyed(this))
            .subscribe(({ event, itemParent, type }) =>
                this.moveAddedItem(event, itemParent, type),
            );
        // TODO - end -

        effect(() => {
            const layout = this.layout$$();
            const { width = 0, height = 0 } = this.wrapperSize$$() || {};
            if (!layout || !width || !height) {
                document.documentElement.style.setProperty('--current-layout-gap', '0px');
                return;
            }
            const cellWidth = width / layout.renderConfig.columns;
            const cellHeight = height / layout.renderConfig.rows;
            const constraint = Math.min(cellWidth, cellHeight);
            const size = constraint * layout.cellSpacing;
            document.documentElement.style.setProperty(
                '--current-layout-gap',
                `${(size / 2) * this.CELL_SPACE_RATIO}px`,
            );
        });

        effect(() => {
            const resolutions = this.layoutStateService.cameraResolutionLookup$$();
            const transcodingDisabled = this.cameraTranscodingDisabled$$();
            for (const { id, primary, secondary } of transcodingDisabled) {
                if (
                    ![ConnectionError.mjpegDisabled, ConnectionError.transcodingDisabled].includes(
                        this.layoutItemsErrorsStore.statuses$$()[id] as ConnectionError,
                    )
                ) {
                    continue;
                }
                const currentResolution = resolutions[id].resolution;
                const useSecondary = currentResolution === Resolution.LOW && !secondary;
                const usePrimary = currentResolution === Resolution.HIGH && !primary;

                if (usePrimary || useSecondary || ![primary, secondary].some(Boolean)) {
                    this.layoutItemsErrorsStore.remove(id, true);
                }
            }
        });
    }

    cameraTranscodingDisabled$$ = signal<{ id: string; primary: boolean; secondary: boolean }[]>(
        [],
    );

    otherSystems$$ = signal<LayoutResourceTree['otherSystems']>([]);

    currentSite$$ = paramModel('currentSite');

    search$$ = paramModel('search');

    currentActiveSite$$ = computed(() => {
        const currentSite = this.currentSite$$();
        const otherSystems = this.otherSystems$$();
        if (!currentSite || !otherSystems) {
            return null;
        }

        return findOtherSite(currentSite, otherSystems);
    });

    currentSiteId$$ = computed(() => this.currentActiveSite$$()?.details.id);

    previousOtherSitesScroll$$ = signal(0);

    updateOtherSitesScroll = (scrollTop: number): void => {
        if (this.currentSite$$()) {
            return;
        }
        this.previousOtherSitesScroll$$.set(scrollTop);
    };

    preserveScrollEffect = effect(() => {
        if (this.currentSiteId$$()) {
            return;
        }

        const otherSitesMenu = this.otherSitesMenu$$();
        const scrollTop = untracked(this.previousOtherSitesScroll$$);

        if (otherSitesMenu && scrollTop) {
            otherSitesMenu.setScrollPosition(scrollTop);
        }
    });

    loadSiteEffect = effect(
        () => {
            const currentSiteId = this.currentSiteId$$();
            if (currentSiteId) {
                this.layoutStateService.loadSite(currentSiteId);
            }
        },
        { allowSignalWrites: true },
    );

    activeSystemSearchResults$$ = computed(() => {
        const activeSystemResources = this.layoutItemLookup$$().tree;

        const filter = this.search$$();

        if (!filter) {
            return activeSystemResources;
        }

        return activeSystemResources.map(rootResourceNode => {
            if (isResourceParentNode(rootResourceNode)) {
                const filtered = filterOtherSites(rootResourceNode.children, filter);
                return {
                    ...rootResourceNode,
                    children: filtered.matches
                        ? filtered.results
                        : [
                              {
                                  type: ResourceType.PLACEHOLDER,
                                  name: staticLang.search.noMatches,
                                  details: { id: 'noResults' },
                              },
                          ],
                };
            }

            return rootResourceNode;
        });
    });

    allSitesSearchResults$$ = computed(() => {
        const otherSystemsFull: ResourceNode[] = this.otherSystems$$() || [];
        const otherSystems = removeSystemChildren(otherSystemsFull);
        const otherSystemsFilter = this.search$$();

        if (!otherSystemsFilter) {
            return { results: otherSystems, matches: 0 };
        }

        return filterOtherSites(otherSystems, otherSystemsFilter);
    });

    currentSiteSearchResults$$ = computed(() => {
        const currentActiveSite = this.currentActiveSite$$();
        if (!isResourceParentNode(currentActiveSite)) {
            return;
        }
        const currentSiteFull: ResourceNode[] = currentActiveSite.children || [];
        const siteCameras = removeSystemChildren(currentSiteFull);
        const currentSiteFilter = this.search$$();

        if (!currentSiteFilter) {
            return { results: siteCameras, matches: 0 };
        }

        return filterOtherSites(siteCameras, currentSiteFilter);
    });

    searchMatches$$ = computed(() =>
        this.currentActiveSite$$()
            ? this.currentSiteSearchResults$$().matches
            : this.allSitesSearchResults$$().matches,
    );

    filteredOtherSystems$$ = computed(() => {
        const currentSite = this.currentActiveSite$$();

        if (currentSite) {
            return this.currentSiteSearchResults$$().results;
        }

        return this.allSitesSearchResults$$().results.sort(({ type: a }, { type: b }) =>
            a === b ? 0 : a === ResourceType.SYSTEMS_ORGANIZATION ? -1 : 1,
        );
    });

    suggestedSiteSearch$$ = computed(() => {
        const otherSystems = this.otherSystems$$() || [];
        return otherSystems.map(({ name }) => name);
    });

    async ngOnChanges({
        layout,
        layoutItemLookup,
    }: NgChanges<NxLayoutGridComponent>): Promise<void> {
        const layoutChanged =
            layout?.currentValue && !isEqual(layout.currentValue, layout.previousValue);
        const itemsChanged =
            layoutItemLookup?.currentValue &&
            !isEqual(layoutItemLookup.currentValue, layoutItemLookup.previousValue);

        if (itemsChanged || layoutItemLookup?.firstChange) {
            this.layoutItemLookup$$.set(layoutItemLookup!.currentValue);
        }

        if (layout && (layoutChanged || itemsChanged)) {
            // this.openMenu = false;
            this.initialLayout$.next(layout.currentValue);
            this.changingLayout = false;
            this.updateLayout();
        }

        if (itemsChanged) {
            this.otherSystems$$.set(layoutItemLookup.currentValue.otherSystems);
            const cameras = Object.values(layoutItemLookup.currentValue).filter(
                assertResourceOfType.camera,
            );

            this.cameras$$.set(cameras.map(({ details }) => details));

            const cameraTranscodingDisabled = cameras.map(({ details: { id, parameters } }) => {
                const streams = parameters.mediaStreams?.streams ?? [];

                const streamRequiresTranscoding = (stream: number): boolean =>
                    isRequiresTranscoding(
                        streams.find(({ encoderIndex }) => encoderIndex === stream)?.codec,
                    );

                const primary = streamRequiresTranscoding(0);
                const secondary = streamRequiresTranscoding(1);

                return { id, primary, secondary };
            });

            this.cameraTranscodingDisabled$$.set(cameraTranscodingDisabled);
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
                    this.layoutItemsErrorsStore.remove(cameraId, true);
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
        this.onResize({ target: window });
    }

    startTour = (): void => this.tourService.start();

    checkIframeContent(id: string, frame: HTMLIFrameElement): void {
        const loaded = frame.contentWindow?.window.length;
        try {
            if (frame.contentWindow?.location.href) {
                return;
            }
        } catch ({ message }) {
            this.layoutItemsErrorsStore.set(id, {
                message,
            });
        }

        if (!loaded) {
            this.layoutItemsErrorsStore.set(id, {
                status: `${ResourceType.WEB_PAGE}_error`,
            });
        } else if (id in this.layoutItemsErrorsStore.messages$$()) {
            this.layoutItemsErrorsStore.remove(id, {
                message: true,
            });
        }

        if (loaded) {
            frame.style.opacity = '1';
            frame.style.zIndex = '100';
        }
    }

    cleanIdLegacy = cleanIdLegacy;

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
            this.layoutItemsErrorsStore.messages$$?.()[
                this.layoutItemLookup[id]?.details.id || status
            ],
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

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    getItem = ({
        item,
        layoutItemLookup,
    }: {
        item: ParsedLayoutItem;
        layoutItemLookup: NxLayoutGridComponent['layoutItemLookup'];
    }) => layoutItemLookup?.[item.resourceId];

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    getItemForDisplay = ({
        item,
        layoutItemLookup,
        errors,
    }: {
        item: ParsedLayoutItem;
        layoutItemLookup: NxLayoutGridComponent['layoutItemLookup'];
        errors: Record<string, string>;
    }) => {
        const itemDetail = this.getItem({ item, layoutItemLookup });
        return this.itemHasNoErrors({ itemDetail, errors }) ? itemDetail : null;
    };

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    getSystemInfo = ({ item, systems }: { item: ParsedLayoutItem; systems: NxSystemInfo[] }) => {
        const { systemId } = extractSystemAndResourceId(item.resourcePath);
        return systems?.find(({ id }) => id === systemId);
    };

    itemHasNoErrors = ({
        itemDetail,
        errors,
    }: {
        itemDetail: ReturnType<NxLayoutGridComponent['getItem']>;
        errors: Record<string, string>;
    }): boolean =>
        // this method is a kind of duplicate. We indicate here if the item has error giving no status
        // and we do the same thing sometimes to define type of error in the placeholder
        !errors[itemDetail.details.id] &&
        !(
            assertResourceOfType.camera(itemDetail) &&
            (itemDetail.details.unauthorized || itemDetail.details.typeId === CameraTypeId.Virtual)
        ) &&
        (((assertResourceOfType.camera(itemDetail) || assertResourceOfType.server(itemDetail)) &&
            itemDetail.details.online) ||
            assertResourceOfType.webpage(itemDetail));

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

            const node = this.layoutItemLookup?.[item.resourceId];

            const updatedItem = { ...item, renderConfig };

            const itemSize = this.calculateItemSize(
                wrapperSize,
                updatedItem,
                node,
                layout as ExtractObservable<typeof this.layout$>,
            );

            if (
                itemSize &&
                (assertResourceOfType.camera(node) ||
                    assertResourceOfType.server(node) ||
                    assertResourceOfType.webpage(node) ||
                    assertResourceOfType.iodevice(node))
            ) {
                this.updatePlaceholderConfig(
                    itemSize,
                    updatedItem,
                    'status' in node?.details ? node?.details?.status : '',
                );
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
        if (!items.length) {
            return { width: 1, height: 1, originX: 0, originY: 0 };
        }

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
            return size;
        }

        const { height, width } =
            document.fullscreenElement &&
            document.fullscreenElement !== this.layoutStateService.gridSection
                ? size
                : this.calculateAspect([size, layout]).cellSize;
        const { renderConfig, rotation } = item;

        renderConfig.showTooltip = width < 360;
        if (assertResourceOfType.camera(node)) {
            const initialAspect = node.aspectRatio || renderConfig.aspect || 1;

            const isRotated = Boolean((Math.round(rotation / 90) * 90) % 180);

            const aspect = isRotated ? 1 / initialAspect : initialAspect;

            renderConfig.child = {
                'aspect-ratio': aspect || 'unset',
            };

            const wide = width / height > aspect;
            return {
                width: wide && aspect ? height * aspect : width,
                height: !wide && aspect ? width / aspect : height,
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
        const spacing = cellSpacing ?? 0;
        const { width, height, originX: x, originY: y } = this.calculateSize(items);
        const columns = width;
        const rows = height;
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

    filterRemovedResources = (items: LayoutItems): LayoutItems => items;

    parseLayout = (layout: Layout): ParsedLayout => ({
        ...layout,
        items: layout.items.map(item => ({
            ...item,
            systemStatusOld$$: computed(() => {
                const systems = this.systemsService.systems$$();
                const { systemId } = extractSystemAndResourceId(item.resourcePath);
                const system = systems?.find(({ id }) => id === systemId) || { id: systemId };
                const { connectingToSystem, unknownSystem, systemUnavailable } =
                    staticLang.layouts.otherSystems;
                const value = !('stateOfHealth' in system)
                    ? unknownSystem
                    : system.stateOfHealth === 'online'
                      ? connectingToSystem
                      : systemUnavailable;

                return {
                    value,
                    params: system,
                };
            }),
        })),
        locked:
            (!nxConfig.featureFlags.layoutsEditable && !nxConfig.featureFlags.layoutsDemo) ||
            layout.locked,
        renderConfig: this.generateRenderConfig(layout),
        settings: this.SETTINGS_CONFIG,
    });

    updateBackground = (
        { distance }: { distance: Point },
        { id, ...other }: ParsedLayoutItem,
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
        nodeType?: ResourceType,
    ): void => {
        this.addingItem$$.set(true);
        if (itemParent) {
            move.x -= itemParent.offsetLeft + itemParent.offsetWidth;

            if (move.x < 0) {
                return this.updateLayout();
            }

            move.y += this.addOffset - 108;
        }

        const ignorePosition = nodeType === ResourceType.LAYOUT;

        if (ignorePosition) {
            this.#draggingPosition$.next({ move: { x: Infinity, y: Infinity }, id: 'added' });
        } else {
            this.#draggingPosition$.next({ move, id: 'added' });
        }
    };

    updateLayout = (): void => {
        this.#draggingPosition$.next(this.INITIAL_DRAG_STATE);
        this.cd.markForCheck();
    };

    moveItem = ({ id }: LayoutItem): void => {
        combineLatest([this.highlightState$, this.collisions$])
            .pipe(take(1))
            .subscribe(([{ x, y, resize, swap }, collisions]) => {
                const unresolvedCollisions = Object.values(collisions).reduce(
                    (prevCollision, item) => item.moveTo === false,
                    false,
                );
                const notMoved = [x, y, resize.x, resize.y].every(change => !change);
                const [swapTarget = null] =
                    Object.entries(collisions).find(([_, { moveTo }]) => moveTo) || [];

                if (unresolvedCollisions || notMoved || (swapTarget && !swap)) {
                    return this.updateLayout();
                }

                const swappedItems = this.layout.items.map(item => ({ ...item }));

                if (swapTarget) {
                    const movedItem = swappedItems.find(({ id: itemId }) => itemId === id);
                    const swappedItem = swappedItems.find(({ id }) => id === swapTarget);
                    if (movedItem && swappedItem) {
                        [
                            movedItem.top,
                            movedItem.bottom,
                            movedItem.left,
                            movedItem.right,
                            swappedItem.top,
                            swappedItem.bottom,
                            swappedItem.left,
                            swappedItem.right,
                        ] = [
                            swappedItem.top,
                            swappedItem.bottom,
                            swappedItem.left,
                            swappedItem.right,
                            movedItem.top,
                            movedItem.bottom,
                            movedItem.left,
                            movedItem.right,
                        ];
                    }
                }

                const items = this.updateItemNames(
                    swappedItems.map(item => {
                        const dragging = item.id === id;
                        if (dragging && !swapTarget) {
                            const { x: resizeX, y: resizeY } = this.getConstraint(item, resize);
                            item.top += y;
                            item.bottom += y + resizeY;
                            item.left += x;
                            item.right += x + resizeX;
                        }
                        return item;
                    }),
                );

                this.layoutStateService.updateLayout({ ...this.layout, items });
                this.updateLayout();
            });
    };

    async changeView(node: ResourceNode | LayoutItem): Promise<void> {
        if (!('children' in node) && this.#lastWidth <= ViewportBreakpoints.Tablet.width) {
            this.layoutGridService.handleMenuClose();
        }

        const isLayoutItem = 'id' in node;
        const id = cleanIdLegacy(isLayoutItem ? node.id : node.details?.id);

        if (id && id !== cleanIdLegacy(this.layout.id)) {
            this.changingLayout = id;
            this.layoutItemsErrorsStore.reset();
            if (
                !this.system.permissionManager.permissions$$().editCameras ||
                !this.CONFIG.featureFlags.layoutsAuthorizeCamera
            ) {
                this.layoutItemsErrorsStore.remove('defaultPassword', {
                    message: true,
                });
                this.layoutItemsErrorsStore.remove('unauthorized', {
                    message: true,
                });
            }
            this.layoutStateService.portal = null;
            const withCrossSystemId =
                'type' in node &&
                assertResourceOfType.camera(node) &&
                node.details.systemId !== this.system.id
                    ? `${node.details.systemId}.${id}`
                    : id;
            this.layoutChanged.emit(withCrossSystemId);
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
        const itemId = itemDetail.details.id;
        const showOfflineError = (): void => {
            itemDetail.details.online = false;
            this.layoutItemsErrorsStore.set(itemId, {
                status: staticLang.common.cameraStates.unavailable,
                icon: 'offline',
                message: staticLang.layouts.itemPlaceholders.additionalErrorMessages.UNAVAILABLE,
            });
        };

        const showTranscodingDisabledError = (status: ConnectionError): void => {
            this.layoutItemsErrorsStore.set(itemId, {
                status,
                icon: 'warning',
            });
        };

        const showDefaultPasswordError = (): void => {
            this.layoutItemsErrorsStore.set(itemId, {
                status: 'defaultPassword',
                icon: 'warning',
            });
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
        // TODO: Need to update once granular permissions by camera/resource are setup.
        if (
            !this.CONFIG.featureFlags.layoutsAuthorizeCamera ||
            !system.permissionManager.permissions$$().editCameras
        ) {
            return;
        }
        const defaultPassword = camera.status !== CameraStatus.Unauthorized;
        const retriesTimeout = 30 * 1000;
        const firstCheckTimeout = 10 * 1000;
        const cameraCredentialUpdateTimeout = 5 * 1000;
        const retries = Math.round(
            (retriesTimeout - firstCheckTimeout) / cameraCredentialUpdateTimeout,
        );
        let firstCheck = true;
        const update = (): Promise<void> => {
            return firstValueFrom(
                of('').pipe(
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
                ),
            ).finally(() => {
                const selectedCamera = system.cameraManager.cameras.find(
                    ({ id }) => id === camera.id,
                );

                if (!selectedCamera) {
                    return;
                }

                if (selectedCamera.status === CameraStatus.Unauthorized && !defaultPassword) {
                    this.toastService.notify(
                        {
                            value: staticLang.layouts.toasts.unableToAuthorizeCamera,
                            params: pick(camera, 'name'),
                        },
                        ToastType.Warning,
                    );
                } else {
                    this.layoutItemsErrorsStore.remove(selectedCamera.id, {
                        status: true,
                        icon: true,
                    });
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
        { details: { id: resourceId, ...details } }: ResourceNode,
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
            resourcePath: `cloud://${
                'systemId' in details ? details.systemId : this.system.id
            }.${resourceId}`,
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

    updateItemNames = (items: LayoutItem[]): LayoutItem[] =>
        items.map(item => ({
            ...item,
            name: this.layoutItemLookup[dirtyId(item.resourceId)]?.name || item.name,
        }));

    addItem = (node: ResourceNode): void => {
        combineLatest([this.highlightState$, this.collisions$])
            .pipe(take(1))
            .subscribe(([{ x, y, resize }, collisions]) => {
                const isPlaceholder = Object.values(placeholderNameLookup).includes(
                    this.layout.name,
                );

                if (isPlaceholder) {
                    const items = [this.generateLayoutItem(node, { x: 0, y: 0 })];
                    const isLocalLayout = !hasCrossSystemItems(items, this.system.id);
                    if (isLocalLayout) {
                        this.layoutStateService.createNewLayout(items);
                    } else {
                        this.layoutStateService.createNewCrossSystemLayout(items);
                    }
                    return;
                }

                const unresolvedCollisions = Object.values(collisions).some(c => !c.moveTo);
                const notMoved =
                    !!this.layout.items.length &&
                    [x, y, resize.x, resize.y].every(change => !change);
                this.addingItem$$.set(false);
                if (unresolvedCollisions || notMoved) {
                    return this.updateLayout();
                }

                const items = this.updateItemNames([
                    ...this.layout.items,
                    ...(assertResourceOfType.layout(node)
                        ? createAddedItems(this.layout.items, node.details.items)
                        : [this.generateLayoutItem(node, { x, y })]),
                ]).map(ensureLayoutItemResourcePath(this.system.id));

                const isLocalLayout = !hasCrossSystemItems(items, this.system.id);
                const layoutOrFocus = this.layoutItemLookup[dirtyId(this.layout.id)];
                if (
                    assertResourceOfType.layout(layoutOrFocus) &&
                    layoutOrFocus.crossSystem === !isLocalLayout
                ) {
                    const currentUser = this.system.permissionManager.currentUser$$();

                    if (!currentUser!.isAdmin) {
                        // If user doesn't have permissions to edit a layout then create duplicate local layout
                        this.layoutStateService.duplicateAsNewLayout({
                            ...this.layout,
                            items,
                        });
                    } else {
                        this.layoutStateService.updateLayout({ ...this.layout, items });
                    }
                } else {
                    if (isLocalLayout) {
                        this.layoutStateService.createNewLayout(items);
                    } else {
                        this.layoutStateService.createNewCrossSystemLayout(items);
                    }
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
                moveTo: dragging,
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
                !nxConfig.featureFlags.layoutsRemoveItemDialog ||
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

    resizing = false;

    resizeMenuComplete(event: CdkDragRelease): void {
        event.source._dragRef.reset();
        this.resizing = false;
    }

    resizeMenu(event: CdkDragMove<unknown>): void {
        this.layoutStateService.menuResizePixelUpdater$.next(event.pointerPosition.x);
        this.resizing = true;
    }

    setResolutionToAuto(): void {
        this.layoutStateService.setLayoutResolution({
            layoutId: this.layout.id,
            resolution: Resolution.AUTO,
        });
    }

    loadSiteAction = {
        action: (): Observable<SystemResourcesTypeMap> =>
            this.layoutStateService
                .loadSite(this.currentSiteId$$()!, { cameras: true, servers: true })
                .pipe(debounceTime(1_000), delay(new Date(Date.now() + 2_500))),
        success: () => {},
        error: () => {},
    };
}
