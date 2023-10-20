import { ComponentPortal, ComponentType, Portal } from '@angular/cdk/portal';
import { Injectable, Injector, runInInjectionContext } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { Observable, of, switchMap, take, tap } from 'rxjs';
import { v4 as uuid } from 'uuid';

import { createPortalToken } from '@common/tokens';
import { ResourceNode } from '@components/layout-grid/layout-grid.types';
import staticLang from '@language_static';
import { NxAccountService } from '@services/account.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { nxConfig } from '@services/nx-config/config';
import { NxParamStateService } from '@services/param-state/param-state.service';
import { LayoutItem, Layout } from '@services/system-api.types';
import { NxSystemService } from '@services/system.service/system.service';
import { dirtyId } from '@utils/general';

import { ActiveLayoutActions } from './store/active-layout';
import { selectActiveLayoutState } from './store/active-layout/active-layout.selectors';
import { LocalLayoutsSelectors } from './store/local-layouts';
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
            .select(SharedLayoutsSelectors.selectLayouts)
            .pipe(take(1))
            .subscribe(layouts => {
                const currentUser = this.systemService
                    .currentSystem$$()
                    .permissionManager.currentUser();
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

    portal: Portal<unknown>;

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

        this.store
            .select(SharedLayoutsSelectors.selectLayouts)
            .pipe(take(1))
            .subscribe((layouts: LayoutState[]) => {
                const copyName = `${layout.name} ${this.translate.instant(
                    staticLang.layouts.layoutCopy,
                )}`;
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
                    const unsavedState = this.unsavedLayoutsIds$$()[dirtyLayoutId];
                    if (
                        layoutIds.includes(dirtyLayoutId) &&
                        (deleted || unsavedState === staticLang.layouts.unsavedStates.unsaved)
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
                this.systemService.getCurrentSystem().permissionManager.currentUser().id,
        });
    }

    unlockLayout(layout: Layout): void {
        this.updateLayout({
            ...layout,
            locked: false,
        });
    }

    lockLayout(layout: Layout): void {
        this.updateLayout({
            ...layout,
            locked: true,
        });
    }

    updateLayout(layout: Layout): void;
    updateLayout(layouts: Layout[]): void;
    updateLayout(layouts: Layout | Layout[]): void {
        this.store
            .select(LocalLayoutsSelectors.selectLocalLayoutsBaseVersion)
            .pipe(take(1))
            .subscribe(layoutBaseHashes => {
                const updatedLayouts = Array.isArray(layouts) ? layouts : [layouts];

                this.store.dispatch(
                    UnsavedLayoutsActions.update({
                        layouts: updatedLayouts.map(layout => ({
                            id: layout.id,
                            layoutType: LayoutTypes.LOCAL,
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

    unsavedLayoutsIds$$ = toSignal(this.store.select(selectUnsavedLayoutsIds));

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

    constructor(
        private cloudApi: NxCloudApiService,
        private injector: Injector,
        private store: Store,
        private translate: TranslateService,
        private paramStateService: NxParamStateService,
        private accountService: NxAccountService,
        private systemService: NxSystemService,
    ) {
        LayoutStateService.runInInjectionContext = callback =>
            runInInjectionContext(this.injector, callback);
        // eslint-disable-next-line ngrx/no-store-subscription
        this.store.subscribe(state => {
            console.info('currentState', state);
        });
    }
}
