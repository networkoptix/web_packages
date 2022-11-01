import { isEqual, cloneDeep } from 'lodash-es';

import { environment } from '@environments/environment';
import type { IConfig } from '@services/nx-config/config-types';
import { NxSystemRestAPI2 } from '@services/system-rest-api-v2.service';
import { LanguageI18NStaticTypes } from '@src/language_i18n_static_types';

import { NxSystemAPI } from '../../system-legacy-api.service';
import { NxSystemRestAPI } from '../../system-rest-api.service';

import {
    NxSystemRole,
    NxSystemUser,
    SystemPermissions
} from './user-manager-types';

export class UserManager {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    private mediaserver: NxSystemAPI | NxSystemRestAPI | NxSystemRestAPI2;
    private _ownerEmail: string;
    private _accessRole: string = '';
    private _userId: string;
    accessRoles: NxSystemRole[];
    currentUser: NxSystemUser;
    currentUserEmail: string;
    isMine: boolean;
    permissions: SystemPermissions;
    users: NxSystemUser[];

    constructor(
        config: IConfig,
        lang: LanguageI18NStaticTypes,
        mediaserver: NxSystemAPI | NxSystemRestAPI | NxSystemRestAPI2,
        currentUserEmail: string,
        userId: string
    ) {
        this.CONFIG = config;
        this.LANG = lang;
        this.mediaserver = mediaserver;
        this.currentUserEmail = currentUserEmail;

        this._ownerEmail = '';
        this._accessRole = '';
        this._userId = userId;
        this.accessRoles = this.CONFIG.accessRoles.predefinedRoles;
        this.isMine = false;
        this.permissions = new SystemPermissions();
    }

    get accessRole() {
        return this._accessRole;
    }

    set accessRole(accessRole) {
        this._accessRole = accessRole || '';
        this.checkPermissions();
    }

    // eslint-disable-next-line accessor-pairs
    set ownerEmail(email: string) {
        this._ownerEmail = email;
        this.isMine =
            (email && this.currentUserEmail === email) ||
            this.currentUser?.isLocalOwner;
    }

    get currentOwner(): NxSystemUser {
        return this.users.find(user => user.isCloudOwner);
    }

    nonOwners({ cloud, local }: { cloud?: boolean; local?: boolean }): NxSystemUser[] {
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

    isAdmin(user: NxSystemRole) {
        return user.permissions &&
            user.permissions.includes(this.CONFIG.accessRoles.globalAdminPermissionFlag);
    }

    isEmptyGuid(guid?: string) {
        return guid
            ? guid.replace(/[{}0-]/gi, '') === ''
            : true;
    }

    isOwner(user: NxSystemUser) {
        return user?.isLocalOwner || user?.isCloud && user?.email === this._ownerEmail;
    }

    checkPermissions(): void {
        const isMine = this.isMine || this.currentUser?.isLocalOwner || false;
        let isAdmin = isMine ||
            this.CONFIG.accessRoles.adminAccess.includes(this._accessRole.toLowerCase());
        if (!isAdmin && this.currentUser) {
            isAdmin = this.isAdmin(this.currentUser);
        }
        const permissions: SystemPermissions = {
            editAdmins: isMine,
            editUsers: isAdmin,
            isAdmin,
            editCameras: isAdmin,
            viewArchives: isAdmin
        };

        if (!isAdmin && this.currentUser) {
            permissions.editUsers = this.currentUser.permissions.includes(
                this.CONFIG.accessRoles.editUserPermissionFlag
            );
            permissions.editCameras = this.currentUser.permissions.includes(
                this.CONFIG.accessRoles.editCameraPermissionFlag
            );
            permissions.viewArchives = this.currentUser.permissions.includes(
                this.CONFIG.accessRoles.viewArchivesPermissionFlag
            );
        }

        this.permissions = permissions;
    }

    deleteUser(removedUser: NxSystemUser) {
        return this.mediaserver.deleteUser(removedUser.id).toPromise()
            .then(data => {
                this.users = this.users.filter(user => {
                    return user.id !== data.id;
                });
            })
            .catch(err => {
                console.info('failed to removed from system directly');
                console.error(err);
            });
    }

    findAccessRole(user: NxSystemUser) {
        const roles = this.accessRoles || this.CONFIG.accessRoles.predefinedRoles;
        // TODO Need to figure out role type here
        let role: NxSystemRole = roles.find((role: NxSystemRole) => {
            // Owner flag has top priority and overrides everything
            if (role.isOwner) {
                return this.isOwner(user);
            }
            if (!this.isEmptyGuid(role.id)) {
                return role.id === user.userRoleId;
            }

            // Admins has second priority
            if (this.isAdmin(role)) {
                return this.isAdmin(user);
            }
            return role.permissions === user.permissions;
        });
        // handles the Custom role
        if (!role) {
            role = cloneDeep(roles[roles.length - 1]);
            role.isAdmin = this.isAdmin(user);
            role.permissions = user.permissions;
        }

        return role || roles[roles.length - 1];
    }

    getUsersDataFromTheSystem(): Promise<NxSystemUser[] | string | false> {
        return this.mediaserver.getAggregatedUsersData().toPromise().then((result: any) => {
            if (!result) {
                return Promise.reject(`Aggregated request to server has failed ${result}`);
            }
            const data = result.reply;
            const users = data['ec2/getUsers'];
            const userRoles = data['ec2/getUserRoles'];
            const predefinedRoles = data['ec2/getPredefinedRoles'];
            const accessRights = data['ec2/getAccessRights'];
            return new Promise(resolve => {
                this.updateAccessRoles(predefinedRoles, userRoles);
                return resolve(this.processUsers(users, accessRights));
            });
        }, () => {
            return Promise.reject('Media server cloud not be reached.');
        });
    }

    normalizePermissionString(permissions: string): string {
        return Array.from(new Set(permissions.split('|').sort())).join('|');
    }

    processUsers(users: NxSystemUser[], accessRights = []) {
        if (!Array.isArray(users)) {
            return false;
        }
        // accessRights if individual camera permissions ever set
        accessRights = Object.keys(accessRights).length ? accessRights.reduce((obj, next) => {
            obj[next.userId] = next.resourceIds;
            return obj;
        }, {}) : {};
        // const accessRightsAssoc = _.indexBy(accessRights,'userId'); // Leave commented out
        this.users = users.map(user => {
            // @ts-expect-error: TODO Can't resolve accountFullName, NxSystemUser interface might be missing properties
            if (user.accountFullName && !user.fullName) {
                // @ts-expect-error TODO Can't resolve accountFullName, NxSystemUser interface might be missing properties
                user.fullName = user.accountFullName;
            }
            user.permissions = this.normalizePermissionString(user.permissions);
            user.role = this.findAccessRole(user);
            // Update default permissions with role permissions
            user.permissions = this.normalizePermissionString([user.permissions, user.role.permissions].join('|'));
            user.accessRole = user.role.name;
            // allMediaPermissionFlag exists if the all camera permission option selected
            if (!user.permissions.includes(this.CONFIG.accessRoles.allMediaPermissionFlag) && accessRights[user.id]) {
                user.accessRights = accessRights[user.id].reduce((obj: { [resourceId: string]: true; }, next: string) => {
                    obj[next] = true;
                    return obj;
                }, {});
            }
            // @ts-expect-error: TODO Can't resolve accountID, NxSystemUser interface might be missing properties
            user.id = user.id || user.accountId;
            user.isCloudOwner = this.isOwner(user);
            user.isMe = !environment.isLocal ? user.isCloud && user.email === this.currentUserEmail : user.id === this._userId;
            user.isAdmin = this.isAdmin(user);
            user.isLocalOwner = !user.isCloud && user.name === 'admin';

            /**
             * User can not be edited if:
             * - this user is the current user
             * - this user is the local owner (local 'admin')
             * - this user is the cloud owner
             *
             * Furthermore, if the system is not mine and the user is an admin,
             *   they also can not be edited
             */
            const isNotMeOrOwner = !(user.isMe || user.isLocalOwner || user.isCloudOwner);
            user.canBeEdited = isNotMeOrOwner && (this.isMine || !user.isAdmin);

            if (user.isMe) {
                this.currentUser = user;
                this.accessRole = user.accessRole;
            }

            return user;
        }).sort((userA, userB) => {
            // sorts local before cloud users --> then by email for cloud & name for local
            if (userA.isCloud === userB.isCloud) {
                if (userA.isCloud) {
                    return userA.email < userB.email ? -1 : 1;
                } else {
                    return userA.name < userB.name ? -1 : 1;
                }
            }
            return userA.isCloud ? 1 : -1;
        });

        return this.users;
    }

    saveUser(user: NxSystemUser, role: NxSystemRole) {
        let userCreated = false;
        const isSelf = user.id === this.currentUser.id;
        if (isSelf && user.isCloud) {
            return Promise.reject({ resultCode: 'cantAddYourOwnEmail' });
        }

        if (!user.id) {
            let existingUser: Partial<NxSystemUser> = this.users.find(u => {
                return user.email === u.email;
            });
            if (!existingUser) { // user not found - create a new one
                userCreated = true;
                existingUser = this.mediaserver.userObject(user.fullName, user.email);
            }
            user = { ...existingUser, ...user };
        }

        if (!isSelf && !user.canBeEdited && !this.isMine) {
            return Promise.reject({ resultCode: 'cantEditAdmin' });
        }

        user.userRoleId = role.id || '';
        user.permissions = role.permissions || '';

        // The mediaserver doesn't like any attempts to change admin's permissions
        if (user.isLocalOwner) {
            delete user.name;
            delete user.permissions;
        }

        return this.mediaserver.saveUser(user).toPromise().then(result => {
            user.id = result.id;
            user.role = role;
            user.accessRole = role.name || role.label;
            if (userCreated) {
                this.users.push(user);
            }
            return result;
        });
    }

    updateAccessRoles(predefinedRoles: NxSystemRole[], userDefinedRoles: NxSystemRole[]) {
        predefinedRoles.forEach((role: NxSystemRole) => {
            role.permissions = this.normalizePermissionString(role.permissions);
            role.isAdmin = this.isAdmin(role);
        });

        const userRolesList = userDefinedRoles.map((userRole: NxSystemRole) => {
            userRole.isAdmin = this.isAdmin(userRole);
            userRole.permissions = this.normalizePermissionString(userRole.permissions);
            return userRole;
        }).sort((userRoleA, userRoleB) => {
            return userRoleA.name < userRoleB.name ? -1 : 1;
        });

        const newRoles = Array.from(new Set([
            ...predefinedRoles,
            ...userRolesList,
            this.CONFIG.accessRoles.customPermission
        ]));
        if (!isEqual(newRoles, this.accessRoles)) {
            this.accessRoles = newRoles;
        }
        return this.accessRoles;
    }
}
