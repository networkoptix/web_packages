import { computed, Signal, signal, WritableSignal } from '@angular/core';

import { NxSystemAPI } from '@services/system-legacy-api.service';
import { NxSystemRestAPI2 } from '@services/system-rest-api-v2.service';
import { NxSystemRestAPI3 } from '@services/system-rest-api-v3.service';
import { NxSystemRestAPI } from '@services/system-rest-api.service';
import {
    SystemUser,
    CurrentUser,
    Permissions,
    Role,
    UserGroup,
    UserType,
} from '@services/system-user.types';

import { coerceUserType } from '../../helpers/coerce-user-type';

const PermissionStrings = {
    editUserPermissionFlag: 'GlobalAdminPermission',
    editCameraPermissionFlag: 'GlobalEditCamerasPermission',
    exportPermissionFlag: 'GlobalExportPermission',
    globalAdminPermissionFlag: 'GlobalAdminPermission',
    globalCustomUserPermission: 'GlobalCustomUserPermission',
    globalViewBookmarksPermission: 'GlobalViewBookmarksPermission',
    allMediaPermissionFlag: 'GlobalAccessAllMediaPermission',
    viewArchivesPermissionFlag: 'GlobalViewArchivePermission',
};

const AdminGroups = {
    administratorGroup: '{00000000-0000-0000-0000-100000000000}',
    powerUserGroup: '{00000000-0000-0000-0000-100000000001}',
};

export class PermissionManager {
    private user: WritableSignal<SystemUser> = signal(undefined);
    private type = computed(() => coerceUserType(this.user()));
    groups: WritableSignal<UserGroup[]> = signal([]);
    roles: WritableSignal<Role[]> = signal([]);
    currentUser: Signal<CurrentUser> = computed(() => {
        const user = this.user();
        if (!user) {
            return;
        }
        const groups = this.groups();
        const roles = this.roles();

        const isOwner = this.isOwner();
        const isAdmin = this.isAdmin();
        const permissions = this.permissions();
        const permissionsString = this.permissionsString().join('|');

        let accessRole = '';
        if (this.mediaserver instanceof NxSystemRestAPI3) {
            if ('groupIds' in user) {
                accessRole = user.groupIds
                    .map(groupId => groups.find(({ id }) => groupId === id)?.name)
                    .filter(role => !!role)
                    .join(', ');
            }
        } else if (roles) {
            accessRole =
                roles.find(
                    role =>
                        'isOwner' in role &&
                        role.isOwner === isOwner &&
                        role.permissions === permissionsString,
                )?.name || '';
        }

        return {
            ...user,
            accessRole,
            isAdmin,
            isOwner,
            permissions,
            permissionsString,
            groupIds: (user && 'groupIds' in user && user?.groupIds) || [], // TODO: use this
            resourceAccessRights:
                (user && 'resourceAccessRights' in user && user?.resourceAccessRights) || {}, // TODO: use this
        };
    });
    ownerEmail: WritableSignal<string> = signal('');
    isAdmin: Signal<boolean> = computed(() => {
        const user = this.user();
        const isOwner = this.isOwner();
        const permissionsString = this.permissionsString();
        if (!user) {
            return false;
        }
        return (
            isOwner ||
            permissionsString.includes(PermissionStrings.globalAdminPermissionFlag) ||
            ('groupIds' in user && user.groupIds.includes(AdminGroups.powerUserGroup))
        );
    });
    isCloud = computed(() => this.type() === UserType.cloud);
    isLdap = computed(() => this.type() === UserType.ldap);
    isLocal = computed(() => this.type() === UserType.local);
    isOwner: Signal<boolean> = computed(() => {
        const user = this.user();
        if (!user) {
            return false;
        }
        return (
            this.ownerEmail() === user?.email ||
            ('isOwner' in user && user.isOwner) ||
            ('groupIds' in user && user.groupIds.includes(AdminGroups.administratorGroup))
        );
    });
    permissions: Signal<Permissions> = computed(() => {
        const isOwner = this.isOwner();
        const isAdmin = isOwner || this.isAdmin();
        const permissions = this.permissionsString();
        return {
            isAdmin,
            editAdmins: isOwner,
            editUsers: isAdmin || permissions.includes(PermissionStrings.editUserPermissionFlag),
            editCameras:
                isAdmin || permissions.includes(PermissionStrings.editCameraPermissionFlag),
            exportArchives: isAdmin || permissions.includes(PermissionStrings.exportPermissionFlag),
            viewArchives:
                isAdmin || permissions.includes(PermissionStrings.viewArchivesPermissionFlag),
            viewBookmarks:
                isAdmin || permissions.includes(PermissionStrings.globalViewBookmarksPermission),
        };
    });
    permissionsString: Signal<string[]> = computed(() =>
        (this.user()?.permissions || '').split('|').sort(),
    );

    constructor(
        protected mediaserver: NxSystemAPI | NxSystemRestAPI | NxSystemRestAPI2 | NxSystemRestAPI3,
    ) {
        this.checkCurrentUser().catch();
    }

    async checkCurrentUser(): Promise<void> {
        const user = await this.mediaserver.getCurrentUser(true);
        this.user.set(user);
        if (this.mediaserver instanceof NxSystemRestAPI3) {
            this.mediaserver.getUserGroups().subscribe(userGroups => this.groups.set(userGroups));
        }
        this.mediaserver.getAllRoles().subscribe(roles => {
            this.roles.set(
                roles.map(role => {
                    role.permissions = role.permissions.split('|').sort().join('|');
                    return role;
                }),
            );
        });
    }
}
