import { createAction, props } from '@ngrx/store';

import type { Account } from '@services/account.service/account';

import type { AccountState } from './account.state';

export const setCurrentUser = createAction(
    '[Account] Set Current User',
    props<{ currentUser: Account }>()
);

export const updateCurrentUser = createAction(
    '[Account] Update Current User',
    props<{ update: Partial<Account> }>()
);

export const setParam = createAction(
    '[Account] Set Param',
    props<{ key: keyof AccountState['params'], value: string }>()
);

export const setParams = createAction(
    '[Account] Set Params',
    props<{ params: AccountState['params'] }>()
);
