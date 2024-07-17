import { Injector, computed, runInInjectionContext, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { identity } from 'lodash-es';
import { Observable, firstValueFrom } from 'rxjs';
import { filter, map, take, timeout } from 'rxjs/operators';

import { environment } from '@environments/environment';
import staticLang from '@language/language_i18n_static.json';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { nxConfig } from '@services/nx-config/config';
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
    CloudUserCompat,
} from '@services/system-user.types';
import { DefaultUserGroups } from '@services/system.service/user-manager/default-groups';
import { cleanId, cleanIdLegacy } from '@utils/general';

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
        viewServices: isAdmin,
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
    viewMetrics: 'viewMetrics',
    generateEvents: 'generateEvents',
    administrator: 'administrator',
};

const LegacyDefaultRoleId = '{00000000-0000-0000-0000-000000000000}';

export const AdminGroups = {
    administratorGroup: '{00000000-0000-0000-0000-100000000000}',
    powerUserGroup: '{00000000-0000-0000-0000-100000000001}',
};

// The API returns a user's resourceAccessRights for each resource group or resource that the user has access to.
// These are the IDs for the 4 possible resource groups. If a user has permissions for a resource group, those permissions
// apply to all resources of that type (eg, if a user has view permissions for the "devices" resource group,
// they can view all devices in the system)
const ResourceGroups = {
    devices: '00000000-0000-0000-0000-200000000001',
    servers: '00000000-0000-0000-0000-200000000002',
    webPages: '00000000-0000-0000-0000-200000000003',
    videoWalls: '00000000-0000-0000-0000-200000000004',
};

type ResourceOrResourceGroupId = string;
interface AccessRightsForResource {
    view: boolean;
    viewArchive: boolean;
    exportArchive: boolean;
    viewBookmarks: boolean;
    manageBookmarks: boolean;
    userInput: boolean; // this is currently unused
    edit: boolean;
}
type ResourceAccessRights = Record<ResourceOrResourceGroupId, AccessRightsForResource>;

const initializeAccessRights = (): AccessRightsForResource => ({
    view: false,
    viewArchive: false,
    exportArchive: false,
    viewBookmarks: false,
    manageBookmarks: false,
    userInput: false,
    edit: false,
});

export class PermissionManager {
    private readonly LANG = staticLang;
    private user$$ = signal<SystemUser | undefined>(undefined);
    private currentUserPermissions$$ = signal<string>('');
    private type$$ = computed<string>(() => {
        const user = this.user$$();
        if (!user) {
            return '';
        }
        return coerceUserType(user);
    });
    private permissionsFromGroups$$ = computed<Permissions>(() => {
        const user = this.user$$();
        const aggregatedPermissions = this.currentUserPermissions$$(); // New permissions for groups
        const deviceGroupAccessRights =
            this.resourceAccessRights$$()[ResourceGroups.devices] || initializeAccessRights();

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
            editCameras: isAdmin || deviceGroupAccessRights.edit,
            exportArchives: isAdmin || deviceGroupAccessRights.exportArchive,
            generateEvents:
                isAdmin || aggregatedPermissions.includes(PermissionStringsV3.generateEvents),
            manageBookmarks: isAdmin || deviceGroupAccessRights.manageBookmarks,
            systemHealth:
                isAdmin || aggregatedPermissions.includes(PermissionStringsV3.viewMetrics),
            view: isAdmin || deviceGroupAccessRights.view,
            viewArchives: isAdmin || deviceGroupAccessRights.viewArchive,
            viewBookmarks: isAdmin || deviceGroupAccessRights.viewBookmarks,
            viewLogs: isAdmin || aggregatedPermissions.includes(PermissionStringsV3.viewLogs),
            viewServices:
                nxConfig.featureFlags.channelPartnersChangeServicesUI &&
                (isAdmin || aggregatedPermissions.includes(PermissionStringsV3.viewMetrics)),
        });
    });
    private userResourceAccessRights$$ = signal<ResourceAccessRights>({});
    resourceAccessRights$$ = computed<ResourceAccessRights>(() => {
        const resourceAccessRights = this.userResourceAccessRights$$();
        const customRole = this.customRole$$();
        if (customRole && 'accessibleResources' in customRole) {
            return Object.fromEntries(
                customRole.accessibleResources.map(id => [
                    cleanId(id),
                    this.convertAccessRightsStringToObj('view'),
                ]),
            );
        }
        return resourceAccessRights;
    });
    groups$$ = signal<UserGroup[]>(DefaultUserGroups);
    roles$$ = signal<Role[]>([]);
    customRole$$ = computed<Role | undefined>(() => {
        const roles = this.roles$$();
        const user = this.user$$();
        if (!user || !roles) {
            return undefined;
        }
        const userRoleId = (user && 'userRoleId' in user && user.userRoleId) || '';
        if (!userRoleId) {
            return undefined;
        }
        return roles.find(role => 'id' in role && role.id === userRoleId);
    });
    currentUser$$ = computed<CurrentUser | undefined>(() => {
        const user = this.user$$();
        if (!user) {
            return;
        }

        const isOwner = this.isOwner$$();
        const isAdmin = this.isAdmin$$();
        const permissions = this.permissions$$();
        const accessRole = this.accessRole$$();
        const accessRights = user && 'resourceAccessRights' in user && user?.resourceAccessRights;

        return {
            ...user,
            accessRole,
            isAdmin,
            isOwner,
            permissions,
            groupIds: (user && 'groupIds' in user && user?.groupIds) || [], // TODO: use this
            resourceAccessRights: accessRights || {}, // TODO: use this
            hasCustomPermissions:
                user.permissions !== 'none' || Object.keys(accessRights).length > 0,
        };
    });
    ownerEmail$$ = signal<string | undefined>(undefined);
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
            permissions.includes(PermissionStringsV3.powerUser) ||
            ['owner', 'admin', 'cloudAdmin'].includes(this.accessRole$$())
        );
    });
    isCloud$$ = computed<boolean>(() => this.type$$() === UserType.cloud);
    isLdap$$ = computed<boolean>(() => this.type$$() === UserType.ldap);
    isTemporaryLocal$$ = computed<boolean>(() => this.type$$() === UserType.temporaryLocal);
    isLocal$$ = computed<boolean>(
        () => this.type$$() === UserType.local || this.isTemporaryLocal$$(),
    );
    private checkIsOwner = (
        user: SystemUser | undefined,
        ownerEmail: string | undefined,
    ): boolean => {
        if (!user) {
            return false;
        }
        return (
            (ownerEmail && ownerEmail === user?.email) ||
            ('isOwner' in user && user.isOwner) ||
            ('groupIds' in user && user.groupIds.includes(AdminGroups.administratorGroup))
        );
    };
    isOwner$$ = computed<boolean>(() => {
        const user = this.user$$();
        const ownerEmail = this.ownerEmail$$();
        const accessRole = this.accessRole$$();
        if (!user && !ownerEmail) {
            return false;
        }
        return (
            this.checkIsOwner(user, ownerEmail) ||
            ['owner', DefaultUserGroups[0].name].includes(accessRole) // DefaultUserGroups[0] is the administrator group.
        );
    });
    accessRole$$ = computed<string>(() => {
        const user = this.user$$();
        const customRole = this.customRole$$();
        const resourceAccessRights = this.resourceAccessRights$$();
        const groups = this.groups$$();
        const roles = this.roles$$();
        const ownerEmail = this.ownerEmail$$() || '';
        const isOwner = this.checkIsOwner(user, ownerEmail);

        if (!user) {
            return '';
        }
        let accessRole = '';

        if (this.mediaserver instanceof NxSystemRestAPI3 && (user as RestV3User).groupIds.length) {
            accessRole = (user as RestV3User).groupIds
                .map(groupId => groups.find(({ id }) => groupId === id)?.name)
                .filter(role => !!role)
                .join(', ');
        } else if (roles.length) {
            accessRole =
                roles.find(
                    role =>
                        'isOwner' in role &&
                        role.isOwner === isOwner &&
                        role.permissions === user.permissions,
                )?.name ||
                customRole?.name ||
                '';
        } else if (!environment.isLocal) {
            // If roles is empty that means we couldn't fetch them from the system.
            // As a fallback for cloud we can try to get the accessRole from cdb.
            accessRole = (user as CloudUserCompat).accessRole;
        }

        if (accessRole) {
            return accessRole;
        }

        return Object.keys(resourceAccessRights).length
            ? this.LANG.accessRoles.custom.label
            : this.LANG.accessRoles.none.label;
    });
    permissions$$ = computed<Permissions>(() => {
        const isOwner = this.isOwner$$();
        const isAdmin = isOwner || this.isAdmin$$();
        const user = this.user$$();
        const customRole = this.customRole$$();
        const resourceAccessRights = this.resourceAccessRights$$();
        if (this.mediaserver instanceof NxSystemRestAPI3) {
            return this.permissionsFromGroups$$();
        }
        let permissions = '';
        // For support when a user has a custom user role.
        const roleId = (customRole && 'id' in customRole && customRole.id) || '';
        if (roleId && roleId !== LegacyDefaultRoleId) {
            if (Object.keys(resourceAccessRights)?.length) {
                permissions = PermissionStrings.allMediaPermissionFlag;
            }

            if (customRole?.permissions) {
                permissions = permissions
                    ? `${permissions}|${customRole.permissions}`
                    : customRole.permissions;
            }
        } else {
            permissions = user?.permissions || '';
        }

        return Object.assign(initializePermissions(isOwner, isAdmin), {
            editUsers: isAdmin || permissions.includes(PermissionStrings.editUserPermissionFlag),
            editCameras:
                isAdmin || permissions.includes(PermissionStrings.editCameraPermissionFlag),
            exportArchives: isAdmin || permissions.includes(PermissionStrings.exportPermissionFlag),
            generateEvents: isAdmin,
            manageBookmarks: isAdmin,
            systemHealth: isAdmin,
            view: isAdmin || permissions.includes(PermissionStrings.allMediaPermissionFlag),
            viewArchives:
                isAdmin || permissions.includes(PermissionStrings.viewArchivesPermissionFlag),
            viewBookmarks:
                isAdmin || permissions.includes(PermissionStrings.globalViewBookmarksPermission),
            viewLogs: isAdmin,
            viewServices: false, // Sass only so its only visible with user groups starting with 6.0
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
        try {
            const user = await firstValueFrom(
                this.cloudApi
                    .users(this.systemId, this.mediaserver.version > 5.1)
                    .pipe(
                        map(users =>
                            users.find(
                                ({ accountEmail }) => accountEmail === this.currentUserEmail,
                            ),
                        ),
                    ),
            );
            if (user) {
                const { permissions } = user || {};
                this.user$$.set({
                    ...user,
                    name: user.accountEmail,
                    email: user.accountEmail,
                    permissions: (permissions || '').split('|').sort().join('|'),
                    isCloud: true,
                    isLdap: false,
                    id: user.vmsUserId,
                    fullName: user.accountFullName,
                });
            }
        } catch {
            const [systemInfo] = await firstValueFrom(this.cloudApi.systems(this.systemId));
            this.user$$.set({
                accessRole: systemInfo.accessRole,
                email: this.currentUserEmail,
                fullName: '',
                id: '',
                isEnabled: true,
                isCloud: true,
                name: '',
                permissions: '',
                type: 'cloud',
                attributes: '',
                groupIds: [],
                resourceAccessRights: {},
                hasCustomPermissions: false,
            });
        }
    }

    async checkCurrentUser(): Promise<void> {
        if (this.mediaserver.version === 0) {
            await this.mediaserver.unauthorizedCallback(false);
        }
        const user = await this.mediaserver.getCurrentUser(true);
        if (user) {
            user.permissions = (user.permissions || '').split('|').sort().join('|');
            this.user$$.set(user);
            // Pre 6.0 systems use accessibleResources to effectively give the 'view' permission to the resourceId.
            // 6.0 has groups and resourceAccessRights so we skip this for them.
            if ('accessibleResources' in user && user.accessibleResources) {
                const _resourceAccessRights: ResourceAccessRights = Object.fromEntries(
                    user.accessibleResources.map(id => [
                        cleanId(id),
                        this.convertAccessRightsStringToObj('view'),
                    ]),
                );
                this.userResourceAccessRights$$.set(_resourceAccessRights);
            }
        } else {
            return Promise.reject();
        }
        if (this.mediaserver instanceof NxSystemRestAPI3) {
            this.mediaserver.getUserGroups().subscribe(userGroups => this.groups$$.set(userGroups));
            this.mediaserver.getCurrentUserPermissions().subscribe(data => {
                this.currentUserPermissions$$.set(data?.permissions || '');
                if (data.resourceAccessRights) {
                    // convert resourceAccessRights from the pipe-separated string returned by the API
                    // (e.g., "view|viewArchive|exportArchive")
                    // to an object with booleans
                    // (e.g., { view: true, viewArchive: true, exportArchive: true, viewBookmarks: false, ... })
                    const _resourceAccessRights: ResourceAccessRights = Object.fromEntries(
                        Object.entries(data.resourceAccessRights).map(
                            ([resourceOrResourceGroupId, accessRights]) => [
                                cleanIdLegacy(resourceOrResourceGroupId),
                                this.convertAccessRightsStringToObj(accessRights),
                            ],
                        ),
                    );
                    this.userResourceAccessRights$$.set(_resourceAccessRights);
                }
            });
        } else {
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

    private convertAccessRightsStringToObj(accessRightsString: string): AccessRightsForResource {
        const accessRightsObj = initializeAccessRights();
        accessRightsString.split('|').forEach(accessRight => {
            accessRightsObj[accessRight] = true;
        });
        return accessRightsObj;
    }

    /**
     * Returns an observable that emits the currentUser after permissions have been resolved.
     *
     * The timeout is set to 10 seconds for webadmin and 5 seconds for cloud portal.
     *
     * On cloud portal we fallback to getting the user from the cloud if the currentUser is not resolved in time.
     *
     * This is done because there are weird cases where /rest/v1/login/sessions could potentially take a really
     * long time to respond.
     *
     * @param injector - The injector to use for the context. This is required to convert the signal to an observable
     * @returns currentUser - The currentUser after permissions have been resolved
     */
    public permissionsInitialized = (injector: Injector): Observable<CurrentUser | undefined> =>
        runInInjectionContext(injector, () => toObservable(this.currentUser$$)).pipe(
            filter(user => {
                if (user) {
                    return (
                        Object.values(user.permissions).some(identity) ||
                        ('resourceAccessRights' in user &&
                            Object.values(user.resourceAccessRights).some(identity))
                    );
                }
                return false;
            }),
            timeout({
                first: environment.isLocal ? 10_000 : 5_000,
                with: async () => {
                    const currentUser = this.currentUser$$();
                    if (environment.isLocal || currentUser) {
                        return currentUser;
                    }
                    await this.getCurrentUserFromCloud();
                    return this.currentUser$$();
                },
            }),
            take(1),
        );

    canViewDevice = (deviceId: string): boolean =>
        this.permissions$$().view ||
        this.resourceAccessRights$$()[deviceId]?.view ||
        this.mediaserver.version === 0; // Due to how the legacy api works we just need to fetch the cameras and hope

    canViewDeviceArchive = (deviceId: string): boolean =>
        this.permissions$$().viewArchives || this.resourceAccessRights$$()[deviceId]?.viewArchive;

    canExportDeviceArchive = (deviceId: string): boolean =>
        this.permissions$$().exportArchives ||
        this.resourceAccessRights$$()[deviceId]?.exportArchive;

    canViewDeviceBookmarks = (deviceId: string): boolean =>
        this.permissions$$().viewBookmarks ||
        this.resourceAccessRights$$()[deviceId]?.viewBookmarks;

    canManageDeviceBookmarks = (deviceId: string): boolean =>
        this.permissions$$().manageBookmarks ||
        this.resourceAccessRights$$()[deviceId]?.manageBookmarks;

    canEditDevice = (deviceId: string): boolean =>
        this.permissions$$().editCameras || this.resourceAccessRights$$()[deviceId]?.edit;
}
