import { createReducer, on } from '@ngrx/store';

import { Layouts } from '@services/system-api.types';
import { onSyncState } from '@store/sync.utils';

import * as LocalLayoutActions from './local-layouts.actions';

export const initialState: Layouts = [];

export const reducer = createReducer(
    initialState,
    on(LocalLayoutActions.set, (_state, { layouts }): Layouts => layouts),
    on(LocalLayoutActions.clear, (_state): Layouts => []),
    on(LocalLayoutActions.add, (state, { layouts }): Layouts => [...state, ...layouts]),
    on(
        LocalLayoutActions.remove,
        (state, { layouts }): Layouts =>
            state.filter(({ id }) => !layouts.map(({ id }) => id).includes(id)),
    ),
    on(
        LocalLayoutActions.update,
        (state, { layouts }): Layouts =>
            state.map(layout => ({ ...layout, ...layouts.find(({ id }) => id === layout.id) })),
    ),
    onSyncState<Layouts>(),
);
