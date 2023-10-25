import { computed, signal } from '@angular/core';

import staticLang from '@language/language_i18n_static.json';
import { NxCloudApiService } from '@services/nx-cloud-api';
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
        view: isAdmin,
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

const ResourceFlags = {
    view: 'view',
    viewArchive: 'viewArchive',
    exportArchive: 'exportArchive',
    viewBookmarks: 'viewBookmarks',
    manageBookmarks: 'manageBookmarks',
    userInput: 'userInput',
    edit: 'edit',
};

export const AdminGroups = {
    administratorGroup: '{00000000-0000-0000-0000-100000000000}',
    powerUserGroup: '{00000000-0000-0000-0000-100000000001}',
};

export class PermissionManager {
    private readonly LANG = staticLang;
    private user$$ = signal<SystemUser>(undefined);
    private currentUserPermissions$$ = signal<string>('');
    private currentUserResourceRights$$ = signal<string>('');
    private type$$ = computed<string>(() => coerceUserType(this.user$$()));
    private permissionsFromGroups$$ = computed<Permissions>(() => {
        const user = this.user$$();
        const aggregatedPermissions = this.currentUserPermissions$$(); // New permissions for groups
        const aggregatedDeviceAccessRights = this.currentUserResourceRights$$();

        if (!user) {
            return initializePermissions();
        }

        const isOwner =
            this.isOwner$$() || aggregatedPermissions.includes(PermissionStringsV3.administrator);
        const isAdmin =
            isOwner ||
            this.isAdmin$$() ||
            aggregatedPermissions.includes(PermissionStringsV3.powerUser);
        return Object.assign(initializePermissions(isOwner, isAdmin), {
            editCameras: isAdmin || aggregatedDeviceAccessRights.includes(ResourceFlags.edit),
            exportArchive:
                isAdmin || aggregatedDeviceAccessRights.includes(ResourceFlags.exportArchive),
            generateEvents:
                isAdmin || aggregatedPermissions.includes(PermissionStringsV3.generateEvents),
            manageBookmarks:
                isAdmin || aggregatedDeviceAccessRights.includes(ResourceFlags.manageBookmarks),
            systemHealth:
                isAdmin || aggregatedPermissions.includes(PermissionStringsV3.systemHealth),
            view: isAdmin || aggregatedDeviceAccessRights.includes(ResourceFlags.view),
            viewArchives:
                isAdmin || aggregatedDeviceAccessRights.includes(ResourceFlags.viewArchive),
            viewBookmarks:
                isAdmin || aggregatedDeviceAccessRights.includes(ResourceFlags.viewArchive),
            viewLogs: isAdmin || aggregatedPermissions.includes(PermissionStringsV3.viewLogs),
        });
    });
    groups$$ = signal<UserGroup[]>([]);
    roles$$ = signal<Role[]>([]);
    currentUser$$ = computed<CurrentUser>(() => {
        const user = this.user$$();
        if (!user) {
            return;
        }
        const groups = this.groups$$();
        const roles = this.roles$$();

        const isOwner = this.isOwner$$();
        const isAdmin = this.isAdmin$$();
        const permissions = this.permissions$$();
        const permissionsString = user.permissions.split('|').sort().join('|');

        let accessRole = '';
        if (this.mediaserver instanceof NxSystemRestAPI3 && (user as RestV3User).groupIds) {
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
            accessRole = this.LANG.accessRoles.custom.label;
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
    ownerEmail$$ = signal<string>(undefined);
    isAdmin$$ = computed<boolean>(() => {
        const user = this.user$$();
        const isOwner = this.isOwner$$();
        const permissions = this.currentUserPermissions$$();
        if (!user) {
            return false;
        }
        return (
            isOwner ||
            user.permissions.includes(PermissionStrings.globalAdminPermissionFlag) ||
            ('groupIds' in user && user.groupIds.includes(AdminGroups.powerUserGroup)) ||
            permissions.includes(PermissionStringsV3.powerUser)
        );
    });
    isCloud$$ = computed<boolean>(() => this.type$$() === UserType.cloud);
    isLdap$$ = computed<boolean>(() => this.type$$() === UserType.ldap);
    isTemporaryLocal$$ = computed<boolean>(() => this.type$$() === UserType.temporaryLocal);
    isLocal$$ = computed<boolean>(
        () => this.type$$() === UserType.local || this.isTemporaryLocal$$(),
    );
    isOwner$$ = computed<boolean>(() => {
        const user = this.user$$();
        if (!user) {
            return false;
        }
        const ownerEmail = this.ownerEmail$$();
        return (
            (ownerEmail && ownerEmail === user?.email) ||
            ('isOwner' in user && user.isOwner) ||
            ('groupIds' in user && user.groupIds.includes(AdminGroups.administratorGroup))
        );
    });
    permissions$$ = computed<Permissions>(() => {
        const isOwner = this.isOwner$$();
        const isAdmin = isOwner || this.isAdmin$$();
        const groups = this.groups$$();
        if (groups.length) {
            return this.permissionsFromGroups$$();
        }
        const permissions = this.user$$()?.permissions || '';
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
        private systemId: string,
        private currentUserEmail: string,
        private cloudApi: NxCloudApiService,
        protected mediaserver: NxSystemAPI | NxSystemRestAPI | NxSystemRestAPI2 | NxSystemRestAPI3,
    ) {
        this.checkCurrentUser().catch(() => this.getCurrentUserFromCloud());
    }

    async getCurrentUserFromCloud(): Promise<void> {
        this.cloudApi.users(this.systemId).subscribe(users => {
            const user = users.find(({ accountEmail }) => accountEmail === this.currentUserEmail);
            if (user) {
                this.user$$.set({
                    ...user,
                    name: user.accountEmail,
                    email: user.accountEmail,
                    permissions: user.customPermissions,
                    isCloud: true,
                    isLdap: false,
                    id: user.vmsUserId,
                    fullName: user.accountFullName,
                    groupIds: [],
                });
            }
        });
    }

    async checkCurrentUser(): Promise<void> {
        const user = await this.mediaserver.getCurrentUser(true);
        if (user) {
            this.user$$.set(user);
        } else {
            return Promise.reject();
        }
        if (this.mediaserver instanceof NxSystemRestAPI3) {
            this.mediaserver.getUserGroups().subscribe(userGroups => this.groups$$.set(userGroups));
            this.mediaserver.getCurrentUserPermissions().subscribe(data => {
                this.currentUserPermissions$$.set(data?.permissions || '');
                if (data.resourceAccessRights) {
                    const resources = new Set<string>();
                    Object.values(data.resourceAccessRights).forEach(permissions => {
                        permissions.split('|').forEach(resources.add, resources);
                    });
                    this.currentUserResourceRights$$.set(Array.from(resources).join('|'));
                }
            });
        }
        this.mediaserver.getAllRoles().subscribe(roles => {
            this.roles$$.set(
                roles.map(role => {
                    role.permissions = role.permissions?.split('|').sort().join('|');
                    return role;
                }),
            );
        });
    }
}
