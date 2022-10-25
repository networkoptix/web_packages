import { createSelector, createFeatureSelector } from '@ngrx/store';

import type { AccountState } from './account.state';

const selectAccountState = createFeatureSelector<AccountState>('account');

export const selectCurrentUser = createSelector(
    selectAccountState,
    state => state.currentUser
);
