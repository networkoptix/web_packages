import { User } from '..';

export class Account {
    email: string;
    // eslint-disable-next-line camelcase
    first_name: string;
    // eslint-disable-next-line camelcase
    last_name: string;
    language: string;
    // eslint-disable-next-line camelcase
    is_staff: boolean;
    // eslint-disable-next-line camelcase
    is_superuser: boolean;
    permissions: string[];

    constructor({ email, fullName, permissions, name }: User) {
        this.email = email;
        const [first, ...rest] = (fullName || name || '').split(' ');
        this.first_name = first;
        this.last_name = (rest || ['']).reverse()[0];
        this.permissions = (permissions || '').split('|');
        this.is_superuser = permissions.includes('GlobalAdminPermission');
    }
}
