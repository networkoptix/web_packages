import type { CloudUser } from '@services/nx-cloud-api/nx-cloud-api.types';
import type { ec2PredefinedRole, ec2User, ec2UserRole } from '@services/system-api.types';

import type { CustomPermission } from '../../nx-config/base-config';

export interface PredefinedRole extends ec2PredefinedRole {
    isAdmin: boolean;
}

export interface UserRole extends ec2UserRole {
    isAdmin: boolean;
}

export interface CustomRole extends CustomPermission {
    isAdmin: boolean;
}

export type NxAccessRole = PredefinedRole | UserRole | CustomPermission;

// Custom permission is extended with isAdmin in UserManager.getUserRole()
export type NxUserRole = PredefinedRole | UserRole | CustomRole;

export interface PreprocessCloudUser extends CloudUser {
    email: string;
    isCloud: true;
    permissions: string;
}

// Properties processed during .processUsers()
interface ProcessedUserProps {
    fullName: string;
    permissions: string;
    role: NxUserRole;
    accessRole: string;
    accessRights?: Record<string, true>; // TODO: Use Set
    id: string;
    isCloudOwner: boolean;
    isMe: boolean;
    isAdmin: boolean;
    isLocalOwner: boolean;
    canBeEdited: boolean;
}

export type NxEc2User = ec2User & ProcessedUserProps;
export interface NxEc2CloudUser extends NxEc2User {
    isCloud: true;
}
export interface NxEc2LocalUser extends NxEc2User {
    isCloud: false;
}
export interface NxEc2UserPwChange extends NxEc2LocalUser {
    password: string;
}

export type NxCloudUser = PreprocessCloudUser & ProcessedUserProps;

export type NxUser = NxEc2User | NxCloudUser;

/** The base data for adding a new cloud user */
export interface NewUserBase extends Pick<ec2User, 'email' | 'isEnabled' | 'isCloud'> {
    role: NxAccessRole;
}

export interface NewUserData extends Omit<NewUserBase, 'role'> {
    canBeEdited: true;
    userRoleId: string;
    permissions: string;
    name: string;
}

export interface SystemPermissions {
    editAdmins: boolean;
    editUsers: boolean;
    isAdmin: boolean;
    editCameras: boolean;
    exportArchives: boolean;
    viewArchives: boolean;
}
