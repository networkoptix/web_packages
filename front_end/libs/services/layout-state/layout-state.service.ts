import { Injectable, Injector, runInInjectionContext } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { Observable, take, tap } from 'rxjs';
import { v4 as uuid } from 'uuid';

import { ResourceNode } from '@components/layout-grid/layout-grid.types';
import staticLang from '@language_static';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { NxParamStateService } from '@services/param-state/param-state.service';
import { LayoutItem, Layout } from '@services/system-api.types';

import { ActiveLayoutActions } from './store/active-layout';
import { SharedLayoutsActions, SharedLayoutsSelectors } from './store/shared';
import {
    LayoutState,
    LayoutTypes,
    UnsavedLayoutState,
    UnsavedState,
} from './store/shared/types/layout-state.types';
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
                const existingNames = layouts.map(layout => layout.layout.name);
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
    deleteLayout(layoutIds: string[] | string): void {
        if (typeof layoutIds === 'string') {
            layoutIds = [layoutIds];
        }

        this.store.dispatch(SharedLayoutsActions.deleteLayout({ layoutIds }));
    }

    discardUnsavedLayout(layoutId: string): void;
    discardUnsavedLayout(layoutIds: string[]): void;
    discardUnsavedLayout(layoutIds: string[] | string): void {
        if (typeof layoutIds === 'string') {
            layoutIds = [layoutIds];
        }

        this.store.dispatch(UnsavedLayoutsActions.remove({ layoutIds }));
    }

    saveLayout(layoutId: string): void;
    saveLayout(layoutIds: string[]): void;
    saveLayout(layoutIds: string[] | string): void {
        if (typeof layoutIds === 'string') {
            layoutIds = [layoutIds];
        }

        this.store.dispatch(SharedLayoutsActions.saveLayout({ layoutIds }));
    }

    updateLayout(layout: Layout): void;
    updateLayout(layouts: Layout[]): void;
    updateLayout(layouts: Layout | Layout[]): void {
        if (!Array.isArray(layouts)) {
            layouts = [layouts];
        }
        this.store.dispatch(
            UnsavedLayoutsActions.update({
                layouts: layouts.map(layout => ({
                    id: layout.id,
                    layoutType: LayoutTypes.LOCAL,
                    unsaved: UnsavedState.UNSAVED,
                    layout,
                })),
            }),
        );
    }

    public changeLayout(node: ResourceNode): void {
        const id = node?.details?.id;

        if (!id) {
            return;
        }

        this.store.dispatch(ActiveLayoutActions.set({ id }));
    }

    public loadUnsavedLayouts(systemId: string): Observable<UnsavedLayoutState[]> {
        return this.cloudApi.docDbApi.unsavedLayouts
            .getDocHandler(systemId)
            .list()
            .pipe(
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
    ) {
        LayoutStateService.runInInjectionContext = callback =>
            runInInjectionContext(this.injector, callback);
        // eslint-disable-next-line ngrx/no-store-subscription
        this.store.subscribe(state => {
            console.info('currentState', state);
        });
    }
}
