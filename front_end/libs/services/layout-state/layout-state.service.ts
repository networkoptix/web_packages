/* eslint-disable nx/ban-global-variables */
import { ComponentPortal, ComponentType, Portal } from '@angular/cdk/portal';
import {
    effect,
    Injectable,
    Injector,
    runInInjectionContext,
    signal,
    TemplateRef,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { createSelector, Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import {
    animationFrameScheduler,
    combineLatest,
    distinctUntilChanged,
    fromEvent,
    map,
    Observable,
    of,
    shareReplay,
    skip,
    startWith,
    Subject,
    switchMap,
    take,
    takeWhile,
    tap,
    throttleTime,
    timer,
} from 'rxjs';
import { v4 as uuid } from 'uuid';

import { createPortalToken } from '@common/tokens';
import { ResourceNode } from '@components/layout-grid/layout-grid.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import staticLang from '@language_static';
import {
    CamerasResolution,
    Resolution,
} from '@services/layout-state/store/layouts-resolution/resolution.types';
import { selectLayouts } from '@services/layout-state/store/shared/selectors';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { CrossSystemLayoutSerializer } from '@services/nx-cloud-api/cloud-services/doc-db/doc-db-serializers';
import { DocHandler } from '@services/nx-cloud-api/cloud-services/doc-db/doc-handler';
import { nxConfig } from '@services/nx-config/config';
import { NxParamStateService } from '@services/param-state/param-state.service';
import { Layout, LayoutItem } from '@services/system-api.types/layouts.types';
import { NxSystemService } from '@services/system.service/system.service';
import { SystemResourcesActions, SystemResourcesSelectors } from '@store/system-resources';
import {
    RefreshSystemResources,
    SystemResourcesTypeMap,
} from '@store/system-resources/system-resources.types';
import { ensureLayoutItemResourcePath } from '@utils/ensure-layout-item-resource-path';
import { cleanId, dirtyId } from '@utils/general';
import { hasCrossSystemItems } from '@utils/has-cross-system-items';

import { ActiveLayoutActions } from './store/active-layout';
import { selectActiveLayoutState } from './store/active-layout/active-layout.selectors';
import { CrossSystemLayoutsActions } from './store/cross-system-layouts';
import { LayoutsResolutionActions } from './store/layouts-resolution';
import {
    selectCurrentLayoutCamerasLookup,
    selectCurrentLayoutHighResolution,
} from './store/layouts-resolution/resolution.selectors';
import { SharedLayoutsActions, SharedLayoutsSelectors } from './store/shared';
import {
    LayoutState,
    LayoutTypes,
    UnsavedLayoutState,
    UnsavedState,
} from './store/shared/types/layout-state.types';
import { hashItem } from './store/shared/utils';
import { UnsavedLayoutsActions, UnsavedLayoutsSelectors } from './store/unsaved-layouts';
import { selectUnsavedLayoutsIds } from './store/unsaved-layouts/unsaved-layouts.selectors';
import { incrementUntilUnique } from './store/utils/increment-until-unique';

@Injectable()
export class LayoutStateService {
    static runInInjectionContext: <T>(callback: () => T) => T;

    crossSystemLayoutSerializer = new CrossSystemLayoutSerializer();

    crossSystemLayoutApi: DocHandler<Layout>;

    duplicatedLayouts$$ = signal<string[]>([]);

    // This will be added to an ngrx store as some kind of ephemeral state that will handle any actions where only a single type can be active at a type. Probably action types would be 'renaming', 'adding', 'dialogShown'.
    editedLayout$$ = signal<{ id: string; isNew?: boolean } | null>(null);

    activeLayoutItemsResourceIdAndPath$$ = this.store.selectSignal(
        createSelector(
            selectLayouts,
            selectActiveLayoutState,
            (layouts, activeLayoutId): { resourceId: string; resourcePath: string }[] => {
                const layout = layouts?.find(({ id }) => cleanId(id) === activeLayoutId);

                if (!layout) {
                    return [];
                }
                return (
                    layout.items
                        .map(
                            ensureLayoutItemResourcePath(
                                layout.systemId || this.systemService.currentSystem$$()?.id || '',
                            ),
                        )
                        .map(({ resourcePath, resourceId }) => ({
                            resourcePath,
                            resourceId: cleanId(resourceId),
                        })) || []
                );
            },
        ),
    );

    focusViewToken = uuid();

    contextMenu: TemplateRef<unknown>;

    gridSection: HTMLElement;

    toggleLayoutFullScreen(): void {
        if (document.fullscreenElement === this.gridSection) {
            document.exitFullscreen();
        } else {
            this.gridSection.requestFullscreen({ navigationUI: 'hide' });
        }
    }

    createNewLayout(items?: LayoutItem[]): string;
    createNewLayout(name: string, items?: LayoutItem[]): string;
    createNewLayout(
        nameOrItems: string | LayoutItem[] = staticLang.layouts.newLayout,
        items: LayoutItem[] = [],
        layoutType = LayoutTypes.LOCAL,
    ): string {
        const isName = typeof nameOrItems === 'string';
        const name = isName ? nameOrItems : this.translate.instant(staticLang.layouts.newLayout);
        items = isName ? items : nameOrItems;
        const id = uuid();

        if (hasCrossSystemItems(items, this.systemService.currentSystem$$().id)) {
            layoutType = LayoutTypes.CROSS_SYSTEM;
        }

        this.store
            .select(SharedLayoutsSelectors.selectLayoutsState)
            .pipe(take(1))
            .subscribe(layouts => {
                const currentUser = this.systemService
                    .currentSystem$$()
                    .permissionManager.currentUser$$();
                LayoutStateService.runInInjectionContext(() => {
                    if (layoutType === LayoutTypes.CROSS_SYSTEM) {
                        const existingNames = layouts
                            .filter(({ layoutType }) => layoutType === LayoutTypes.CROSS_SYSTEM)
                            .map(layout => layout.layout.name);
                        this.store.dispatch(
                            UnsavedLayoutsActions.createNewCrossSystemLayout({
                                id,
                                name: incrementUntilUnique(name, existingNames),
                                items,
                            }),
                        );
                    } else {
                        const existingNames = layouts
                            .filter(
                                ({ layout, layoutType }) =>
                                    layoutType === LayoutTypes.LOCAL &&
                                    (!('parentId' in layout) ||
                                        [
                                            currentUser?.id,
                                            '{00000000-0000-0000-0000-000000000000}',
                                        ].includes(layout.parentId)),
                            )
                            .map(layout => layout.layout.name);
                        this.store.dispatch(
                            UnsavedLayoutsActions.createNewLocalLayout({
                                id,
                                name: incrementUntilUnique(name, existingNames),
                                items,
                            }),
                        );
                    }
                });
            });

        return id;
    }

    createNewCrossSystemLayout(items?: LayoutItem[]): string;
    createNewCrossSystemLayout(name: string, items?: LayoutItem[], copy?: boolean): string;
    createNewCrossSystemLayout(
        nameOrItems: string | LayoutItem[] = staticLang.layouts.newLayout,
        items: LayoutItem[] = [],
        copy = false,
    ): string {
        const isName = typeof nameOrItems === 'string';

        const name = isName
            ? copy
                ? this.translate.instant(staticLang.layouts.layoutCopy, { name: nameOrItems })
                : nameOrItems
            : this.translate.instant(staticLang.layouts.newCrossSystemLayout);
        items = isName ? items : nameOrItems;
        const id = uuid();

        this.store
            .select(SharedLayoutsSelectors.selectLayoutsState)
            .pipe(take(1))
            .subscribe(layouts => {
                const existingNames = layouts
                    .filter(({ layout }) => !('parentId' in layout))
                    .map(layout => layout.layout.name);
                LayoutStateService.runInInjectionContext(() =>
                    this.store.dispatch(
                        UnsavedLayoutsActions.createNewCrossSystemLayout({
                            id,
                            name: incrementUntilUnique(name, existingNames),
                            items,
                        }),
                    ),
                );
            });

        return id;
    }

    portal: Portal<unknown> | null;

    createPortal<T, D>(component: ComponentType<T>, data: D): void {
        const DATA_TOKEN = createPortalToken(component, data);
        this.portal = new ComponentPortal(
            component,
            null,
            Injector.create({
                parent: this.injector,
                providers: [{ provide: DATA_TOKEN, useValue: data }],
            }),
        );
    }

    /**
     * Replace with a feature flag if we ever add either a dialog to introduce the cloud layouts feature
     * or if we start adding dialogs to introduce new features since last visit.
     */
    #showCloudLayoutsDialog = false;

    duplicateAsNewLayout(layout: Layout, layoutType = LayoutTypes.LOCAL): string {
        const id = uuid();

        this.duplicatedLayouts$$.update(layouts => [...layouts, id]);

        if (hasCrossSystemItems(layout.items, this.systemService.currentSystem$$().id)) {
            const convertedToCrossSystem = layoutType !== LayoutTypes.CROSS_SYSTEM;
            layoutType = LayoutTypes.CROSS_SYSTEM;
            if (convertedToCrossSystem && this.#showCloudLayoutsDialog) {
                this.dialogsService.cloudLayoutsInfo().then(showAgain => {
                    this.#showCloudLayoutsDialog = showAgain;
                });
            }
        }

        this.store
            .select(SharedLayoutsSelectors.selectLayoutsState)
            .pipe(take(1))
            .subscribe((layouts: LayoutState[]) => {
                if (
                    layoutType === LayoutTypes.LOCAL &&
                    layouts.find(
                        ({ id, layoutType }) =>
                            id === layout.id && layoutType === LayoutTypes.CROSS_SYSTEM,
                    )
                ) {
                    layoutType = LayoutTypes.CROSS_SYSTEM;
                }
                const copyName = this.translate.instant(staticLang.layouts.layoutCopy, layout);
                const existingNames = layouts
                    .filter(layout => layout.layoutType === layoutType)
                    .map(layout => layout.layout.name);
                const name = incrementUntilUnique(copyName, existingNames);
                LayoutStateService.runInInjectionContext(() => {
                    if (layoutType === LayoutTypes.CROSS_SYSTEM) {
                        this.store.dispatch(
                            UnsavedLayoutsActions.createNewCrossSystemLayout({
                                id,
                                name,
                                items: layout.items,
                            }),
                        );
                    } else {
                        this.store.dispatch(
                            UnsavedLayoutsActions.duplicateLayout({
                                id,
                                layout: {
                                    ...layout,
                                    name,
                                    id,
                                },
                            }),
                        );
                    }
                });
            });

        return id;
    }

    async deleteLayout(layoutId: Layout): Promise<void>;
    async deleteLayout(layoutIds: Layout[]): Promise<void>;
    async deleteLayout(_layouts: Layout[] | Layout): Promise<void> {
        const layouts = Array.isArray(_layouts) ? _layouts : [_layouts];
        const confirmDelete =
            layouts.length === 1
                ? staticLang.layouts.deleteLayout
                : staticLang.layouts.deleteLayouts;

        const doDelete = await this.dialogsService.confirm({
            ...confirmDelete,
            message: {
                value: confirmDelete.message,
                params: { layoutName: layouts[0].name, layoutsCount: layouts.length.toString() },
            },
        });

        if (doDelete) {
            const layoutIds = layouts.map(({ id }) => id);
            this.redirectRemovedLayout(
                layoutIds,
                () => this.store.dispatch(SharedLayoutsActions.deleteLayout({ layoutIds })),
                true,
            );
        }
    }

    private redirectRemovedLayout(
        layoutIds: string[],
        callback: () => unknown,
        deleted = false,
    ): void {
        callback();
        this.store
            .select(selectActiveLayoutState)
            .pipe(
                take(1),
                switchMap(async activeLayoutId => {
                    const currentLayout = this.store.selectSignal(
                        SharedLayoutsSelectors.selectCurrentLayoutState,
                    )();
                    if (
                        !currentLayout ||
                        (deleted && cleanId(currentLayout.id) === activeLayoutId)
                    ) {
                        this.activeLayoutHistory = this.activeLayoutHistory.filter(
                            val => !layoutIds.map(dirtyId).includes(dirtyId(activeLayoutId)),
                        );
                        const previous = this.activeLayoutHistory.pop();
                        await this.paramStateHandler.updater({
                            params: {
                                layoutId: cleanId(previous || 'default'),
                            },
                        });
                    }
                }),
            )
            .subscribe();
    }

    discardUnsavedLayout(layoutId: string): void;
    discardUnsavedLayout(layoutIds: string[]): void;
    discardUnsavedLayout(_layoutIds: string[] | string): void {
        const layoutIds = typeof _layoutIds === 'string' ? [_layoutIds] : _layoutIds;
        this.redirectRemovedLayout(layoutIds, () =>
            this.store.dispatch(UnsavedLayoutsActions.remove({ layoutIds })),
        );
    }

    saveLayout(layoutId: string): void;
    saveLayout(layoutIds: string[]): void;
    saveLayout(layoutIds: string[] | string): void {
        if (typeof layoutIds === 'string') {
            layoutIds = [layoutIds];
        }

        this.store.dispatch(SharedLayoutsActions.saveLayout({ layoutIds }));
    }

    shareLayout(layout: Layout): void {
        this.updateLayout({
            ...layout,
            parentId: '{00000000-0000-0000-0000-000000000000}',
        });
    }

    unlockLayout(layout: Layout): void {
        this.updateLayout({
            ...layout,
            locked: false,
        });

        this.saveLayout(layout.id);
    }

    lockLayout(layout: Layout): void {
        this.updateLayout({
            ...layout,
            locked: true,
        });

        this.saveLayout(layout.id);
    }

    setLayoutResolution({
        layoutId,
        resolution,
    }: {
        layoutId: string;
        resolution: Resolution;
    }): void {
        this.store.dispatch(
            LayoutsResolutionActions.updateLayoutResolution({
                resolution,
                layoutId,
            }),
        );
    }

    setCameraResolution({
        cameraId,
        layoutId,
        resolution,
    }: {
        cameraId: string;
        layoutId: string;
        resolution: Resolution;
    }): void {
        this.store.dispatch(
            LayoutsResolutionActions.updateCameraResolution({
                resolution,
                layoutId,
                cameraId,
            }),
        );
    }

    updateLayout(layout: Layout): void;
    updateLayout(layouts: Layout[]): void;
    updateLayout(layouts: Layout | Layout[]): void {
        this.store
            .select(SharedLayoutsSelectors.selectLayoutsBaseVersion)
            .pipe(take(1))
            .subscribe(layoutBaseHashes => {
                const updatedLayouts = Array.isArray(layouts) ? layouts : [layouts];

                this.store.dispatch(
                    UnsavedLayoutsActions.update({
                        layouts: updatedLayouts.map(layout => ({
                            id: layout.id,
                            layoutType: layout.parentId
                                ? LayoutTypes.LOCAL
                                : LayoutTypes.CROSS_SYSTEM,
                            unsaved: UnsavedState.UNSAVED,
                            layout,
                            baseVersion: layoutBaseHashes[layout.id] || hashItem(layout),
                        })),
                    }),
                );
            });
    }

    public changeLayout(node: ResourceNode): void {
        const id = node?.details?.id;

        if (!id) {
            return;
        }

        this.store.dispatch(ActiveLayoutActions.set({ id }));
    }

    public loadUnsavedLayouts(systemId: string): Observable<UnsavedLayoutState[]> {
        const unsavedCrossSystemLayouts = this.store
            .selectSignal(UnsavedLayoutsSelectors.selectUnsavedLayoutsState)()
            .filter(({ layoutType }) => layoutType === LayoutTypes.CROSS_SYSTEM);
        const unsavedLayouts$ = nxConfig.featureFlags.layoutsUnsavedSync
            ? this.cloudApi.docDbApi.unsavedLayouts.getDocHandler(systemId).list()
            : of(unsavedCrossSystemLayouts);
        return unsavedLayouts$.pipe(
            tap(unsavedLayouts =>
                this.store.dispatch(UnsavedLayoutsActions.set({ unsavedLayouts })),
            ),
        );
    }

    public loadCrossSystemLayouts(): Observable<Layout[]> {
        const crossSystemLayouts$ = nxConfig.featureFlags.layoutsCrossSystem
            ? this.crossSystemLayoutApi
                  .list()
                  .pipe(map(layouts => this.crossSystemLayoutSerializer.deserializeMany(layouts)))
            : of([] as Layout[]);
        return crossSystemLayouts$.pipe(
            tap(layouts => {
                this.store.dispatch(
                    CrossSystemLayoutsActions.set({
                        layouts,
                    }),
                );
            }),
        );
    }

    unsavedLayoutsIds$$ = toSignal(this.store.select(selectUnsavedLayoutsIds), {
        initialValue: {},
    });

    showResolutionRibbon$ = new Subject<number>();

    resolutionRibbonCountdown$ = this.showResolutionRibbon$.pipe(
        switchMap(showTime =>
            timer(0, 1000).pipe(
                map(time => showTime - time),
                takeWhile(time => time >= 0),
            ),
        ),
        shareReplay({ bufferSize: 1, refCount: false }),
    );

    resolutionRibbonShown$$ = toSignal(
        this.store.select(selectCurrentLayoutHighResolution).pipe(
            switchMap(resolutionHigh => {
                // Using large number instead of changing to boolean in case we ever add back auto dismiss.
                this.showResolutionRibbon$.next(resolutionHigh ? Number.MAX_SAFE_INTEGER : 0);
                return this.resolutionRibbonCountdown$;
            }),
        ),
        { initialValue: 0 },
    );

    cameraResolutionLookup$$ = toSignal(this.store.select(selectCurrentLayoutCamerasLookup), {
        initialValue: {} as CamerasResolution,
    });

    paramStateHandler = this.paramStateService.getStateHandler(({ params, queryParams }) => ({
        params: {
            layoutId: params.layoutId,
            systemId: params.systemId,
        },
        queryParams: {
            openNodes: queryParams.openNodes,
            search: queryParams.search,
            otherSitesFilter: queryParams.otherSitesFilter,
            otherSitesMenuOpen: queryParams.otherSitesMenuOpen,
        },
    }));

    menuResizePixelUpdater$ = new Subject<number>();

    windowState$ = fromEvent(window, 'resize').pipe(
        startWith(true),
        map(() => window.innerWidth),
        distinctUntilChanged(),
        shareReplay({ bufferSize: 1, refCount: true }),
    );

    menuResizePercentage$ = combineLatest([this.menuResizePixelUpdater$, this.windowState$]).pipe(
        map(
            ([resizePixels, innerWidth]) =>
                (Math.max(resizePixels, Math.min(innerWidth / 2, 216)) / innerWidth) * 100,
        ),
        map((percentage: number): number => Math.min(percentage, 50)),
        map(vw => `${vw}vw`),
        distinctUntilChanged(),
        throttleTime(0, animationFrameScheduler),
        shareReplay({ bufferSize: 1, refCount: false }),
    );

    activeLayoutHistory: string[] = [];

    loadSite(
        siteId: string,
        refreshSystemResources: RefreshSystemResources = { cameras: true, servers: true },
    ): Observable<SystemResourcesTypeMap> {
        this.store.dispatch(
            SystemResourcesActions.refreshSystemResources({
                systems: {
                    [siteId]: refreshSystemResources,
                },
            }),
        );
        return this.store
            .select(SystemResourcesSelectors.selectResourcesValuesBySystemId(siteId))
            .pipe(skip(1));
    }

    constructor(
        private cloudApi: NxCloudApiService,
        private injector: Injector,
        private store: Store,
        private translate: TranslateService,
        private paramStateService: NxParamStateService,
        private systemService: NxSystemService,
        private dialogsService: NxDialogsService,
    ) {
        this.crossSystemLayoutApi = this.cloudApi.docDbApi.crossSystemLayout;
        LayoutStateService.runInInjectionContext = callback =>
            runInInjectionContext(this.injector, callback);
        // eslint-disable-next-line ngrx/no-store-subscription
        this.store.pipe(takeUntilDestroyed()).subscribe(state => {
            console.info('currentState', state);
        });

        const activeLayoutId$$ = this.store.selectSignal(selectActiveLayoutState);

        effect(() => {
            const activeLayoutId = activeLayoutId$$();
            if (activeLayoutId && activeLayoutId !== 'default') {
                this.activeLayoutHistory.push(activeLayoutId);
            }
        });
    }
}
