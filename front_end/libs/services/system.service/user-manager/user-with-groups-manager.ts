import { LOCALE_ID } from '@angular/core';
import { firstValueFrom, lastValueFrom } from 'rxjs';

import staticLang from '@language_static';
import { AdminGroups } from '@libs/services/system.service/permission-manager/permission-manager';
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

interface GroupIdToPermissions {
    [id: string]: Set<string>;
}

interface IdToGroup {
    [id: string]: UserGroup;
}

export class UserWithGroupsManager extends UserManager {
    LANG = staticLang;

    protected mediaserver: NxSystemRestAPI3;
    userGroups: IdToGroup;
    protected groupsToPermissions: GroupIdToPermissions;
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
            // Converts userGroups to a map and makes a shortcut for permissions.
            this.processGroups(userGroups);
            const rawUsers: NxUser[] = await lastValueFrom(this.mediaserver.getUsers());
            const users: NxUser[] = this.processUsers(rawUsers);
            // Creates the dropdowns for add user dialog and edit user page.
            this.buildGroupsDropdown();
            return Promise.resolve(users);
        } catch (err) {
            return Promise.reject('Media server cloud not be reached.');
        }
    }

    processGroups(userGroups: UserGroup[]): void {
        const idToGroup: IdToGroup = {};
        const groupIdToPermissions: GroupIdToPermissions = {};
        userGroups.forEach(group => {
            idToGroup[group.id] = group;
            groupIdToPermissions[group.id] = new Set(group.permissions?.split('|') ?? '');
        });
        this.userGroups = idToGroup;
        this.groupsToPermissions = groupIdToPermissions;
    }

    private isGroupPowerUser(group: UserGroup): boolean {
        if (group.id.includes(AdminGroups.powerUserGroup)) {
            return true;
        } else if (!group.parentGroupIds) {
            return false;
        } else if (group.parentGroupIds.includes(AdminGroups.powerUserGroup)) {
            return true;
        }
        return group.parentGroupIds.some(parentGroup =>
            this.isGroupPowerUser(this.userGroups[parentGroup]),
        );
    }

    private buildGroupsDropdown(): void {
        const { defaultUserGroupText, customUserGroupText, ldapUserGroupText } =
            this.LANG.dialogs.titles;
        const builtInGroup: UserGroupDropdown[] = [{ id: 'title', label: defaultUserGroupText }];
        const customGroup: UserGroupDropdown[] = [];
        const ldapGroup: UserGroupDropdown[] = [];
        const currentUserIsOwner = this.currentUser.isOwner;
        Object.values(this.userGroups)
            .filter(group => currentUserIsOwner || !this.isGroupPowerUser(group)) // Remove all power user groups if user isn't owner;
            .forEach(({ id, name, description, attributes, type }) => {
                if (!description && attributes?.includes('readonly')) {
                    this.userGroups[id].description =
                        this.LANG.accessRoles[name].description || name;
                }
                // Do not allow Administrator to be in the dropdowns. Only Channel partners can use this group.
                if (id === AdminGroups.administratorGroup) {
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
            const defaultLdapGroup = ldapGroup.shift();
            ldapGroup.sort(alphabeticalSort(this.locale, ({ label }) => label.toLowerCase()));
            ldapGroup.unshift(defaultLdapGroup);
            ldapGroup.unshift({ id: 'title', label: ldapUserGroupText });
            ldapGroup.unshift({ id: 'horizontal', label: 'horizontal' });
        }
        // Combine Built-In, LDAP, and Custom groups
        this.groups = builtInGroup.concat(customGroup, ldapGroup);
        this.groups$$.set(this.groups);
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
                user.isOwner = user.groupIds.includes(AdminGroups.administratorGroup);
                user.isAdmin =
                    user.isOwner ||
                    user.groupIds.some(groupId => this.isGroupPowerUser(this.userGroups[groupId]));
                user.isCloudOwner = user.type === UserType.cloud && user.isOwner;
                user.isLocalOwner = user.type === UserType.local && user.isOwner;
                user.canBeEdited = this.canBeEdited(user);

                if (
                    this.userId === user.id ||
                    (user.type === UserType.cloud && this.currentUserEmail === user.email)
                ) {
                    this.currentUser = user;
                    // set userGroups for user?
                }
                return user;
            })
            .sort((userA, userB) => {
                // seems to error when > 5.1 system is offline, type field does not exist
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
        }

        // v3 doesn't like user permissions for modifyUser
        // previously v3 also didn't like modifying groupIds + fullName together, but this no longer
        // seems to be an issue as of 6.0.0.37561
        delete user.permissions;

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
