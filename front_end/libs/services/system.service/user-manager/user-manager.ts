import { LOCALE_ID } from '@angular/core';
import { combineLatest, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '@environments/environment';
import { nxConfig } from '@services/nx-config/config';
import type {
    ChangedIdReturned,
    ec2PredefinedRole,
    ec2UserRole,
    RestUserRole,
    AggregatedUsers,
} from '@services/system-api.types';
import { NxSystemRestAPI2 } from '@services/system-rest-api-v2.service';
import { NxSystemRestAPI3 } from '@services/system-rest-api-v3.service';
import { NxSystemBase } from '@services/system/system-base';
import { isAdmin, ZERO_ID } from '@utils/nx';

import { NxSystemAPI } from '../../system-legacy-api.service';
import { NxSystemRestAPI } from '../../system-rest-api.service';

import type {
    NxAccessRole,
    SystemPermissions,
    PredefinedRole,
    NxUser,
    NewUserBase,
    NewUserData,
    UserRole,
    PreprocessUser,
    NxUserPwChange,
} from './user-manager-types';

export class UserManager {
    protected _ownerEmail: string = '';
    private _accessRole: string = '';
    accessRoles: NxAccessRole[];
    currentUser: NxUser;
    permissionsUpdated = false;
    permissions: SystemPermissions = {
        editAdmins: false,
        editUsers: false,
        isAdmin: false,
        editCameras: false,
        exportArchives: false,
        viewArchives: false,
    };
    users: NxUser[];

    protected CONFIG = nxConfig;
    protected locale: string;

    constructor(
        protected mediaserver: NxSystemAPI | NxSystemRestAPI | NxSystemRestAPI2 | NxSystemRestAPI3,
        public currentUserEmail: string,
        private userId: string,
    ) {
        this.locale = NxSystemBase.INJECTOR.get(LOCALE_ID);
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
        this.checkPermissions();
    }

    set ownerEmail(email: string) {
        this._ownerEmail = email;
        this.updateUsers();
    }

    get currentOwner(): NxUser {
        return this.users.find(user => user.isCloudOwner);
    }

    canViewInfo(): boolean {
        return this.permissions.isAdmin;
    }

    nonOwners({ cloud, local }: { cloud?: boolean; local?: boolean }): NxUser[] {
        return this.users.filter(user => {
            if (user.isCloud && cloud) {
                return !user.isCloudOwner;
            } else if (!user.isCloud && local) {
                return !user.isLocalOwner;
            } else {
                return false;
            }
        });
    }

    private isLocalOwner(user: PreprocessUser | NxUser): boolean {
        return !user.isCloud && user.name === 'admin';
    }

    private isCloudOwner(user: PreprocessUser | NxUser): boolean {
        return user.isCloud && user.email === this._ownerEmail;
    }

    protected isOwner(user: PreprocessUser | NxUser): boolean {
        /* Avoid race condition between getting offline users and owner
        email being set */
        return (
            ('customPermissions' in user && user.accessRole === 'owner') ||
            this.isLocalOwner(user) ||
            this.isCloudOwner(user)
        );
    }

    checkPermissions(): void {
        const adminPermissions =
            this.isMySystem ||
            (this.currentUser && isAdmin(this.currentUser)) ||
            this.CONFIG.accessRoles.adminAccess.includes(this._accessRole.toLowerCase());
        const permissions: SystemPermissions = {
            editAdmins: this.isMySystem,
            editUsers: adminPermissions,
            exportArchives: adminPermissions,
            isAdmin: adminPermissions,
            editCameras: adminPermissions,
            viewArchives: adminPermissions,
        };

        if (!adminPermissions && this.currentUser) {
            permissions.editUsers = this.currentUser.permissions.includes(
                this.CONFIG.accessRoles.editUserPermissionFlag,
            );
            permissions.editCameras = this.currentUser.permissions.includes(
                this.CONFIG.accessRoles.editCameraPermissionFlag,
            );
            permissions.exportArchives = this.currentUser.permissions.includes(
                this.CONFIG.accessRoles.exportPermissionFlag,
            );
            permissions.viewArchives = this.currentUser.permissions.includes(
                this.CONFIG.accessRoles.viewArchivesPermissionFlag,
            );
        }

        this.permissionsUpdated = true;
        this.permissions = permissions;
    }

    deleteUser(removedUser: Pick<NxUser, 'id'>): Promise<void> {
        return this.mediaserver
            .deleteUser(removedUser.id)
            .toPromise()
            .then(data => {
                if (!data) {
                    data = removedUser;
                }
                this.users = this.users.filter(user => {
                    return user.id !== data.id;
                });
            });
    }

    private getUserRole(user: PreprocessUser | NxUser): NxAccessRole {
        const roles = this.accessRoles;
        let role = roles.find(role => {
            // Owner flag has top priority and overrides everything
            if ((role as PredefinedRole).isOwner) {
                return this.isOwner(user);
            }
            if ('id' in role && role.id !== ZERO_ID) {
                return role.id === user.userRoleId;
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
                ...roles[roles.length - 1],
                permissions: user.permissions,
            };
        }

        return role;
    }

    private getAggregatedUsersData(): Observable<AggregatedUsers> {
        if (this.mediaserver.version === 0) {
            return this.mediaserver.getAggregatedUsersData();
        }
        const mediaserver = <NxSystemRestAPI | NxSystemRestAPI2> this.mediaserver;
        const predefinedRoles$ =
            this.mediaserver.version < 5.2 ? mediaserver.getPredefinedRoles() : of([]);
        return combineLatest([
            mediaserver.getUsers(),
            predefinedRoles$,
            mediaserver.getUserRoles(),
        ]).pipe(
            map(([users, predefinedRoles, roles]) => ({
                reply: {
                    'ec2/getUsers': users.map(user => ({
                        ...user,
                        isCloud: user.type === 'cloud',
                        isLdap: user.type === 'ldap',
                    })),
                    'ec2/getPredefinedRoles': predefinedRoles,
                    'ec2/getUserRoles': roles.filter(({ name }) => name !== 'Owner'), // hide the owner role
                    'ec2/getAccessRights': users.map(({ id, accessibleResources }) => ({
                        userId: id,
                        resourceIds: accessibleResources ?? [],
                    })),
                },
            })),
        );
    }

    getUsersDataFromTheSystem(): Promise<void> {
        return this.getAggregatedUsersData()
            .toPromise()
            .then(
                result => {
                    if (!result) {
                        return Promise.reject(`Aggregated request to server has failed ${result}`);
                    }
                    const data = result.reply;
                    const users = data['ec2/getUsers'];
                    const userRoles = data['ec2/getUserRoles'];
                    const predefinedRoles = data['ec2/getPredefinedRoles'];
                    // const accessRights = data['ec2/getAccessRights'];
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

    processUsers(users: PreprocessUser[]): void {
        const nxUsers = users.map<NxUser>(user => {
            const { id, name, fullName, email, isEnabled, isLdap, userRoleId } = user;

            let isCloudOwner: boolean;
            let isLocalOwner: boolean;
            let isCloud: boolean;
            if ('type' in user) {
                isCloudOwner = user.type === 'cloud' && user.isOwner;
                isLocalOwner = user.type === 'local' && user.isOwner;
                isCloud = user.type === 'cloud';
            } else {
                isCloudOwner = user.isCloud && email === this._ownerEmail;
                isLocalOwner = !user.isCloud && user.name === 'admin';
                isCloud = user.isCloud;
            }
            const isMe = !environment.isLocal
                ? isCloud && email === this.currentUserEmail
                : id === this.userId;

            user.permissions = this.normalizePermissionString(user.permissions);
            const role = this.getUserRole(user);
            const permissions = this.normalizePermissionString(
                [user.permissions, role.permissions].join('|'),
            );
            const canBeEdited = this.canBeEdited({
                isMe,
                isLocalOwner,
                isCloudOwner,
                permissions,
            });

            const postprocess = {
                id,
                name,
                fullName,
                email,

                isEnabled,
                isMe,
                isCloudOwner,
                isLocalOwner,
                isCloud,
                isLdap,

                permissions,
                role,
                get accessRole(): string {
                    return (this as NxUser).role.name;
                },
                userRoleId,
                canBeEdited,
            };

            if (isMe) {
                this.currentUser = postprocess;
                this.accessRole = postprocess.accessRole;
            }
            return postprocess;
        });

        this.users = nxUsers.sort((a, b) => {
            if (a.isCloud && b.isCloud) {
                return a.email.localeCompare(b.email, this.locale);
            } else if (!a.isCloud && !b.isCloud) {
                return a.name.localeCompare(b.name, this.locale);
            } else {
                return a.isCloud ? 1 : -1;
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
            if (user.isMe) {
                this.currentUser = user;
                this.accessRole = user.accessRole;
            }
        });
    }

    protected canBeEdited(
        user: Pick<NxUser, 'isMe' | 'isLocalOwner' | 'isCloudOwner' | 'permissions'>,
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

        const isNotMeOrOwner = !(user.isMe || user.isLocalOwner || user.isCloudOwner);
        return isNotMeOrOwner && (this.isMySystem || !isAdmin(user));
    }

    saveUser(user: NxUser | NxUserPwChange | NewUserBase): Promise<ChangedIdReturned> {
        const isSelf = (user as NxUser).id === this.currentUser.id;
        if (isSelf && user.isCloud) {
            return Promise.reject({ resultCode: 'cantAddYourOwnEmail' });
        }

        if (
            !isSelf &&
            Object.prototype.hasOwnProperty.call(user as NxUser, 'canBeEdited') &&
            !(user as NxUser).canBeEdited &&
            !this.isMySystem
        ) {
            return Promise.reject({ resultCode: 'cantEditAdmin' });
        }

        let userData: NxUser | NewUserData;
        if ('id' in user) {
            // Modifying existing user
            userData = user;
            // The mediaserver doesn't like any attempts to change admin's permissions
            if (userData.isLocalOwner) {
                delete userData.name;
                delete userData.permissions;
            } else {
                userData.permissions = userData.role.permissions;
            }
        } else {
            // Creating new user
            const { role, ...newUser } = user;
            userData = {
                ...newUser,
                canBeEdited: true,
                userRoleId: (role as UserRole).id ?? ZERO_ID,
                permissions: role.permissions,
                name: user.email,
            };
        }

        if (userData.permissions?.includes('NoPermission')) {
            userData.permissions = this.CONFIG.accessRoles.globalCustomUserPermission;
        }

        const saveAction =
            !('id' in user) && this.mediaserver.version >= 5.1
                ? this.mediaserver.addUser(userData)
                : this.mediaserver.saveUser(userData);

        return saveAction.toPromise();
    }

    private updateAccessRoles(
        predefinedRoles: ec2PredefinedRole[],
        userRoles: (ec2UserRole | RestUserRole)[],
    ): NxAccessRole[] {
        predefinedRoles.forEach(role => {
            role.permissions = this.normalizePermissionString(role.permissions);
        });

        userRoles.forEach(userRole => {
            userRole.permissions = this.normalizePermissionString(userRole.permissions ?? '');
            // Permissions property is omitted if role has no permissions
        });

        this.accessRoles = [
            ...predefinedRoles,
            ...userRoles,
            this.CONFIG.accessRoles.customPermission,
        ];
        return this.accessRoles;
    }
}
