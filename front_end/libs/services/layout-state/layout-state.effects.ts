import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { distinctUntilChanged, filter, map, switchMap, take } from 'rxjs';

import { dirtyId } from '@utils/general';

import { ActiveLayoutActions } from './store/active-layout';
import { selectLayouts } from './store/shared/selectors';
import { UnsavedLayoutsActions } from './store/unsaved-layouts';

@Injectable()
export class LayoutStateEffects {
    autoSelectNewLayout$ = createEffect(() => {
        return this.actions.pipe(
            ofType(UnsavedLayoutsActions.createNewLocalLayout),
            map(({ id }) => id),
            distinctUntilChanged(),
            switchMap(createdLayoutId => {
                return this.store.select(selectLayouts).pipe(
                    filter(layouts => layouts.some(({ id }) => id === dirtyId(createdLayoutId))),
                    map(() => createdLayoutId),
                    map(id => ActiveLayoutActions.set({ id })),
                    take(1),
                );
            }),
        );
    });

    constructor(private store: Store, private actions: Actions) {}
}
