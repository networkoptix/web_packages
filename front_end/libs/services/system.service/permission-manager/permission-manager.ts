import { computed, signal } from '@angular/core';

import staticLang from '@language/language_i18n_static.json';
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
    RestV3User,
} from '@services/system-user.types';

import { coerceUserType } from '../../helpers/coerce-user-type';

const initializePermissions = (isOwner = false, isAdmin = false): Permissions => {
    isAdmin ||= isOwner;
    return {
        isAdmin,
        editAdmins: isOwner,
        editUsers: isAdmin,
        editCameras: isAdmin,
        exportArchives: isAdmin,
        generateEvents: isAdmin,
        manageBookmarks: isAdmin,
        systemHealth: isAdmin,
        view: true,
        viewArchives: isAdmin,
        viewBookmarks: isAdmin,
        viewLogs: isAdmin,
    };
};

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

const PermissionStringsV3 = {
    powerUser: 'powerUser',
    viewLogs: 'viewLogs',
    systemHealth: 'systemHealth',
    generateEvents: 'generateEvents',
    administrator: 'administrator',
};

const AdminGroups = {
    administratorGroup: '{00000000-0000-0000-0000-100000000000}',
    powerUserGroup: '{00000000-0000-0000-0000-100000000001}',
};

const ResourceFlags = {
    view: 'view',
    viewArchive: 'viewArchive',
    exportArchive: 'exportArchive',
    viewBookmarks: 'viewBookmarks',
    manageBookmarks: 'manageBookmarks',
    userInput: 'userInput',
    edit: 'edit',
};

const ResourceGroups = {
    devices: '{00000000-0000-0000-0000-200000000001}',
    servers: '{00000000-0000-0000-0000-200000000002}',
};

export class PermissionManager {
    private readonly LANG = staticLang;
    private user = signal<SystemUser>(undefined);
    private type = computed<string>(() => coerceUserType(this.user()));
    private permissionsFromGroups = computed<Permissions>(() => {
        const groups = this.groups();
        const user = this.user();

        if (!user) {
            return initializePermissions();
        }
        const aggregatedDeviceAccessRights = new Set<string>(); // Effectively camera related permissions
        const aggregatedPermissions = new Set<string>(); // New permissions for groups

        for (const groupId of (user as RestV3User).groupIds) {
            const group = groups.find(({ id }) => id === groupId);
            if (!group) {
                continue;
            }
            group.permissions
                ?.split('|')
                .forEach(permission => aggregatedPermissions.add(permission));
            group.resourceAccessRights?.[ResourceGroups.devices]
                ?.split('|')
                .forEach(permission => aggregatedDeviceAccessRights.add(permission));
        }
        const isOwner =
            this.isOwner() || aggregatedPermissions.has(PermissionStringsV3.administrator);
        const isAdmin =
            isOwner || this.isAdmin() || aggregatedPermissions.has(PermissionStringsV3.powerUser);

        (
            (user as RestV3User)?.resourceAccessRights?.[ResourceGroups.devices]?.split('|') || []
        ).forEach(permission => aggregatedDeviceAccessRights.add(permission));

        return Object.assign(initializePermissions(isOwner, isAdmin), {
            editCameras: isAdmin || aggregatedDeviceAccessRights.has(ResourceFlags.edit),
            exportArchive: isAdmin || aggregatedDeviceAccessRights.has(ResourceFlags.exportArchive),
            generateEvents:
                isAdmin || aggregatedPermissions.has(PermissionStringsV3.generateEvents),
            manageBookmarks:
                isAdmin || aggregatedDeviceAccessRights.has(ResourceFlags.manageBookmarks),
            systemHealth: isAdmin || aggregatedPermissions.has(PermissionStringsV3.systemHealth),
            view: isAdmin || aggregatedDeviceAccessRights.has(ResourceFlags.view),
            viewArchives: isAdmin || aggregatedDeviceAccessRights.has(ResourceFlags.viewArchive),
            viewBookmarks: isAdmin || aggregatedDeviceAccessRights.has(ResourceFlags.viewArchive),
            viewLogs: isAdmin || aggregatedPermissions.has(PermissionStringsV3.viewLogs),
        });
    });
    groups = signal<UserGroup[]>([]);
    roles = signal<Role[]>([]);
    currentUser = computed<CurrentUser>(() => {
        const user = this.user();
        if (!user) {
            return;
        }
        const groups = this.groups();
        const roles = this.roles();

        const isOwner = this.isOwner();
        const isAdmin = this.isAdmin();
        const permissions = this.permissions();
        const permissionsString = user.permissions.split('|').sort().join('|');

        let accessRole = '';
        if (this.mediaserver instanceof NxSystemRestAPI3) {
            accessRole = (user as RestV3User).groupIds
                .map(groupId => groups.find(({ id }) => groupId === id)?.name)
                .filter(role => !!role)
                .join(', ');
        } else if (roles) {
            accessRole =
                roles.find(
                    role =>
                        'isOwner' in role &&
                        role.isOwner === isOwner &&
                        role.permissions === permissionsString,
                )?.name || '';
        }

        if (!accessRole) {
            accessRole = this.LANG.accessRoles.none.label;
        }

        return {
            ...user,
            accessRole,
            isAdmin,
            isOwner,
            permissions,
            groupIds: (user && 'groupIds' in user && user?.groupIds) || [], // TODO: use this
            resourceAccessRights:
                (user && 'resourceAccessRights' in user && user?.resourceAccessRights) || {}, // TODO: use this
        };
    });
    ownerEmail = signal<string>(undefined);
    isAdmin = computed<boolean>(() => {
        const user = this.user();
        const isOwner = this.isOwner();
        if (!user) {
            return false;
        }
        return (
            isOwner ||
            user.permissions.includes(PermissionStrings.globalAdminPermissionFlag) ||
            ('groupIds' in user && user.groupIds.includes(AdminGroups.powerUserGroup))
        );
    });
    isCloud = computed<boolean>(() => this.type() === UserType.cloud);
    isLdap = computed<boolean>(() => this.type() === UserType.ldap);
    isLocal = computed<boolean>(() => this.type() === UserType.local);
    isOwner = computed<boolean>(() => {
        const user = this.user();
        if (!user) {
            return false;
        }
        const ownerEmail = this.ownerEmail();
        return (
            (ownerEmail && ownerEmail === user?.email) ||
            ('isOwner' in user && user.isOwner) ||
            ('groupIds' in user && user.groupIds.includes(AdminGroups.administratorGroup))
        );
    });
    permissions = computed<Permissions>(() => {
        const isOwner = this.isOwner();
        const isAdmin = isOwner || this.isAdmin();
        const groups = this.groups();
        if (groups.length) {
            return this.permissionsFromGroups();
        }
        const permissions = this.user()?.permissions || '';
        return Object.assign(initializePermissions(isOwner, isAdmin), {
            editUsers: isAdmin || permissions.includes(PermissionStrings.editUserPermissionFlag),
            editCameras:
                isAdmin || permissions.includes(PermissionStrings.editCameraPermissionFlag),
            exportArchives: isAdmin || permissions.includes(PermissionStrings.exportPermissionFlag),
            generateEvents: isAdmin,
            manageBookmarks: isAdmin,
            systemHealth: isAdmin,
            viewArchives:
                isAdmin || permissions.includes(PermissionStrings.viewArchivesPermissionFlag),
            viewBookmarks:
                isAdmin || permissions.includes(PermissionStrings.globalViewBookmarksPermission),
            viewLogs: isAdmin,
        });
    });

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
