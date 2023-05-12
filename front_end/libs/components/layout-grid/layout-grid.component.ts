import { ArrayDataSource } from '@angular/cdk/collections';
import { CdkDrag, CdkDragEnter, CdkDropList } from '@angular/cdk/drag-drop';
import { NestedTreeControl } from '@angular/cdk/tree';
import { HttpErrorResponse } from '@angular/common/http';
import {
    ChangeDetectorRef,
    Component,
    EventEmitter,
    HostListener,
    Inject,
    Input,
    Output,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { cloneDeep, isEqual, omit } from 'lodash-es';
import { TourService } from 'ngx-ui-tour-md-menu';
import {
    BehaviorSubject,
    combineLatest,
    interval,
    Observable,
    Subject,
    timer,
    firstValueFrom,
    from,
    of,
    throwError,
} from 'rxjs';
import {
    distinctUntilChanged,
    filter,
    map,
    shareReplay,
    take,
    tap,
    switchMap,
    skip,
    debounceTime,
    takeUntil,
    startWith,
    catchError,
    delay,
    retry,
} from 'rxjs/operators';
import { v4 as uuid } from 'uuid';

import staticLang from '@common/language/language_i18n_static.json';
import { ConfigType } from '@components/console-table/console-table.component.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { environment } from '@environments/environment';
import { icons } from '@lib/variables/static-variables';
import { ConnectionError } from '@openLibs/webrtc-stream-manager';
import { Translatable } from '@pipes/nx-translate.types';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { CustomAccountProperty } from '@services/nx-cloud-api/custom-account-property';
import { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxPageService } from '@services/page.service';
import { Layout, LayoutItem, LayoutItems } from '@services/system-api.types';
import { NxSystemRestAPI } from '@services/system-rest-api.service';
import { NxSystemCamera } from '@services/system.service/camera-manager/camera-manager-types';
import { NxSystem } from '@services/system.service/system';
import { WINDOW } from '@services/window-provider';
import { ViewportBreakpoints } from '@styles/theme-variables-common';
import { cleanId, pickFrom } from '@utils/general';
import { NgChanges } from '@utils/ng-changes';

import type {
    BaseResourceNode,
    LayoutRenderConfig,
    LayoutResourceTree,
    NewPosition,
    ParsedLayout,
    ParsedLayoutItem,
    ParsedLayoutItems,
    Point,
    Position,
    ResourceNode,
    Setting,
    Size,
} from './layout-grid.types';
import { ResourceType } from './layout-grid.types';

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

interface LayoutSettings {
    openMenu: 'left' | 'right' | 'both';
    previousOpenMenu: 'left' | 'right' | 'both';
}

@UntilDestroy()
@Component({
    selector: 'nx-layout-grid',
    templateUrl: 'layout-grid.component.html',
    styleUrls: ['layout-grid.component.scss'],
})
export class NxLayoutGridComponent {
    @Input() layout: Layout;
    @Input() layoutItemLookup: LayoutResourceTree;
    @Input() system: NxSystem;

    @Output() layoutChanged = new EventEmitter<string>();
    @Output() showPtz = new EventEmitter<NxSystemCamera>();
    @Output() addResource = new EventEmitter<ResourceType>();
    @Output() removeResource = new EventEmitter<{
        resourceType: ResourceType;
        details: Record<string, unknown>;
    }>();
    @Output() editResource = new EventEmitter<{
        resourceType: ResourceType;
        details: Record<string, unknown>;
    }>();

    #lastWidth: number = Infinity;

    @HostListener('window:resize', ['$event'])
    onResize({ target: { innerWidth: width } }: { target: Window }): void {
        const closeOnResize = this.#lastWidth > width && width <= ViewportBreakpoints.Tablet.width;

        if (closeOnResize) {
            this.layoutSettings.update(
                curr =>
                    curr.openMenu
                        ? {
                              ...curr,
                              previousOpenMenu: curr.openMenu,
                              openMenu: null,
                          }
                        : curr,
                true,
            );
        }

        this.#lastWidth = width;
    }

    SAVE_DELAY = 0;

    treeControl = new NestedTreeControl<ResourceNode>(node => node.children);
    dataSource: ArrayDataSource<BaseResourceNode>;

    layoutSettings: CustomAccountProperty<LayoutSettings>;

    previousOpenMenu: 'left' | 'right' | 'both' = null;
    unsaved: Layout | false = false;
    dragging = false;
    addingItem = false;
    addOffset = 0;
    changingLayout: string | boolean = true;
    errors: Record<string, string> = {};
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

    #initialLayout$ = new BehaviorSubject<Layout>(null);
    #wrapperSize$ = new BehaviorSubject<Size>(null);
    #countdownTimer$ = new Subject<number>();
    unsubTooltip$ = new Subject<string>();

    layout$ = this.#initialLayout$.pipe(
        filter(layout => !!layout),
        map(layout => ({ ...layout, items: this.filterRemovedResources(layout.items || []) })),
        map(initial => this.parseLayout(initial)),
        // tap(layout => {
        //     console.log(layout);
        // }),
        map(({ items, renderConfig, ...layout }) => ({
            ...layout,
            renderConfig,
            items: this.annotateWithRenderConfig({ items, renderConfig }),
        })),
        shareReplay({
            bufferSize: 1,
            refCount: true,
        }),
    );

    showTooltip$ = this.#wrapperSize$.pipe(
        filter(Boolean),
        map(({ width }) => !this.window.matchMedia('(any-hover: none)').matches && width > 600),
    );

    aspectHandler$ = combineLatest([this.#wrapperSize$, this.layout$]).pipe(
        filter(([wrapper]) => !!wrapper),
        map(
            ([
                { width: wrapperWidth, height: wrapperHeight },
                {
                    cellAspectRatio,
                    renderConfig: { gridWrapper, rows, columns, origin },
                },
            ]) => {
                cellAspectRatio ||= 1.7777777910232544;
                wrapperWidth = wrapperWidth - this.EDGE_GAP;
                wrapperHeight = wrapperHeight - this.EDGE_GAP;
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
            },
        ),
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
            transformOrigin?: string;
        },
    );

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
                resize: {
                    x: Math.round(resize.x / width),
                    y: Math.round(resize.y / height),
                },
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
    playable: string[] = ['online', 'recording'];

    constructor(
        configService: NxConfigService,
        private cd: ChangeDetectorRef,
        private router: Router,
        private activatedRoute: ActivatedRoute,
        private dialogsService: NxDialogsService,
        public tourService: TourService,
        private cloudApi: NxCloudApiService,
        @Inject(WINDOW) private window: Window,
        private pageService: NxPageService,
    ) {
        this.CONFIG = configService.config;
        if (this.CONFIG.featureFlags.layoutsTimeline) {
            this.playable.push('archive');
        }
        this.layoutSettings = this.cloudApi.customAccountPropertyFactory(
            `layouts_${activatedRoute.snapshot.params.systemId}`,
            { openMenu: 'left', previousOpenMenu: null },
        );
    }

    async ngOnChanges({
        layout,
        layoutItemLookup,
    }: NgChanges<NxLayoutGridComponent>): Promise<void> {
        if (layout?.currentValue && !isEqual(layout.currentValue, layout.previousValue)) {
            // this.openMenu = false;
            if (this.unsaved) {
                await this.saveLayout(layout.currentValue.id);
            }
            this.#initialLayout$.next(layout.currentValue);
            this.changingLayout = false;
        }

        if (
            layoutItemLookup?.currentValue &&
            !isEqual(layoutItemLookup.currentValue, layoutItemLookup.previousValue)
        ) {
            this.dataSource = new ArrayDataSource(layoutItemLookup.currentValue.tree);
        }

        const layoutId = this.layout?.id;
        const layoutItems = this.layoutItemLookup?.tree;

        // if (layout?.firstChange) {
        //     this.treeControl.collapseAll();
        // }

        if (layoutId && layoutItems) {
            const openNodes = this.getOpenNodes();

            this.expandNodes(layoutItems, [layoutId, ...openNodes]);
        }
    }

    ngOnInit(): void {
        this.#countdownTimer$
            .pipe(
                debounceTime(2500),
                skip(1),
                switchMap(time => interval(1000).pipe(map(cur => time - cur))),
                tap(time => !time && this.saveLayout()),
                shareReplay({
                    bufferSize: 1,
                    refCount: true,
                }),
                untilDestroyed(this),
            )
            .subscribe();
    }

    ngAfterViewInit(): void {
        this.onResize({ target: this.window });
    }

    async ngOnDestroy(): Promise<void> {
        if (this.unsaved) {
            await this.saveLayout();
        }
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
            this.errors[id] = ResourceType.WEB_PAGE;
        } else if (id in this.additionalErrorMessages) {
            delete this.additionalErrorMessages[id];
        }

        if (loaded) {
            frame.style.opacity = '1';
            frame.style.zIndex = '100';
        }
    }

    getOpenNodes = (): string[] => {
        const openNodes = this.activatedRoute.snapshot.queryParams.openNodes || [];

        if (typeof openNodes === 'string') {
            return [openNodes];
        }

        return openNodes.filter(nodeId =>
            Object.keys(this.layoutItemLookup).map(cleanId).includes(nodeId),
        );
    };

    expandNodes = (
        nodes: BaseResourceNode[],
        nodeIds: string[],
        parents: ResourceNode[] = [],
    ): void =>
        (nodes as ResourceNode[]).forEach(node => {
            const nodeId = cleanId(node.details?.id);
            nodeIds = nodeIds.map(cleanId);
            if (nodeId && nodeIds.includes(nodeId)) {
                [...parents, node].forEach(node => this.treeControl.expand(node));
            }

            if (node.children) {
                this.expandNodes(node.children, nodeIds, [...parents, node]);
            }
        });

    cleanId = cleanId;

    toggleMenu(menu: 'left' | 'right' | 'both' = null, force = false): void {
        this.layoutSettings.update(curr => {
            menu ||= curr.previousOpenMenu;
            if (!curr.openMenu || force) {
                if (curr.openMenu) {
                    curr.previousOpenMenu = curr.openMenu;
                }
                curr.openMenu = curr.openMenu === menu ? null : menu;
            }

            return curr;
        }, true);
    }

    getScale = (itemId: string, resize: Point): string => {
        if (resize.x === 0 && resize.y === 0) {
            return;
        }

        const item = this.#initialLayout$.value.items.find(({ id }) => id === itemId);
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

    generateItemRenderConfig =
        ({ spacing, aspectRatio, origin }: LayoutRenderConfig) =>
        item => {
            const calcFactory = (origin: number) => (point: number) => point - origin + 1;

            const calcX = calcFactory(origin.x);
            const calcY = calcFactory(origin.y);
            const { top, bottom, left, right } = item;
            const renderConfig = {
                padding: `${(spacing * 25) / aspectRatio}%`,
                'grid-column': `${calcX(left)} / ${calcX(right)}`,
                'grid-row': `${calcY(top)} / ${calcY(bottom)}`,
                aspect: aspectRatio,
            };
            return {
                ...item,
                renderConfig,
            };
        };

    annotateWithRenderConfig = ({
        items,
        renderConfig,
    }: Pick<ParsedLayout, 'items' | 'renderConfig'>): ParsedLayoutItems =>
        items.map(this.generateItemRenderConfig(renderConfig));

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
        { height, width }: Size,
        { renderConfig }: ParsedLayoutItem,
        item: ResourceNode,
    ): void => {
        renderConfig.showTooltip = width < 360;
        if (item?.type !== ResourceType.CAMERA) {
            return;
        }

        if (!item.aspectRatio) {
            item.aspectRatio = renderConfig.aspect;
        }

        const tooWide = width > height * item.aspectRatio;

        renderConfig.child = {
            ...renderConfig.child,
            'max-width': `${tooWide ? height * item.aspectRatio : width}px`,
        };
        this.cd.markForCheck();
    };

    generateRenderConfig({
        cellAspectRatio,
        cellSpacing,
        items,
        fixedWidth,
        fixedHeight,
    }: Layout): LayoutRenderConfig {
        const aspectRatio = cellAspectRatio || 1.7777777910232544;
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

    entered(event: CdkDragEnter): void {
        // console.log(event);
    }

    updateBackground = (
        { distance }: { distance: Point },
        { id }: ParsedLayoutItem,
        action = 'move',
    ): void => {
        this.#draggingPosition$.next({ [action]: distance, id });
    };

    moveAddedItem = (
        { pointerPosition: move }: { pointerPosition: Point },
        itemParent?: HTMLElement,
    ): void => {
        this.addingItem = true;
        if (itemParent) {
            move.x -= itemParent.offsetLeft + itemParent.offsetWidth;
            move.y += this.addOffset - 108;
        }
        this.#draggingPosition$.next({ move, id: 'added' });
    };

    updateLayout = (): void => {
        this.#initialLayout$.next(this.layout);
        this.#draggingPosition$.next(this.INITIAL_DRAG_STATE);
        this.cd.markForCheck();
    };

    addNewResource = (resourceType: ResourceType): void => {
        this.addResource.emit(resourceType);
    };

    removeExistingResource = (
        resourceType: ResourceType,
        details: Record<string, unknown>,
    ): void => {
        this.removeResource.emit({ resourceType, details });
    };

    editExistingResource = (resourceType: ResourceType, details: Record<string, unknown>): void => {
        this.editResource.emit({ resourceType, details });
    };

    hasActions: Partial<
        Record<ResourceType, { action: string; icon: string; handler: unknown; tooltip?: string }[]>
    > = {
        [ResourceType.LAYOUTS]: [
            {
                action: 'create',
                icon: 'plus',
                tooltip: this.LANG.layouts.createNew,
                handler: this.addNewResource,
            },
        ],
        [ResourceType.LAYOUT]: [
            {
                action: 'edit',
                icon: 'edit',
                tooltip: this.LANG.layouts.edit,
                handler: this.editExistingResource,
            },
            {
                action: 'delete',
                icon: 'delete',
                tooltip: this.LANG.layouts.delete,
                handler: this.removeExistingResource,
            },
        ],
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

                this.layout.items = this.layout.items.map(item => {
                    const dragging = item.id === id;
                    const resolvedCollision = collisions[item.id];
                    if (dragging) {
                        const { x: resizeX, y: resizeY } = this.getConstraint(item, resize);
                        item.top += y;
                        item.bottom += y + resizeY;
                        item.left += x;
                        item.right += x + resizeX;
                    } else if (resolvedCollision) {
                        item = { ...item, ...resolvedCollision.moveTo };
                    }

                    return item;
                });
                this.autoSave();
            });
    };

    autoSave<T = unknown>(settingName?: string, value?: T): void {
        if (settingName) {
            this.layout[settingName] = value;
        }

        this.updateLayout();
        this.unsaved = cloneDeep(this.layout);

        if (this.layout.id) {
            this.#countdownTimer$.next(this.SAVE_DELAY);
        }
    }

    saveLayout = async (nextLayoutId?: string): Promise<void> => {
        const mediaserver = this.system.mediaserver as NxSystemRestAPI;
        const { systemId: _, ..._layout } = this.unsaved || this.layout;
        this.unsaved = false;
        if (!_layout.id) {
            const layoutToSave = omit(_layout, ['name', 'id']);
            await this.dialogsService.edit(
                {
                    heading: staticLang.layouts.actions.unsaved.label,
                    contextManifest: {
                        ...pickFrom(staticLang.layouts.actions.unsaved, ['label']),
                        fields: [
                            {
                                ...staticLang.layouts.actions.unsaved.fields.info,
                                type: null,
                                name: 'info',
                            },
                            {
                                ...staticLang.layouts.actions.unsaved.fields.name,
                                type: ConfigType.TEXT,
                                name: 'name',
                                meta: {
                                    options: {
                                        required: true,
                                    },
                                },
                            },
                        ],
                    },
                    handlerProcess: ({ name }) =>
                        firstValueFrom(
                            mediaserver.createLayout({ ...layoutToSave, name }).pipe(
                                tap(_ => {
                                    this.unsaved = false;
                                    this.layoutChanged.emit(nextLayoutId || this.layout.id);
                                }),
                            ),
                        ),
                },
                layoutToSave,
            );
        } else if (_layout.id) {
            await mediaserver.putLayout(_layout.id, _layout).toPromise();
        }
        if (_layout.id && _layout.id === this.layout.id) {
            this.layoutChanged.emit(_layout.id);
            this.showPtz.emit();
        }
    };

    async changeView(node: ResourceNode | LayoutItem): Promise<void> {
        const isLayoutItem = 'id' in node;
        const id = isLayoutItem ? node.id : node.details?.id;
        if (!isLayoutItem) {
            const targetIds = (
                id
                    ? [id]
                    : (node?.children || []).map(child => child.details?.id).filter(id => !!id)
            ).map(cleanId);
            const open = this.treeControl.isExpanded(node);
            const openNodes = this.getOpenNodes().filter(id => !targetIds.includes(id));
            if (open && targetIds) {
                openNodes.push(...targetIds);
            }
            const queryParams = { ...this.activatedRoute.snapshot.queryParams, openNodes };
            await this.router.navigate([], {
                relativeTo: this.activatedRoute,
                replaceUrl: true,
                queryParams,
            });
        }

        if (id && cleanId(id) !== cleanId(this.layout.id)) {
            this.changingLayout = cleanId(id);
            this.errors = {};
            this.additionalErrorMessages = {};
            this.layoutChanged.emit(id);
        }
        this.pageService.pageTitle(staticLang.pageTitles.layouts);
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
            const serverName = this.layoutItemLookup[itemDetail.details.parentId].name;
            this.errors[itemDetail.details.id] = staticLang.common.cameraStates.unavailable;
            this.errorIcons[itemDetail.details.id] = 'offline';
            this.additionalErrorMessages[itemDetail.details.id] = {
                value: staticLang.layouts.additionalErrorMessages.unreachable,
                params: { serverName },
            };
        };

        const showDefaultPasswordError = (): void => {
            this.errors[itemDetail.details.id] = 'defaultPassword';
            this.errorIcons[itemDetail.details.id] = 'warning';
        };

        if (error === ConnectionError.authorization) {
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

    openCameraSettings(cameraId: string): void {
        const base = environment.isLocal
            ? '/settings/cameras'
            : `/systems/${this.system.id}/cameras`;
        this.window.open(`${base}/${cleanId(cameraId)}`, '_blank');
    }

    updateCameraCredentials(system: NxSystem, camera: NxSystemCamera): void {
        const cameraCredentialUpdateTimeout = 1500;
        const update = (): Promise<void> => {
            return of('')
                .pipe(
                    delay(cameraCredentialUpdateTimeout),
                    switchMap(() =>
                        from(system.cameraManager.getCameras()).pipe(
                            switchMap(cameras => {
                                const selectedCamera = cameras.find(({ id }) => id === camera.id);
                                const unauthorized = selectedCamera.status === 'unauthorized';
                                if (unauthorized) {
                                    return throwError('Camera Unauthorized');
                                }
                                return of(selectedCamera);
                            }),
                            delay(cameraCredentialUpdateTimeout),
                        ),
                    ),
                    retry(5),
                    delay(cameraCredentialUpdateTimeout),
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

                    camera.status = selectedCamera.status;

                    if (camera.status === 'Unauthorized') {
                        this.dialogsService.notify(
                            {
                                value: staticLang.layouts.errors.unableToAuthorizeCamera,
                                params: pickFrom(camera, ['name']),
                            },
                            'warning',
                        );
                    }
                });
        };

        this.dialogsService.updateCameraCredentials({
            camera,
            system,
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
        const id = `{${uuid()}}`;
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
            resourceId,
            resourcePath: '',
            right,
            rotation: 0,
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
                this.addingItem = false;
                if (unresolvedCollisions || notMoved) {
                    return this.updateLayout();
                }

                this.layout.items.push(this.generateLayoutItem(node, { x, y }));
                if (this.layoutItemLookup[`{${this.layout.id}}`]) {
                    this.layout.id = '';
                    this.showPtz.emit();
                }

                this.autoSave();
            });
    };

    itemId = (index: number, { id }: LayoutItem): string => id;

    checkCollision = (item: LayoutItem, itemTwo: Partial<Position>): boolean =>
        item.left < itemTwo.right &&
        item.right > itemTwo.left &&
        item.top < itemTwo.bottom &&
        item.bottom > itemTwo.top;

    getNewPosition = (
        { top, bottom, left, right }: LayoutItem,
        dragging: CdkDrag<LayoutItem>,
    ): NewPosition => {
        const x = -1;
        const y = 1;
        const translateX = (x / Math.abs(right - left)) * 100;
        const translateY = (y / Math.abs(top - bottom)) * 100;
        const transform = `translate(${translateX}%, ${translateY}%)`;
        return { top: top + y, bottom: bottom + y, left: left + x, right: right + x, transform };
    };

    getCollisionStyle = (
        item: LayoutItem,
        dragging: Partial<Position>,
        items: LayoutItems,
    ): Collisions => {
        // TODO: Need to find algorithm for finding best position
        // const { transform, ...targetPosition } = this.getNewPosition(item, dragging);
        const collided = items.length;

        if (collided) {
            return {
                moveTo: null,
                opacity: 0.25,
                background: 'var(--error)',
            };
        }

        return {};

        // return {
        //     moveTo: targetPosition,
        //     transform,
        //     opacity: 0.4,
        //     background: 'green'
        // };
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
            update = await this.dialogsService.confirm({
                title,
                message: {
                    value: message,
                    params: { name: item.name, layoutName: this.layout.name },
                },
                footer,
            });
        }

        if (update) {
            this.layout.items = this.layout.items.filter(item => item.id !== id);
            this.autoSave();
        }
    };

    hasChild = (_: number, node: ResourceNode): boolean =>
        [
            ResourceType.CAMERAS,
            ResourceType.WEB_PAGES,
            ResourceType.SERVERS,
            ResourceType.LAYOUTS,
        ].includes(node.type)
            ? !!node.children
            : !!node.children?.length;

    unsubTooltips = (): void => this.unsubTooltip$.next('unsub');

    tooltipTarget$ = new BehaviorSubject<string>('');

    updateTooltipTarget = (id: string): void => this.tooltipTarget$.next(id);

    setTooltip(target: HTMLSpanElement, title: string): void {
        target.title = target.offsetWidth < target.scrollWidth ? title : '';
    }

    pingServer =
        ({ parentId: serverId }: { parentId: string }) =>
        (): Observable<unknown> =>
            this.system.serverManager.mediaserverConnections[serverId]
                .ping()
                .pipe(catchError(() => Promise.resolve()));

    serverStats$ = this.tooltipTarget$.pipe(
        filter(id => !!id),
        distinctUntilChanged(),
        switchMap(serverId =>
            timer(0, 1000).pipe(
                // switchMap(() => this.system.serverManager.initSystemMediaServers()),
                switchMap(() => this.system.serverManager.getStatistics(serverId)),
                map(({ reply, errorString: error }) => ({
                    error,
                    statistics: reply.statistics?.map(({ description, value }) => ({
                        description,
                        value: `${(value * 100).toFixed(2)}%`,
                    })),
                })),
                startWith(null),
                untilDestroyed(this),
                takeUntil(this.unsubTooltip$),
            ),
        ),
    );
}
