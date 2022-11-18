import { lastValueFrom } from 'rxjs';

import staticLang from '@common/language/language_i18n_static.json';
import { environment } from '@environments/environment';
import type { IConfig } from '@services/nx-config/config-types';
import { NxSystemRestAPI3 } from '@services/system-rest-api-v3.service';
import { cleanId } from '@utils/general';

import { UserManager } from './user-manager';
import {
    SystemPermissions,
    NxUserGroup,
    NxSystemUser,
} from './user-manager-types';

export class UserWithGroupsManager extends UserManager {
    CONFIG: IConfig;
    LANG = staticLang;

    protected mediaserver: NxSystemRestAPI3;
    protected _userGroups: NxUserGroup[];
    protected _groupPermissions: {
        [id: string]: Set<string>
    };
    protected _ownerEmail: string;
    protected _userId: string;
    isMine: boolean;
    currentUser: NxSystemUser;
    currentUserEmail: string;
    permissions: SystemPermissions;
    users: NxSystemUser[];

    constructor(
        config: IConfig,
        mediaserver: NxSystemRestAPI3,
        currentUserEmail: string,
        userId: string,
        protected locale: string
    ) {
        super(
            config,
            mediaserver,
            currentUserEmail,
            userId,
            locale,
        );
        this.CONFIG = config;
        this.mediaserver = mediaserver;
        this.currentUserEmail = currentUserEmail;
        this._userId = userId;

        this._ownerEmail = '';
        this.isMine = false;
        this.permissions = new SystemPermissions();
    }

    get userGroups(): NxUserGroup[] {
        return this._userGroups || [];
    }

    set userGroups(userGroups: NxUserGroup[]) {
        this._userGroups = userGroups;
    }

    // get isMine(): boolean {
    //     const { email, isLocalOwner } = this.currentUser;
    //     return email
    //         ? email === this.currentUserEmail
    //         : isLocalOwner;
    // }

    get ownerEmail(): string {
        return this._ownerEmail;
    }

    set ownerEmail(email: string) {
        if (email) {
            this._ownerEmail = email;
            this.isMine =
                this.currentUserEmail === email ||
                !!this.currentUser?.isLocalOwner;
            this.processUsers(this.users);
        }
    }

    get currentOwner(): NxSystemUser {
        return this.users.find(user => {
            return user.isOwner && user.type === 'cloud';
        });
    }

    // returns all users that are not owners
    nonOwners({ cloud, local }: { cloud?: boolean; local?: boolean }): NxSystemUser[] {
        return this.users.filter((user: NxSystemUser) => {
            if (user.type === 'cloud' && cloud || user.type === 'local' && local) {
                return !user.isOwner;
            }
            return false;
        });
    }

    checkPermissions(): void {
        const isMine = this.isMine || this.currentUser?.isLocalOwner || false;
        let isAdmin = isMine;
        // is there a backup admin check within new permission scheme?
        // || this.CONFIG.accessRoles.adminAccess.includes(this._accessRole.toLowerCase());
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

    async deleteUser(removedUser: NxSystemUser): Promise<void> {
        try {
            const deletedUser = await lastValueFrom(this.mediaserver.deleteUser(removedUser.id));
            this.users = this.users.filter(user => user.id !== deletedUser.id);
        } catch (err) {
            console.info('failed to removed from system directly');
            console.error(err);
        }
    }

    async getUsersDataFromTheSystem(): Promise<NxSystemUser[] | string | false> {
        try {
            const userGroups: NxUserGroup[] = await lastValueFrom(this.mediaserver.getUserGroups());
            this.processGroups(userGroups);
            const users: NxSystemUser[] = await lastValueFrom(this.mediaserver.getUsers());
            return Promise.resolve(this.processUsers(users));
        } catch (err) {
            return Promise.reject('Media server cloud not be reached.');
        }
    }

    processGroups(userGroups: NxUserGroup[]): void {
        this._userGroups = userGroups;
        const processedGroups: {
            [id: string]: Set<string>
        } = {};
        userGroups.forEach((userGroup: NxUserGroup) => {
            processedGroups[userGroup.id] = new Set(userGroup.permissions.split('|'));
            if (!userGroup.description && userGroup.isPredefined) {
                userGroup.description = this.LANG.accessRoles[userGroup.name].description || userGroup.name;
            }
        });
        this._groupPermissions = processedGroups;
    }

    getPermissionsFromUserGroups({ userGroupIds, permissions }: { userGroupIds?: string[], permissions: string }): Set<string> {
        const permissionSet = new Set<string>(permissions && permissions.includes('|')
            ? permissions.split('|')
            : [permissions]
        );
        // cloud owner currently has no userGroupIds, but instead has permissions set on the user object permissions field
        if (userGroupIds?.length > 0) {
            userGroupIds.forEach((id: string) => {
                this._groupPermissions[id].forEach(id => {
                    permissionSet.add(id);
                });
            });

            // sometimes a user can have 'NoGlobalPermissions' set in their permissions field
            // but have a userGroupId with permissions --> so removing in such cases (mainly Cloud Owner)
            permissionSet.delete('NoGlobalPermissions');
        }
        return permissionSet;
    }

    processUsers(usersWithGroups: NxSystemUser[]): (NxSystemUser[] | false) {
        if (!Array.isArray(usersWithGroups)) {
            return false;
        }
        /**
         * individual camera rights set by `resourceAccessRights` on the user object, but not implemented yet
         * need to get structure of data to build an estimate at least
         * **
         * how does parentGroupIds work? all rights that parent groups have, child groups have?
         * if so, is that parsed down in some way? all set into permissions & resourceAccessRights?
         * or do I need to iterate through and form my own set of master permissions?
         */
        this.users = usersWithGroups.map((user: NxSystemUser) => {
            // if local user has no fullName, do we need to add name as fullName?
            // if (!user.fullName && user.name) {
            //     user.fullName = user.name;
            // }
            user.permissionsSet = this.getPermissionsFromUserGroups(user);
            if (user.userGroupIds === undefined) {
                user.userGroupIds = [];
            }
            user.permissions = this.normalizePermissionString([
                user.permissions,
                Array.from(user.permissionsSet).join('|')
            ].join('|'));
            // should we add a list of user group names?
            // user.userGroupNames = [];
            // allMediaPermissionFlag exists if the all camera permission option selected...this still true?
            user.isAdmin = this.isAdmin(user);
            user.isCloud = user.type === 'cloud';
            user.isLdap = user.type === 'ldap';
            user.isCloudOwner = user.isCloud && user.isOwner;
            user.isLocalOwner = user.type === 'local' && user.isOwner;
            user.isMe = environment.isLocal
                ? user.id === this._userId
                : user.isCloud && user.email === this.currentUserEmail;
            user.canBeEdited = this.canBeEdited(user);

            if (user.isMe) {
                this.currentUser = user;
                // set userGroups for user?
            }
            return user;
        }).sort((userA, userB) => {
            // seems to error when >= 5.2 system is offline, type field does not exist
            // sorts local before cloud users --> then by email for cloud & name for local
            if (userA.type === userB.type) {
                if (userA.type === 'cloud') {
                    return userA.email.localeCompare(userB.email, this.locale);
                } else {
                    return userA.name.localeCompare(userB.name, this.locale);
                }
            }
            return userA.type === 'cloud' ? 1 : -1;
        });

        return this.users;
    }

    canBeEdited(user: NxSystemUser): boolean {
        /**
         * User can not be edited if:
         * - this user is the current user
         * - this user is the local owner (local 'admin')
         * - this user is the cloud owner
         *
         * Furthermore, if the system is not mine and the user is an admin,
         *   they also can not be edited
         */
        const isNotMeOrOwner = !(user.isMe || user.isOwner);
        return isNotMeOrOwner && (this.isMine || !user.isAdmin);
    }

    modifyUser(user: NxSystemUser): Promise<NxSystemUser> {
        let userCreated = false;
        const isSelf = user.id === this.currentUser.id;
        if (isSelf && user.type === 'cloud') {
            return Promise.reject({ resultCode: 'cantAddYourOwnEmail' });
        }

        if (!user.id) {
            let existingUser: Partial<NxSystemUser> = this.users.find(u => {
                return user.email === u.email;
            });
            if (!existingUser) { // user not found - create a new one
                userCreated = true;
                existingUser = this.mediaserver.userWithGroupsObject(user.fullName, user.email);
            }
            user = { ...existingUser, ...user };
        }

        if (!isSelf && !user.canBeEdited && !this.isMine) {
            return Promise.reject({ resultCode: 'cantEditAdmin' });
        }

        // The mediaserver doesn't like any attempts to change admin's permissions
        if (user.isLocalOwner) {
            delete user.name;
            delete user.permissions;
        }

        return lastValueFrom(this.mediaserver.modifyUser(
            this.cleanupUserObject(user),
            cleanId(user.id)
        ))
            .then((savedUser: NxSystemUser) => {
                user.id = savedUser.id;
                if (userCreated) {
                    this.users.push(user);
                }
                return savedUser;
            });
    }

    // modify object doesn't seem to allow for extra fields
    // so only including fields that will potentially change
    cleanupUserObject({
        name,
        email,
        fullName,
        permissions,
        isEnabled,
        userGroupIds
    }: NxSystemUser): Partial<NxSystemUser> {
        return {
            name,
            email,
            fullName,
            permissions,
            isEnabled,
            userGroupIds
        };
    }
}
