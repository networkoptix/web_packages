import { createReducer, on } from '@ngrx/store';

import { Layouts } from '@services/system-api.types';
import { onSyncState } from '@store/sync.utils';

import { SharedLayoutsActions } from '../shared';

import * as LocalLayoutActions from './local-layouts.actions';

export const initialState: Layouts = [];

export const reducer = createReducer(
    initialState,
    on(LocalLayoutActions.set, (_state, { layouts }): Layouts => layouts),
    on(LocalLayoutActions.clear, (_state): Layouts => []),
    on(LocalLayoutActions.add, (state, { layouts }): Layouts => [...state, ...layouts]),
    on(
        LocalLayoutActions.remove,
        SharedLayoutsActions.deleteLayout,
        (state, { layoutIds }): Layouts => state.filter(({ id }) => !layoutIds.includes(id)),
    ),
    on(
        LocalLayoutActions.update,
        (state, { layouts }): Layouts => [
            ...state.map(layout => ({
                ...layout,
                ...(layouts.find(({ id }) => id === layout.id) || layout),
            })),
            ...layouts.filter(({ id }) => !state.find(layout => layout.id === id)),
        ],
    ),
    onSyncState<Layouts>(),
);
