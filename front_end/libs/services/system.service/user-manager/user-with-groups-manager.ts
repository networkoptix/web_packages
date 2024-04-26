import { firstValueFrom, lastValueFrom } from 'rxjs';

import staticLang from '@language_static';
import { AdminGroups } from '@libs/services/system.service/permission-manager/permission-manager';
import { nxConfig } from '@services/nx-config/config';
import { ChangedIdReturned } from '@services/system-api.types';
import { NxSystemRestAPI3 } from '@services/system-rest-api-v3.service';
import {
    AddUser,
    NxUser,
    RestV3User,
    SystemUser,
    UserGroup,
    UserGroupDropdown,
    UserType,
} from '@services/system-user.types';
import { DefaultUserGroupsToId } from '@services/system.service/user-manager/default-groups';
import { alphabeticalSort, cleanIdLegacy } from '@utils/general';

import { UserManager } from './user-manager';

interface IdToGroup {
    [id: string]: UserGroup;
}

export class UserWithGroupsManager extends UserManager {
    LANG = staticLang;

    protected override mediaserver: NxSystemRestAPI3;
    userGroups: IdToGroup = DefaultUserGroupsToId;
    private powerUserGroups = new Set<string>([AdminGroups.powerUserGroup]);
    protected override _ownerEmail: string;
    // isMySystem: boolean;
    override currentUser: NxUser;
    override currentUserEmail: string;
    override users: NxUser[];

    protected override CONFIG = nxConfig;

    constructor(mediaserver: NxSystemRestAPI3, currentUserEmail: string, userId: string) {
        super(mediaserver, currentUserEmail, userId);
        this.mediaserver = mediaserver;
        this.currentUserEmail = currentUserEmail;

        this._ownerEmail = '';
    }

    override get isMySystem(): boolean {
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

    override get ownerEmail(): string {
        return this._ownerEmail;
    }

    override set ownerEmail(email: string) {
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

    protected override isCloudOwner(user: SystemUser): boolean {
        return (
            'type' in user &&
            user.type === 'cloud' &&
            (('isOwner' in user && !!user.isOwner) || ('isAdmin' in user && !!user.isAdmin))
        );
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
        userGroups.forEach(group => {
            idToGroup[group.id] = group;
        });
        this.userGroups = idToGroup;
        try {
            userGroups.forEach(group => {
                this.buildPowerUserGroupsSet(group);
            });
        } catch (e) {
            if (e instanceof RangeError) {
                console.error('There is a cycle in the permission groups graph');
            }
        }
    }

    /**
     * Builds a set of power user groups.
     * Note: buildPowerUserGroupsSet works on several assumptions
     * 1) All power user groups must inherit the default AdminGroups.powerUserGroup at some point.
     * 2) If a group doesn't inherit from any groups and doesn't exist in powerUserGroups it's not a power user group.
     * This is true since the powerUserGroups set is initialized with AdminGroups.powerUserGroup.
     * 3) Every inherited group in group.parentGroupIds will be checked until one returns true. Once it does all of its child
     * groups will recursively be marked as true as we return back to the original caller.
     *
     * Ex: Group A -> Group B -> Group C -> Group B
     *                                  \-> Power User
     * Explanation
     * 1) Group A is passed in and powerUserGroups only has its default value.
     * 2) Group B A's parent is marked as visited and will be checked next.
     * 3) Group C B's parent is marked as visited and will be checked next.
     * 4) When checking Group C's parents we find B in visited, so we skip.
     * 5) Next we check Power User group which exists in powerUserGroups, so it returns true.
     * 6) We bubble back and Group C, Group B and Group A are added to the powerUserGroups set.
     *
     * @param {UserGroup} group - The user group to start building the power user groups set from.
     * @param {string[]} visited - An optional array that keeps track of visited group IDs to prevent infinite recursion. Defaults to an empty array.
     * @returns {boolean} - Returns true if the given group or any of its parent groups are power user groups, otherwise returns false.
     */
    private buildPowerUserGroupsSet(group: UserGroup, visited: string[] = []): boolean {
        if (this.powerUserGroups.has(group.id)) {
            return true;
        } else if (!group.parentGroupIds) {
            return false;
        }
        const isPuGroup = group.parentGroupIds.some(parentGroupId => {
            // If a parent has been visited the tree effectively ends here because if it were true the recursive call
            // would have killed this loop before this returns true. Now that we don't worry about rechecking the node
            // we can check other branches of the graph.
            if (visited.includes(parentGroupId)) {
                return false;
            }
            visited.push(parentGroupId);
            return this.buildPowerUserGroupsSet(this.userGroups[parentGroupId], visited);
        });
        if (isPuGroup) {
            this.powerUserGroups.add(group.id);
            return true;
        }
        return false;
    }

    isGroupPowerUser(group: Pick<UserGroup, 'id'>): boolean {
        return this.powerUserGroups.has(group.id);
    }

    private buildGroupsDropdown(): void {
        const { defaultUserGroupText, customUserGroupText, ldapUserGroupText } =
            this.LANG.dialogs.titles;
        const builtInGroup: UserGroupDropdown[] = [{ id: 'title', label: defaultUserGroupText }];
        const customGroup: UserGroupDropdown[] = [];
        const ldapGroup: UserGroupDropdown[] = [];
        Object.values(this.userGroups).forEach(({ id, name, description, attributes, type }) => {
            if (!description && attributes?.includes('readonly')) {
                this.userGroups[id].description = this.LANG.accessRoles[name].description || name;
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
        const sortByGroupName = alphabeticalSort<UserGroupDropdown>(({ label }) => label);

        // Used to insert the group title and horizontal divider for the mult-select dropdown
        if (customGroup.length > 0) {
            customGroup.sort(sortByGroupName);
            customGroup.unshift({ id: 'title', label: customUserGroupText });
            customGroup.unshift({ id: 'horizontal', label: 'horizontal' });
        }
        if (ldapGroup.length > 0) {
            const defaultLdapGroup = ldapGroup.shift();
            ldapGroup.sort(sortByGroupName);
            ldapGroup.unshift(defaultLdapGroup);
            ldapGroup.unshift({ id: 'title', label: ldapUserGroupText });
            ldapGroup.unshift({ id: 'horizontal', label: 'horizontal' });
        }
        // Combine Built-In, LDAP, and Custom groups
        this.groups = builtInGroup.concat(customGroup, ldapGroup);
        this.groups$$.set(this.groups);
    }

    override processUsers(usersWithGroups: NxUser[]): NxUser[] {
        if (!Array.isArray(usersWithGroups)) {
            return [];
        }
        // This is only true when you get users from clouddb.
        if (usersWithGroups?.[0].accessRole) {
            usersWithGroups = usersWithGroups.map(user => ({
                ...user,
                attributes: 'readonly',
                groupIds: [user.userRoleId],
                permissions: 'none',
                resourceAccessRights: {},
                type: 'cloud',
            })) as NxUser[];
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
            .filter(({ attributes }) => !attributes?.includes('hidden'))
            .map((user: NxUser) => {
                // if local user has no fullName, do we need to add name as fullName?
                // if (!user.fullName && user.name) {
                //     user.fullName = user.name;
                // }

                if (user.groupIds === undefined) {
                    user.groupIds = [];
                }

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
                user.hasCustomPermissions =
                    !['none', ''].includes(user.permissions) ||
                    Object.keys(user?.resourceAccessRights || {}).length > 0;

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
                        return userA.email.localeCompare(userB.email, navigator.language);
                    } else {
                        return userA.name.localeCompare(userB.name, navigator.language);
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

    override addUser(user: AddUser): Promise<ChangedIdReturned> {
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
            this.mediaserver.modifyUser(this.cleanupUserObject(user), cleanIdLegacy(user.id)),
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
        hasCustomPermissions,
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
            hasCustomPermissions,
        };
    }
}
