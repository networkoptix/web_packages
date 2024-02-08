import { CloudUser } from './nx-cloud-api/nx-cloud-api.types';

export interface Permissions {
    isAdmin: boolean;
    editAdmins: boolean;
    editUsers: boolean;
    editCameras: boolean;
    exportArchives: boolean;
    generateEvents: boolean;
    manageBookmarks: boolean;
    systemHealth: boolean;
    view: boolean;
    viewArchives: boolean;
    viewBookmarks: boolean;
    viewLogs: boolean;
}

/* Types for dealing with roles.
 * Covers: Legacy to 5.1
 */
export interface BaseRole {
    name: string;
    permissions: string;
}

export interface PredefinedLegacyRole extends BaseRole {
    isOwner: boolean;
}

export interface CustomLegacyRole extends BaseRole {
    id: string;
}

export type LegacyRole = PredefinedLegacyRole | CustomLegacyRole;

export interface CustomRestV1Role extends BaseRole {
    id: string;
    accessibleResources: string[];
}

export type RestV1Role = PredefinedLegacyRole | CustomRestV1Role;

export type Role = LegacyRole | RestV1Role | BaseRole;

/* Types for dealing with groups
 * Covers: 6.0+
 */

export interface ExternalUserGroupId {
    dn: string;
    syncId: string;
    synced: boolean;
}
export interface UserGroup {
    attributes: string;
    description: string;
    externalId: ExternalUserGroupId;
    id: string;
    name: string;
    parentGroupIds: string[];
    permissions: string;
    resourceAccessRights: { [key: string]: string };
    type: string;
}

export interface UserGroupDropdown {
    id: string;
    label: string;
    tooltip?: string;
}

export interface UserPermissionDescription {
    description: string;
    name: string;
    custom?: boolean;
}

export enum UserType {
    cloud = 'cloud',
    ldap = 'ldap',
    local = 'local',
    temporaryLocal = 'temporaryLocal',
}

/* Types for cloud users
 * Covers: Legacy to ??? (Depends on cdb)
 */
export interface CloudUserCompat extends CloudUser {
    email: string;
    isCloud: true;
    permissions: string;
    id: string;
    fullName: string;
    name: string;
    isLdap: false;
}

/* Types for users
 * Covers: Legacy to 5.1
 */
export interface LegacyUser {
    accessRole?: string;
    email: string;
    fullName: string;
    id: string;
    isEnabled: boolean;
    name: string;
    permissions: string;
    userRoleId: string;
}

export interface RestV1User {
    email: string;
    fullName: string;
    id: string;
    isEnabled: boolean;
    name: string;
    permissions: string;
    userRoleId?: string;
    type: string; // v1
    isOwner: boolean; // v1
    accessibleResources?: string[]; // v1, v2
}

export interface RestV3User {
    email: string;
    fullName: string;
    id: string;
    isEnabled: boolean;
    name: string;
    permissions: string;
    type: string;
    attributes: string; // v3
    groupIds: string[]; // v3
    resourceAccessRights: { [key: string]: string }; // v3
    hasCustomPermissions: boolean;
}

export type RestUser = RestV1User | RestV3User;

export type SystemUser = RestUser | LegacyUser | CloudUserCompat;

// Managed by the permissionManager
export interface CurrentUser {
    accessRole?: string;
    email: string;
    fullName: string;
    groupIds?: string[]; // might remove for permissions object
    id: string;
    isAdmin: boolean;
    isEnabled: boolean;
    isOwner: boolean;
    name: string;
    permissions: Permissions;
    resourceAccessRights?: { [key: string]: string };
    type?: string; // might remove since we have all of the is vars
    hasCustomPermissions: boolean;
}

// Conversion of SystemUser for the app
export interface NxUser {
    get accessRole(): string;
    attributes?: string;
    canBeEdited: boolean;
    email: string;
    fullName: string;
    groupIds?: string[];
    id: string;
    isAdmin: boolean;
    isCloudOwner: boolean;
    isEnabled: boolean;
    isHttpDigestEnabled: boolean;
    isLocalOwner: boolean;
    isOwner: boolean;
    name: string;
    permissions: string;
    resourceAccessRights?: { [key: string]: string };
    role?: Role;
    type: string;
    userRoleId?: string;
    hasCustomPermissions: boolean;
}

/* Types for adding users to a system
 * Covers: Legacy to 5.1
 * */
export interface BaseNewUser {
    name: string;
    email: string;
    fullName?: string;
    permissions: string;
    isCloud?: boolean;
    isEnabled?: boolean;
    userRoleId?: string;
}

export interface AddUser extends Omit<BaseNewUser, 'name' | 'permissions'> {
    role: Role;
    groupIds: string[];
}

export interface LegacyNewUser extends BaseNewUser {
    isLdap?: boolean;
}

export interface RestNewUser extends BaseNewUser {
    type: 'cloud' | 'ldap' | 'local';
    isHttpDigestEnabled: boolean;
}
