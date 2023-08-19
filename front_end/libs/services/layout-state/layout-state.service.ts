import { Injectable, Injector, runInInjectionContext } from '@angular/core';
import { Store } from '@ngrx/store';
import { take } from 'rxjs';

import staticLang from '@common/language/language_i18n_static.json';
import { LayoutItem } from '@services/system-api.types';

import { SharedSelectors } from './store/shared';
import { UnsavedLayoutsActions } from './store/unsaved-layouts';
import { incrementUntilUnique } from './store/utils/increment-until-unique';

@Injectable()
export class LayoutStateService {
    createNewLocalLayout(
        name: string = staticLang.layouts.newLayout,
        items: LayoutItem[] = [],
    ): void {
        this.store
            .select(SharedSelectors.selectLayouts)
            .pipe(take(1))
            .subscribe(layouts => {
                const existingNames = layouts.map(layout => layout.layout.name);
                runInInjectionContext(this.injector, () =>
                    this.store.dispatch(
                        UnsavedLayoutsActions.createNewLocalLayout({
                            name: incrementUntilUnique(name, existingNames),
                            items,
                        }),
                    ),
                );
            });
    }
    constructor(private store: Store, private injector: Injector) {
        // eslint-disable-next-line ngrx/no-store-subscription
        this.store.subscribe(state => {
            console.info('currentState', state);
        });
    }
}
