/* eslint-disable camelcase */
import { Injectable } from '@angular/core';

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

    constructor({ email, fullName, id, permissions, name, isAdmin, isCloud }: User) {
        this.email = email;
        const [first, ...rest] = (fullName || name || '').split(' ');
        this.id = id;
        this.name = name;
        this.first_name = first;
        this.last_name = (rest || ['']).reverse()[0];
        this.permissions = (permissions || '').split('|');
        this.is_superuser = isAdmin || permissions.includes('GlobalAdminPermission');
        this.isCloud = isCloud;
    }
}

const DUMMY_ACCOUNT: Account = {
    email: '',
    first_name: '',
    name: '',
    id: '',
    last_name: '',
    language: '',
    is_staff: true,
    is_superuser: true,
    isCloud: true,
    permissions: [''],
    can_publish_integration: true,
    is_authenticated: true,
    cookie_reviewed: true,
    account2faEnabled: true
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
