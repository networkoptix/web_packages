import { last } from 'lodash-es';

import { environment } from '@environments/environment';
import { RestV3User, UserType } from '@services/system-user.types';

export interface CloudAccount {
    email: string;
    first_name: string;
    name: string;
    id: string;
    last_name: string;
    language: string;
    is_staff: boolean;
    is_superuser: boolean;
    isCloud: boolean;
    permissions: string[];
    can_publish_integration: boolean;
    is_authenticated: boolean;
    cookie_reviewed: boolean;
    sessionVerified: boolean;
    accessToken: string;
    type: UserType;
}

export interface Account extends CloudAccount {
    account2faEnabled: boolean;
    totpExistsForAccount: boolean;
}

export function newLocalAccount(user: RestV3User): Account {
    const { email, fullName, id, permissions, name, type } = user;
    const [first, ...rest] = (fullName || name || '').split(' ');
    return {
        email,
        id,
        name,
        first_name: first,
        last_name: last(rest || ['']),
        permissions: permissions?.split('|') || [],
        is_superuser: !environment.isLocal && permissions?.includes('GlobalAdminPermission'),
        isCloud: type === UserType.cloud,
        type,
    } as Account;
    // TODO: This should eventually be its own LocalAccount type
}

export const DUMMY_ACCOUNT: Account = {
    email: 'test@test.com',
    first_name: 'Test',
    name: 'Test',
    id: 'test',
    last_name: 'User',
    language: 'en_US',
    is_staff: false,
    is_superuser: false,
    isCloud: false,
    permissions: [''],
    can_publish_integration: false,
    is_authenticated: false,
    cookie_reviewed: false,
    account2faEnabled: false,
    sessionVerified: false,
    totpExistsForAccount: false,
    accessToken: 'accessToken',
    type: undefined,
};

// .requiresLogin() in account service doesn't return an actual Account object
export function isAccount(unknownObj: unknown): unknownObj is Account {
    return (
        typeof unknownObj === 'object' &&
        Object.entries(unknownObj).every(([key, value]) => {
            return (
                // eslint-disable-next-line no-prototype-builtins
                DUMMY_ACCOUNT.hasOwnProperty(key) && typeof DUMMY_ACCOUNT[key] === typeof value
            );
        })
    );
}
