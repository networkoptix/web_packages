import { createReducer, on } from '@ngrx/store';

import { onSyncState } from '@store/sync.utils';

import * as ActiveLayoutActions from './active-layout.actions';

export const initialState: string = null;

export const reducer = createReducer(
    initialState,
    on(ActiveLayoutActions.set, (_state, { id }): string => id),
    on(ActiveLayoutActions.clear, (_state): string => null),
    onSyncState<string>(),
);
