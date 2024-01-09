import { createSelector, createFeatureSelector } from '@ngrx/store';

import type { AccountState } from './account.state';

const selectAccountState = createFeatureSelector<AccountState>('account');

export const selectCurrentUser = createSelector(selectAccountState, state => state.currentUser);
export const selectCurrentUserName = createSelector(selectAccountState, state => {
    const { email, name, isCloud } = state?.currentUser || {};
    if (isCloud && email) {
        return email;
    }
    return name || '';
});

export const selectIsAuthenticated = createSelector(
    selectAccountState,
    state => !!state.currentUser?.is_authenticated,
);
