import { last } from 'lodash-es';

import { environment } from '@environments/environment';

import { CurrentUser, ec2User } from '../system-api.types';

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
}

export interface Account extends CloudAccount {
    account2faEnabled: boolean;
    totpExistsForAccount: boolean;
    sessionExpires: number;
}

export function newLocalAccount(user: ec2User | CurrentUser): Account {
    const { email, fullName, id, permissions, name } = user;
    const { isAdmin, isCloud } = user as ec2User;
    const [first, ...rest] = (fullName || name || '').split(' ');
    return {
        email,
        id,
        name,
        first_name: first,
        last_name: last(rest || ['']),
        permissions: permissions?.split('|') || [],
        is_superuser:
            !environment.isLocal && (isAdmin || permissions?.includes('GlobalAdminPermission')),
        isCloud,
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
    sessionExpires: Date.now() + 1000,
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
