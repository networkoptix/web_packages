/* eslint-disable nx/ban-global-variables */
import { ComponentPortal, ComponentType, Portal } from '@angular/cdk/portal';
import { Injectable, Injector, TemplateRef, runInInjectionContext, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import {
    Observable,
    Subject,
    animationFrameScheduler,
    combineLatest,
    distinctUntilChanged,
    firstValueFrom,
    fromEvent,
    map,
    of,
    shareReplay,
    startWith,
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
import staticLang from '@language_static';
import { NxAccountService } from '@services/account.service';
import {
    CamerasResolution,
    Resolution,
} from '@services/layout-state/store/layouts-resolution/resolution.types';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { CrossSystemLayoutSerializer } from '@services/nx-cloud-api/cloud-services/doc-db/doc-db-serializers';
import { DocHandler } from '@services/nx-cloud-api/cloud-services/doc-db/doc-handler';
import { nxConfig } from '@services/nx-config/config';
import { NxParamStateService } from '@services/param-state/param-state.service';
import { LayoutItem, Layout } from '@services/system-api.types/layouts.types';
import { NxSystemService } from '@services/system.service/system.service';
import { dirtyId } from '@utils/general';

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
import { UnsavedLayoutsActions } from './store/unsaved-layouts';
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

    createNewLocalLayout(items?: LayoutItem[]): string;
    createNewLocalLayout(name: string, items?: LayoutItem[]): string;
    createNewLocalLayout(
        nameOrItems: string | LayoutItem[] = staticLang.layouts.newLayout,
        items: LayoutItem[] = [],
    ): string {
        const isName = typeof nameOrItems === 'string';
        const name = isName ? nameOrItems : this.translate.instant(staticLang.layouts.newLayout);
        items = isName ? items : nameOrItems;
        const id = uuid();

        this.store
            .select(SharedLayoutsSelectors.selectLayoutsState)
            .pipe(take(1))
            .subscribe(layouts => {
                const currentUser = this.systemService
                    .currentSystem$$()
                    .permissionManager.currentUser$$();
                const existingNames = layouts
                    .filter(
                        ({ layout }) =>
                            !('parentId' in layout) ||
                            [currentUser?.id, '{00000000-0000-0000-0000-000000000000}'].includes(
                                layout.parentId,
                            ),
                    )
                    .map(layout => layout.layout.name);
                LayoutStateService.runInInjectionContext(() =>
                    this.store.dispatch(
                        UnsavedLayoutsActions.createNewLocalLayout({
                            id,
                            name: incrementUntilUnique(name, existingNames),
                            items,
                        }),
                    ),
                );
            });

        return id;
    }

    createNewCrossSystemLayout(items?: LayoutItem[]): string;
    createNewCrossSystemLayout(name: string, items?: LayoutItem[]): string;
    createNewCrossSystemLayout(
        nameOrItems: string | LayoutItem[] = staticLang.layouts.newLayout,
        items: LayoutItem[] = [],
    ): string {
        const isName = typeof nameOrItems === 'string';
        const name = isName
            ? nameOrItems
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

    duplicateLayoutAsNewLocalLayout(layout: Layout): string {
        const id = uuid();

        this.duplicatedLayouts$$.update(layouts => [...layouts, id]);

        this.store
            .select(SharedLayoutsSelectors.selectLayoutsState)
            .pipe(take(1))
            .subscribe((layouts: LayoutState[]) => {
                const copyName = this.translate.instant(staticLang.layouts.layoutCopy, layout);
                const existingNames = layouts.map(layout => layout.layout.name);
                LayoutStateService.runInInjectionContext(() =>
                    this.store.dispatch(
                        UnsavedLayoutsActions.duplicateLayout({
                            id,
                            layout: {
                                ...layout,
                                name: incrementUntilUnique(copyName, existingNames),
                                id,
                            },
                        }),
                    ),
                );
            });

        return id;
    }

    deleteLayout(layoutId: string): void;
    deleteLayout(layoutIds: string[]): void;
    deleteLayout(_layoutIds: string[] | string): void {
        const layoutIds = typeof _layoutIds === 'string' ? [_layoutIds] : _layoutIds;
        this.redirectRemovedLayout(
            layoutIds,
            () => this.store.dispatch(SharedLayoutsActions.deleteLayout({ layoutIds })),
            true,
        );
    }

    private redirectRemovedLayout(
        layoutIds: string[],
        callback: () => unknown,
        deleted = false,
    ): void {
        if (deleted) {
            callback();
        }
        this.store
            .select(selectActiveLayoutState)
            .pipe(
                take(1),
                switchMap(async activeLayoutId => {
                    const dirtyLayoutId = dirtyId(activeLayoutId);
                    const savedLayouts = await firstValueFrom(
                        this.store.select(SharedLayoutsSelectors.selectLayoutsState),
                    );
                    if (
                        layoutIds.includes(dirtyLayoutId) &&
                        (deleted || !savedLayouts.find(({ id }) => id === dirtyLayoutId))
                    ) {
                        await this.paramStateHandler.updater({
                            params: {
                                layoutId: 'default',
                            },
                        });
                    }
                }),
            )
            .subscribe(() => !deleted && callback());
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

    unshareLayout(layout: Layout): void {
        this.updateLayout({
            ...layout,
            parentId:
                this.accountService.account.id ||
                this.systemService.getCurrentSystem().permissionManager.currentUser$$().id,
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
        const unsavedLayouts$ = nxConfig.featureFlags.layoutsUnsavedSync
            ? this.cloudApi.docDbApi.unsavedLayouts.getDocHandler(systemId).list()
            : of([] as UnsavedLayoutState[]);
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

    constructor(
        private cloudApi: NxCloudApiService,
        private injector: Injector,
        private store: Store,
        private translate: TranslateService,
        private paramStateService: NxParamStateService,
        private accountService: NxAccountService,
        private systemService: NxSystemService,
    ) {
        this.crossSystemLayoutApi = this.cloudApi.docDbApi.crossSystemLayout;
        LayoutStateService.runInInjectionContext = callback =>
            runInInjectionContext(this.injector, callback);
        // eslint-disable-next-line ngrx/no-store-subscription
        this.store.subscribe(state => {
            console.info('currentState', state);
        });
    }
}
