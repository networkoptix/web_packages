import { Injectable, Injector, runInInjectionContext } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { take } from 'rxjs';
import { v4 as uuid } from 'uuid';

import staticLang from '@common/language/language_i18n_static.json';
import { ResourceNode } from '@components/layout-grid/layout-grid.types';
import { LayoutItem, Layout } from '@services/system-api.types';

import { ActiveLayoutActions } from './store/active-layout';
import { SharedLayoutsActions, SharedLayoutsSelectors } from './store/shared';
import { LayoutTypes, UnsavedState } from './store/shared/types/layout-state.types';
import { UnsavedLayoutsActions } from './store/unsaved-layouts';
import { selectUnsavedLayoutsIds } from './store/unsaved-layouts/unsaved-layouts.selectors';
import { incrementUntilUnique } from './store/utils/increment-until-unique';

@Injectable()
export class LayoutStateService {
    createNewLocalLayout(items?: LayoutItem[]): string;
    createNewLocalLayout(name: string, items?: LayoutItem[]): string;
    createNewLocalLayout(
        nameOrItems: string | LayoutItem[] = staticLang.layouts.newLayout,
        items: LayoutItem[] = [],
    ): string {
        const isName = typeof nameOrItems === 'string';
        const name = isName ? nameOrItems : staticLang.layouts.newLayout;
        items = isName ? items : nameOrItems;
        const id = uuid();

        this.store
            .select(SharedLayoutsSelectors.selectLayouts)
            .pipe(take(1))
            .subscribe(layouts => {
                const existingNames = layouts.map(layout => layout.layout.name);
                runInInjectionContext(this.injector, () =>
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

    deleteLayout(layoutId: string): void;
    deleteLayout(layoutIds: string[]): void;
    deleteLayout(layoutIds: string[] | string): void {
        if (typeof layoutIds === 'string') {
            layoutIds = [layoutIds];
        }

        this.store.dispatch(SharedLayoutsActions.deleteLayout({ layoutIds }));
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

    unsavedLayoutsIds$$ = toSignal(this.store.select(selectUnsavedLayoutsIds));

    constructor(private store: Store, private injector: Injector) {
        // eslint-disable-next-line ngrx/no-store-subscription
        this.store.subscribe(state => {
            console.info('currentState', state);
        });
    }
}
