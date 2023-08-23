import { createReducer, on } from '@ngrx/store';

import { onSyncState } from '@store/sync.utils';

import { SharedLayoutsActions } from '../shared';
import { UnsavedLayoutState } from '../shared/types/layout-state.types';
import { createNewUnsavedLocalLayout } from '../utils/create-new-local-layout';

import * as UnsavedLayoutActions from './unsaved-layouts.actions';

export const initialState: UnsavedLayoutState[] = [];

export const reducer = createReducer(
    initialState,
    on(
        UnsavedLayoutActions.set,
        (_state, { unsavedLayouts }): UnsavedLayoutState[] => unsavedLayouts,
    ),
    on(UnsavedLayoutActions.clear, (_state): UnsavedLayoutState[] => []),
    on(
        UnsavedLayoutActions.createNewLocalLayout,
        (state, { id, name, items }): UnsavedLayoutState[] => [
            ...state,
            createNewUnsavedLocalLayout(id, name, items),
        ],
    ),
    on(
        UnsavedLayoutActions.remove,
        SharedLayoutsActions.deleteLayout,
        (state, { layoutIds }): UnsavedLayoutState[] =>
            state.filter(({ layout: { id } }) => !layoutIds.includes(id)),
    ),
    on(UnsavedLayoutActions.update, (state, { layouts }): UnsavedLayoutState[] => [
        ...state.map(layout => layouts.find(({ id }) => id === layout.id) || layout),
        ...layouts.filter(({ id }) => !state.find(layout => layout.id === id)),
    ]),
    onSyncState<UnsavedLayoutState[]>(),
);
