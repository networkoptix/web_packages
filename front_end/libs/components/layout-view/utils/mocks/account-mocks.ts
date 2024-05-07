import { v4 as uuid } from 'uuid';

import { Account } from '@services/account.service/account';
import { UserType } from '@services/system-user.types';

export const generateAccount = (accountPartial: Partial<Account> = {}): Account => ({
    email: uuid(),
    first_name: uuid(),
    name: uuid(),
    id: uuid(),
    last_name: uuid(),
    language: uuid(),
    is_staff: true,
    is_superuser: true,
    isCloud: true,
    permissions: [],
    can_publish_integration: true,
    is_authenticated: true,
    sessionVerified: true,
    accessToken: uuid(),
    type: UserType.cloud,
    account2faEnabled: true,
    totpExistsForAccount: true,
    ...accountPartial,
});
