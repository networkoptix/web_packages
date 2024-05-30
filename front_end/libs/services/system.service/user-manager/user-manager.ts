import { signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { MultiSelectItem } from '@components/dropdowns/multi-select/multi-select.component.types';
import { nxConfig } from '@services/nx-config/config';
import type { ChangedIdReturned } from '@services/system-api.types';
import { NxSystemRestAPI2 } from '@services/system-rest-api-v2.service';
import { NxSystemRestAPI3 } from '@services/system-rest-api-v3.service';
import {
    AddUser,
    NxUser,
    PredefinedLegacyRole,
    Role,
    SystemUser,
    UserType,
} from '@services/system-user.types';
import { isAdmin, ZERO_ID } from '@utils/nx';

import { coerceUserType } from '../../helpers/coerce-user-type';
import { NxSystemAPI } from '../../system-legacy-api.service';
import { NxSystemRestAPI } from '../../system-rest-api.service';

export class UserManager {
    // Hardcoded in the vms source code. Admin will always have this id.
    private readonly localOwnerId = '{99cbc715-539b-4bfe-856f-799b45b69b1e}';
    protected _ownerEmail: string = '';
    private _accessRole: string = '';
    accessRoles: Role[];
    groups: MultiSelectItem[];
    groups$$ = signal<MultiSelectItem[]>([]);
    currentUser: NxUser;
    users: NxUser[];

    protected CONFIG = nxConfig;

    constructor(
        protected mediaserver: NxSystemAPI | NxSystemRestAPI | NxSystemRestAPI2 | NxSystemRestAPI3,
        public currentUserEmail: string,
        protected userId: string,
    ) {
        this.accessRoles = this.CONFIG.accessRoles.predefinedRoles;
    }

    get isMySystem(): boolean {
        return (
            (this._ownerEmail && this.currentUserEmail === this._ownerEmail) ||
            (this.currentUser && this.isOwner(this.currentUser)) ||
            this._accessRole === 'owner'
        );
    }

    get accessRole(): string {
        return this._accessRole;
    }

    set accessRole(accessRole: string) {
        this._accessRole = accessRole || '';
    }

    set ownerEmail(email: string) {
        this._ownerEmail = email;
        this.updateUsers();
    }

    // Todo: In the future this could be a problem where we have multiple cloud owners.
    // Note: This is used in layouts. Pycharm cant detect it being used. Check in layouts
    get currentOwner(): NxUser {
        return this.users.find(user => user.isCloudOwner);
    }

    // Local owners id will always be localOwnerId for all versions
    private isLocalOwner(user: SystemUser): boolean {
        return user.id === this.localOwnerId;
    }

    /*
        4.2 - Check owner with isAdmin (In handler convert to isOwner)
        5.0, 5.1 - Check owner with isOwner
        6.0 - Check with groupId's `{00000000-0000-0000-0000-100000000000}`
    */
    protected isCloudOwner(user: SystemUser): boolean {
        return (
            'isCloud' in user &&
            !!user.isCloud &&
            (('isOwner' in user && !!user.isOwner) || ('isAdmin' in user && !!user.isAdmin))
        );
    }

    protected isOwner(user: SystemUser): boolean {
        return this.isCloudOwner(user) || this.isLocalOwner(user);
    }

    deleteUser(removedUser: Pick<NxUser, 'id'>): Promise<void> {
        return firstValueFrom(this.mediaserver.deleteUser(removedUser.id)).then(data => {
            if (!data) {
                data = removedUser;
            }
            this.users = this.users.filter(user => {
                return user.id !== data.id;
            });
        });
    }

    private getUserRole(user: SystemUser): Role {
        const roles = this.accessRoles;
        let role = roles.find(role => {
            // When a system is offline users come from cdb so we can rely on userRoleId.
            const userRoleId = 'userRoleId' in user && user.userRoleId;
            // Owner flag has top priority and overrides everything
            if ('isOwner' in role && role.isOwner) {
                return this.isOwner(user) || role.id === userRoleId;
            }
            // Handles cloud users. If userRoleId is ZERO_ID the info is coming from the mediaserver
            if (userRoleId && userRoleId !== ZERO_ID) {
                return role.id === userRoleId;
            }

            // Admins has second priority
            if (isAdmin(role)) {
                return isAdmin(user);
            }
            return role.permissions === user.permissions;
        });
        // handles the Custom role
        if (!role) {
            role = {
                ...this.CONFIG.accessRoles.customPermission,
                permissions: user.permissions,
            };
        }

        return role;
    }

    getUsersDataFromTheSystem(): Promise<void> {
        return firstValueFrom(this.mediaserver.getAggregatedUsersData()).then(
            result => {
                if (!result) {
                    return Promise.reject(`Aggregated request to server has failed ${result}`);
                }
                const data = result.reply;
                const users = data['/ec2/getUsers'];
                const userRoles = data['/ec2/getUserRoles'];
                const predefinedRoles = this.CONFIG.accessRoles.predefinedRoles;
                return new Promise(resolve => {
                    this.updateAccessRoles(predefinedRoles, userRoles);
                    this.processUsers(users);
                    resolve();
                });
            },
            () => {
                return Promise.reject('Media server cloud not be reached.');
            },
        );
    }

    // e.g. GlobalViewLogsPermission|GlobalViewArchivePermission|GlobalUserInputPermission
    normalizePermissionString(permissions: string): string {
        return Array.from(new Set(permissions.split('|').sort())).join('|');
    }

    processUsers(users: SystemUser[]): void {
        const nxUsers = users.map<NxUser>(user => {
            const { id, name, fullName, email, isEnabled } = user;
            const isCloudOwner = this.isCloudOwner(user);
            const isLocalOwner = this.isLocalOwner(user);
            const isOwner = isCloudOwner || isLocalOwner || ('isAdmin' in user && !!user.isAdmin);
            const type = coerceUserType(user);

            user.permissions = this.normalizePermissionString(user.permissions);
            const role = this.getUserRole(user);
            const permissions = this.normalizePermissionString(
                [user.permissions, role.permissions].join('|'),
            );

            const canBeEdited = this.canBeEdited({
                id,
                isLocalOwner,
                isCloudOwner,
                permissions,
            });

            const postprocess: NxUser = {
                hasCustomPermissions: false,
                id,
                name,
                fullName,
                email,

                isAdmin: isOwner || isAdmin(user),
                isEnabled,
                isCloudOwner,
                isLocalOwner,
                isHttpDigestEnabled: false,
                isOwner,
                type,

                permissions,
                role,
                get accessRole(): string {
                    return role.name;
                },
                userRoleId: ('userRoleId' in user && user.userRoleId) || ZERO_ID,
                canBeEdited,
            };

            if (this.userId === postprocess.id) {
                this.currentUser = postprocess;
            }
            return postprocess;
        });

        this.users = nxUsers.sort((a, b) => {
            if (a.type === UserType.cloud && b.type === UserType.cloud) {
                return a.email.localeCompare(b.email, navigator.language);
            } else if (a.type !== UserType.cloud && b.type !== UserType.cloud) {
                return a.name.localeCompare(b.name, navigator.language);
            } else {
                return a.type === UserType.cloud ? 1 : -1;
            }
        });
    }

    /** Update user roles/permissions when owner email is changed */
    private updateUsers(): void {
        this.users?.forEach(user => {
            user.role = this.getUserRole(user);
            user.permissions = this.normalizePermissionString(
                [user.permissions, user.role.permissions].join('|'),
            );
            user.isCloudOwner = this.isCloudOwner(user);
            user.canBeEdited = this.canBeEdited(user);
            if (this.userId === user.id) {
                this.currentUser = user;
            }
        });
    }

    protected canBeEdited(
        user: Pick<NxUser, 'id' | 'isLocalOwner' | 'isCloudOwner' | 'permissions'>,
    ): boolean {
        /**
         * User can not be edited if:
         * - this user is the current user
         * - this user is the local owner (local 'admin')
         * - this user is the cloud owner
         *
         * Furthermore, if the system is not mine and the user is an admin,
         *   they also can not be edited
         */
        // const amIAdmin = this.system.userManager.currentUser.isAdmin;
        // const isNotMeOrOwner = !(user.isMe || user.isLocalOwner || user.isCloudOwner);
        // this.selectedUser.canBeEdited = isNotMeOrOwner && amIAdmin;

        const isNotMeOrOwner = !(this.userId === user.id || user.isLocalOwner || user.isCloudOwner);
        return isNotMeOrOwner && (this.isMySystem || !isAdmin(user));
    }

    addUser(user: AddUser): Promise<ChangedIdReturned> {
        const { role, ...newUser } = user;
        const userData = {
            ...newUser,
            isEnabled: true,
            userRoleId: ZERO_ID,
            permissions: role?.permissions || '',
            name: user.email,
        };

        if (userData.permissions?.includes('NoPermission')) {
            userData.permissions = this.CONFIG.accessRoles.globalCustomUserPermission;
        }

        const saveAction =
            this.mediaserver instanceof NxSystemRestAPI
                ? this.mediaserver.addUser(userData)
                : this.mediaserver.saveUser(userData);

        return firstValueFrom(saveAction);
    }

    saveUser(user: NxUser): Promise<ChangedIdReturned> {
        const isSelf = user.id === this.currentUser?.id;
        if (isSelf && user.type === UserType.cloud) {
            return Promise.reject({ resultCode: 'cantAddYourOwnEmail' });
        }

        if (
            !isSelf &&
            Object.prototype.hasOwnProperty.call(user, 'canBeEdited') &&
            !user.canBeEdited &&
            !this.isMySystem
        ) {
            return Promise.reject({ resultCode: 'cantEditAdmin' });
        }

        const userData: NxUser = user;
        user.email = user.email.toLowerCase();
        // The mediaserver doesn't like any attempts to change admin's permissions
        if (userData.isLocalOwner) {
            delete userData.name;
            delete userData.permissions;
        } else if (userData.role) {
            userData.permissions = userData.role.permissions;
            userData.userRoleId = ZERO_ID;
        } else {
            delete userData.permissions;
        }

        if (userData.permissions?.includes('NoPermission')) {
            userData.permissions = this.CONFIG.accessRoles.globalCustomUserPermission;
        }

        return firstValueFrom(this.mediaserver.saveUser(userData));
    }

    private updateAccessRoles(predefinedRoles: PredefinedLegacyRole[], userRoles: Role[]): void {
        predefinedRoles.forEach(role => {
            role.permissions = this.normalizePermissionString(role.permissions);
        });

        userRoles.forEach(userRole => {
            userRole.permissions = this.normalizePermissionString(userRole.permissions ?? '');
            // Permissions property is omitted if role has no permissions
        });

        this.accessRoles = [...predefinedRoles, ...userRoles];
    }
}
