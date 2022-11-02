import { createReducer, on } from '@ngrx/store';

import * as accountActions from './account.actions';
import type { AccountState } from './account.state';

const initialState: AccountState = {
    currentUser: undefined,
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
);
