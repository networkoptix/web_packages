import { createReducer, on } from '@ngrx/store';

import * as SystemsActions from './systems.actions';

export const initialState = [];

const _systemsReducer = createReducer(
    initialState,
    on(SystemsActions.set, (state, { systems }) => systems),
    on(SystemsActions.clear, state => []),
);

export function systemsReducer(state, action) {
    return _systemsReducer(state, action);
}
