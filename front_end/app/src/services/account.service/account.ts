import { Injectable } from '@angular/core';

import { User } from '../system-api.types';

@Injectable({
    providedIn: 'root'
})
export class Account {
    email: string;
    // eslint-disable-next-line camelcase
    first_name: string;
    name: string;
    id: string;
    // eslint-disable-next-line camelcase
    last_name: string;
    language: string;
    // eslint-disable-next-line camelcase
    is_staff: boolean;
    // eslint-disable-next-line camelcase
    is_superuser: boolean;
    isCloud: boolean;
    permissions: string[];
    // eslint-disable-next-line camelcase
    can_publish_integration: boolean;
    // eslint-disable-next-line camelcase
    is_authenticated: boolean;
    // eslint-disable-next-line camelcase
    cookie_reviewed: boolean;

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
