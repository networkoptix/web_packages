import { createReducer, on } from '@ngrx/store';

import { Layouts } from '@services/system-api.types';
import { onSyncState } from '@store/sync.utils';

import * as CrossSystemLayoutActions from './cross-system-layouts.actions';

export const initialState: Layouts = [];

export const reducer = createReducer(
    initialState,
    on(CrossSystemLayoutActions.set, (_state, { layouts }): Layouts => layouts || []),
    on(CrossSystemLayoutActions.clear, (_state): Layouts => []),
    on(CrossSystemLayoutActions.add, (state, { layouts }): Layouts => [...state, ...layouts]),
    on(
        CrossSystemLayoutActions.remove,
        (state, { layoutIds }): Layouts => state.filter(({ id }) => !layoutIds.includes(id)),
    ),
    on(
        CrossSystemLayoutActions.update,
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
