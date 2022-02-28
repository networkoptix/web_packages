/* eslint-disable camelcase */
import { Injectable } from '@angular/core';
import { last } from 'lodash-es';

import { User } from '../system-api.types';

@Injectable({
    providedIn: 'root'
})
export class Account {
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
    account2faEnabled: boolean;
    sessionVerified: boolean;
    totpExistsForAccount: boolean;

    constructor({ email, fullName, id, permissions, name, isAdmin, isCloud }: User) {
        this.email = email;
        const [first, ...rest] = (fullName || name || '').split(' ');
        this.id = id;
        this.name = name;
        this.first_name = first;
        this.last_name = last((rest || ['']));
        this.permissions = (permissions || '').split('|');
        this.is_superuser = isAdmin || permissions?.includes('GlobalAdminPermission');
        this.isCloud = isCloud;
    }
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
    totpExistsForAccount: false
};

// .requiresLogin() in account service doesn't return an actual Account object
export function isAccount(unknownObj: unknown): unknownObj is Account {
    return typeof unknownObj === 'object' && (
        Object.entries(unknownObj).every(([key, value]) => {
            return (
                // eslint-disable-next-line no-prototype-builtins
                DUMMY_ACCOUNT.hasOwnProperty(key) &&
                typeof DUMMY_ACCOUNT[key] === typeof value
            );
        })
    );
}
