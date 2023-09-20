import { LOCALE_ID } from '@angular/core';
import { firstValueFrom, lastValueFrom } from 'rxjs';

import staticLang from '@language_static';
import { nxConfig } from '@services/nx-config/config';
import { NxSystemBase } from '@services/system/system-base';
import { ChangedIdReturned } from '@services/system-api.types';
import { NxSystemRestAPI3 } from '@services/system-rest-api-v3.service';
import {
    AddUser,
    NxUser,
    RestV3User,
    UserGroup,
    UserGroupDropdown,
    UserType,
} from '@services/system-user.types';
import { alphabeticalSort, cleanId } from '@utils/general';

import { UserManager } from './user-manager';

interface UserPerms {
    groupIds?: string[];
    permissions: string;
}

export class UserWithGroupsManager extends UserManager {
    readonly administratorGroup = '{00000000-0000-0000-0000-100000000000}';
    readonly powerUserGroup = '{00000000-0000-0000-0000-100000000001}';
    LANG = staticLang;

    protected mediaserver: NxSystemRestAPI3;
    userGroups: UserGroup[];
    protected groupsToPermissions: {
        [id: string]: Set<string>;
    };
    protected _ownerEmail: string;
    protected locale: string;
    // isMySystem: boolean;
    currentUser: NxUser;
    currentUserEmail: string;
    users: NxUser[];

    protected CONFIG = nxConfig;

    constructor(mediaserver: NxSystemRestAPI3, currentUserEmail: string, userId: string) {
        super(mediaserver, currentUserEmail, userId);
        this.locale = NxSystemBase.INJECTOR.get(LOCALE_ID);
        this.mediaserver = mediaserver;
        this.currentUserEmail = currentUserEmail;

        this._ownerEmail = '';
    }

    get isMySystem(): boolean {
        return (
            (this._ownerEmail && this.currentUserEmail === this._ownerEmail) ||
            (this.currentUser && this.isOwner(this.currentUser))
        );
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
            // this.isMySystem =
            //     this.currentUserEmail === email ||
            //     !!this.currentUser?.isLocalOwner;
            this.processUsers(this.users);
        }
    }

    override get currentOwner(): NxUser {
        return this.users.find(user => {
            return user.isOwner && user.type === 'cloud';
        });
    }

    // returns all users that are not owners
    override nonOwners({ cloud, local }: { cloud?: boolean; local?: boolean }): NxUser[] {
        return this.users.filter((user: NxUser) => {
            if ((user.type === 'cloud' && cloud) || (user.type === 'local' && local)) {
                return !user.isOwner;
            }
            return false;
        });
    }

    override async deleteUser(removedUser: NxUser): Promise<void> {
        try {
            await lastValueFrom(this.mediaserver.deleteUser(removedUser.id));
            this.users = this.users.filter(user => user.id !== removedUser.id);
        } catch (err) {
            console.info('failed to removed from system directly');
            console.error(err);
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    override async getUsersDataFromTheSystem(): Promise<any> {
        try {
            const userGroups: UserGroup[] = await lastValueFrom(this.mediaserver.getUserGroups());
            this.processGroups(userGroups);
            const users: NxUser[] = await lastValueFrom(this.mediaserver.getUsers());
            return Promise.resolve(this.processUsers(users));
        } catch (err) {
            return Promise.reject('Media server cloud not be reached.');
        }
    }

    processGroups(userGroups: UserGroup[]): void {
        const { defaultUserGroupText, customUserGroupText, ldapUserGroupText } =
            this.LANG.dialogs.titles;
        const groupsToPermissions: {
            [id: string]: Set<string>;
        } = {};
        const builtInGroup: UserGroupDropdown[] = [{ id: 'title', label: defaultUserGroupText }];
        const customGroup: UserGroupDropdown[] = [];
        const ldapGroup: UserGroupDropdown[] = [];
        userGroups.forEach(({ id, name, description, attributes, permissions, type }) => {
            groupsToPermissions[id] = new Set(permissions?.split('|'));
            if (!description && attributes?.includes('readonly')) {
                userGroups[id].description = this.LANG.accessRoles[name].description || name;
            }
            // Do not allow Administrator to be in the dropdowns. Only Channel partners can use this group.
            if (id === this.administratorGroup) {
                return;
            }
            // Organize Built-In, LDAP, and Custom groups into smaller groups to combine later for the mult-select dropdown
            if (attributes && attributes === 'readonly') {
                builtInGroup.push({
                    id,
                    label: name,
                    tooltip: description,
                });
            } else if (type && type === 'ldap') {
                ldapGroup.push({
                    id,
                    label: name,
                    tooltip: description,
                });
            } else {
                customGroup.push({
                    id,
                    label: name,
                    tooltip: description,
                });
            }
        });

        // Used to insert the group title and horizontal divider for the mult-select dropdown
        if (customGroup.length > 0) {
            customGroup.sort(alphabeticalSort(this.locale, ({ label }) => label.toLowerCase()));
            customGroup.unshift({ id: 'title', label: customUserGroupText });
            customGroup.unshift({ id: 'horizontal', label: 'horizontal' });
        }
        if (ldapGroup.length > 0) {
            ldapGroup.sort(alphabeticalSort(this.locale, ({ label }) => label.toLowerCase()));
            ldapGroup.unshift({ id: 'title', label: ldapUserGroupText });
            ldapGroup.unshift({ id: 'horizontal', label: 'horizontal' });
        }
        // Combine Built-In, LDAP, and Custom groups
        this.groups = builtInGroup.concat(customGroup, ldapGroup);

        this.userGroups = userGroups;
        this.groupsToPermissions = groupsToPermissions;
    }

    getPermissionsFromUserGroups({ groupIds, permissions }: UserPerms): Set<string> {
        const initialPermissionSet = new Set<string>(
            permissions && permissions.includes('|') ? permissions.split('|') : [permissions],
        );
        // cloud owner currently has no userGroupIds, but instead has permissions set on the user object permissions field
        const calculatedPermissions = (groupIds || []).reduce(
            (perms, id) => new Set([...perms, ...this.groupsToPermissions[id]]),
            initialPermissionSet,
        );
        // sometimes a user can have 'NoGlobalPermissions' set in their permissions field
        // but have a userGroupId with permissions --> so removing in such cases (mainly Cloud Owner)
        calculatedPermissions.delete('NoGlobalPermissions');
        return calculatedPermissions;
    }

    override processUsers(usersWithGroups: NxUser[]): NxUser[] {
        if (!Array.isArray(usersWithGroups)) {
            return [];
        }
        /**
         * individual camera rights set by `resourceAccessRights` on the user object, but not implemented yet
         * need to get structure of data to build an estimate at least
         * **
         * how does parentGroupIds work? all rights that parent groups have, child groups have?
         * if so, is that parsed down in some way? all set into permissions & resourceAccessRights?
         * or do I need to iterate through and form my own set of master permissions?
         */
        this.users = usersWithGroups
            .map((user: NxUser) => {
                // if local user has no fullName, do we need to add name as fullName?
                // if (!user.fullName && user.name) {
                //     user.fullName = user.name;
                // }
                const permissionsSet = this.getPermissionsFromUserGroups(user);
                if (user.groupIds === undefined) {
                    user.groupIds = [];
                }
                user.permissions = this.normalizePermissionString(
                    [user.permissions, Array.from(permissionsSet).join('|')].join('|'),
                );
                // should we add a list of user group names?
                // user.userGroupNames = [];
                // allMediaPermissionFlag exists if the all camera permission option selected...this still true?
                user.isOwner = user.groupIds.includes(this.administratorGroup);
                user.isAdmin = user.isOwner || user.groupIds.includes(this.powerUserGroup);
                user.isCloudOwner = user.type === UserType.cloud && user.isOwner;
                user.isLocalOwner = user.type === UserType.local && user.isOwner;
                user.canBeEdited = this.canBeEdited(user);

                if (this.userId === user.id) {
                    this.currentUser = user;
                    // set userGroups for user?
                }
                return user;
            })
            .sort((userA, userB) => {
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

    protected override canBeEdited(user: NxUser): boolean {
        /**
         * User can not be edited if:
         * - this user is the current user
         * - this user is the local owner (local 'admin')
         * - this user is the cloud owner
         *
         * Furthermore, if the system is not mine and the user is an admin,
         *   they also can not be edited
         */
        return (
            !user.isOwner &&
            !user.attributes?.includes('readonly') &&
            (this.isMySystem || !user.isAdmin)
        );
    }

    addUser(user: AddUser): Promise<ChangedIdReturned> {
        const userData = {
            ...user,
            isEnabled: true,
            role: undefined,
            name: user.email,
        };

        return firstValueFrom(this.mediaserver.addUser(userData));
    }

    modifyUser(user: NxUser): Promise<NxUser> {
        let userCreated = false;
        const isSelf = user.id === this.currentUser?.id;
        if (isSelf && user.type === 'cloud') {
            return Promise.reject({ resultCode: 'cantAddYourOwnEmail' });
        }

        if (!user.id) {
            let existingUser: Partial<NxUser> = this.users.find(u => {
                return user.email === u.email;
            });
            if (!existingUser) {
                // user not found - create a new one
                userCreated = true;
                existingUser = this.mediaserver.userWithGroupsObject(user.fullName, user.email);
            }
            user = { ...existingUser, ...user };
        }

        if (!isSelf && !user.canBeEdited && !this.isMySystem) {
            return Promise.reject({ resultCode: 'cantEditAdmin' });
        }

        // The mediaserver doesn't like any attempts to change admin's permissions
        if (user.isLocalOwner) {
            delete user.name;
            delete user.permissions;
        }

        // v3 doesn't like user permissions and groupIds for modifyUser
        delete user.permissions;
        delete user.fullName;

        return lastValueFrom(
            this.mediaserver.modifyUser(this.cleanupUserObject(user), cleanId(user.id)),
        ).then((savedUser: NxUser) => {
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
        id,
        attributes,
        name,
        email,
        fullName,
        permissions,
        isEnabled,
        groupIds,
        type,
        resourceAccessRights,
    }: NxUser): RestV3User {
        return {
            id,
            attributes,
            name,
            email,
            fullName,
            permissions,
            isEnabled,
            groupIds,
            type,
            resourceAccessRights,
        };
    }
}
