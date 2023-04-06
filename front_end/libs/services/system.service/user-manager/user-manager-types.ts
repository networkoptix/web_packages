import type { CloudUser } from '@services/nx-cloud-api/nx-cloud-api.types';
import type { ec2PredefinedRole, ec2User, RestUserCompat } from '@services/system-api.types';

import type { CustomPermission } from '../../nx-config/base-config';

// TODO: Rest predefined role
export interface PredefinedRole extends ec2PredefinedRole {
    // isAdmin: boolean;
}

export interface UserRole {
    id: string;
    name: string;
    permissions: string;
}

export type NxAccessRole = PredefinedRole | UserRole | CustomPermission;

export interface CloudUserCompat extends CloudUser {
    email: string;
    isCloud: true;
    permissions: string;
    id: string;
    fullName: string;
    name: string;
    isLdap: false;
}

export type PreprocessUser = ec2User | RestUserCompat | CloudUserCompat;

export type NxUser = {
    id: string;
    name: string;
    fullName: string;
    email: string;

    isEnabled: boolean;
    isMe: boolean;
    isCloudOwner: boolean;
    isLocalOwner: boolean;
    isCloud: boolean;
    isLdap: boolean;

    permissions: string;
    role: NxAccessRole;
    readonly accessRole: string;
    userRoleId: string;
    canBeEdited: boolean;
};

export interface NxUserPwChange extends NxUser {
    password: string;
}

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
