import { createReducer, on } from '@ngrx/store';

import * as accountActions from './account.actions';
import type { AccountState } from './account.state';

const initialState: AccountState = {
    currentUser: undefined,
    params: {
        code: undefined,
        auth: undefined,
        refreshToken: undefined
    }
};

export const accountReducer = createReducer(
    initialState,
    on(
        accountActions.setCurrentUser,
        (state, { currentUser }): AccountState => ({ ...state, currentUser })
    ),
    on(
        accountActions.updateCurrentUser,
        (state, { update }): AccountState => ({
            ...state,
            currentUser: { ...state.currentUser, ...update }
        })
    ),
    on(
        accountActions.setParam,
        (state, { key, value }): AccountState => ({
            ...state,
            params: { ...state.params, [key]: value }
        })
    ),
    on(
        accountActions.setParams,
        (state, { params }): AccountState => ({ ...state, params })
    ),
);
