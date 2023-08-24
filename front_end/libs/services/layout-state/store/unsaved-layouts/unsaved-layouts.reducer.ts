import { inject } from '@angular/core';
import { createReducer, on } from '@ngrx/store';

import { LayoutStateService } from '@services/layout-state/layout-state.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { onSyncState } from '@store/sync.utils';

import { SharedLayoutsActions } from '../shared';
import { UnsavedLayoutState, UnsavedState } from '../shared/types/layout-state.types';
import { createNewUnsavedLocalLayout } from '../utils/create-new-local-layout';

import * as UnsavedLayoutActions from './unsaved-layouts.actions';

export const initialState: UnsavedLayoutState[] = [];

type UnsavedLayoutsDocHandlerMethods = Pick<
    ReturnType<NxCloudApiService['docDbApi']['unsavedLayouts']['getDocHandler']>,
    'save' | 'delete' | 'list'
>;

const syncUnsavedLayoutState = (
    layouts: UnsavedLayoutState[],
    action: keyof UnsavedLayoutsDocHandlerMethods,
): UnsavedLayoutState[] => {
    LayoutStateService.runInInjectionContext(() => {
        const { docDbApi } = inject(NxCloudApiService);
        layouts.forEach(layout => {
            if ('systemId' in layout.layout) {
                docDbApi.unsavedLayouts
                    .getDocHandler(layout.layout.systemId)
                    [action](layout)
                    .subscribe();
            }
        });
    });
    return layouts;
};

export const reducer = createReducer(
    initialState,
    on(UnsavedLayoutActions.set, (state, { unsavedLayouts }): UnsavedLayoutState[] =>
        unsavedLayouts.map(layout => {
            const unsavedLayout = state.find(({ id }) => id === layout.id);

            if (unsavedLayout?.unsaved === UnsavedState.PENDING) {
                return unsavedLayout;
            }

            return layout;
        }),
    ),
    on(UnsavedLayoutActions.clear, (_state): UnsavedLayoutState[] => []),
    on(
        UnsavedLayoutActions.createNewLocalLayout,
        (state, { id, name, items }): UnsavedLayoutState[] => [
            ...state,
            syncUnsavedLayoutState([createNewUnsavedLocalLayout(id, name, items)], 'save').pop(),
        ],
    ),
    on(
        UnsavedLayoutActions.remove,
        SharedLayoutsActions.deleteLayout,
        (state, { layoutIds }): UnsavedLayoutState[] => {
            const { removedLayouts, remainingLayouts } = state.reduce(
                (acc, layout) => {
                    if (layoutIds.includes(layout.id)) {
                        acc.removedLayouts.push(layout);
                    } else {
                        acc.remainingLayouts.push(layout);
                    }
                    return acc;
                },
                {
                    removedLayouts: [],
                    remainingLayouts: [],
                } as Record<'removedLayouts' | 'remainingLayouts', UnsavedLayoutState[]>,
            );
            syncUnsavedLayoutState(removedLayouts, 'delete');
            return remainingLayouts;
        },
    ),
    on(UnsavedLayoutActions.update, (state, { layouts }): UnsavedLayoutState[] => [
        ...layouts.filter(({ id }) => !state.find(layout => layout.id === id)),
        ...syncUnsavedLayoutState(
            state.map(layout => layouts.find(({ id }) => id === layout.id) || layout),
            'save',
        ),
    ]),
    on(SharedLayoutsActions.saveLayout, (state, { layoutIds }): UnsavedLayoutState[] =>
        state.map(layout =>
            layoutIds.includes(layout.id) ? { ...layout, unsaved: UnsavedState.PENDING } : layout,
        ),
    ),
    onSyncState<UnsavedLayoutState[]>(),
);
