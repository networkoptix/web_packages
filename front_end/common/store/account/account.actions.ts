import { createAction, props } from '@ngrx/store';

import type { Account } from '@services/account.service/account';

export const setCurrentUser = createAction(
    '[Account] Set Current User',
    props<{ currentUser: Account | undefined }>(),
);

export const updateCurrentUser = createAction(
    '[Account] Update Current User',
    props<{ update: Partial<Account> }>(),
);
