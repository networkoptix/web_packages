import type { Account } from '@services/account.service/account';

export interface AccountState {
    currentUser: Account;
}
