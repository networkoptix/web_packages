import { User } from '../system-api.service';
import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class Account {
    email: string;
    // eslint-disable-next-line camelcase
    first_name: string;
    id: string;
    // eslint-disable-next-line camelcase
    last_name: string;
    language: string;
    // eslint-disable-next-line camelcase
    is_staff: boolean;
    // eslint-disable-next-line camelcase
    is_superuser: boolean;
    permissions: string[];

    constructor({ email, fullName, id, permissions, name, isAdmin }: User) {
        this.email = email;
        const [first, ...rest] = (fullName || name || '').split(' ');
        this.id = id
        this.first_name = first;
        this.last_name = (rest || ['']).reverse()[0];
        this.permissions = (permissions || '').split('|');
        this.is_superuser = isAdmin || permissions.includes('GlobalAdminPermission');
    }
}
