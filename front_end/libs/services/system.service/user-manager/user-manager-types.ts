import { PredefinedRole } from '../../nx-config/base-config';

export interface NxSystemRole extends PredefinedRole {
    id?: string;
    isAdmin?: boolean;
    label?: string;
    optionLabel?: string;
}

export interface NxSystemUser {
    isLocalOwner: boolean;
    accessRole: string;
    accessRights: { [resourceId: string]: true; };
    canBeDeleted: boolean;
    canBeEdited: boolean;
    cryptSha512Hash: string;
    digest: string;
    password: string;
    email: string;
    fullName: string;
    hash: string;
    id: string;
    type: string;
    isHttpDigestEnabled: boolean;
    isAdmin: boolean;
    isCloud: boolean;
    isEnabled: boolean;
    isLdap: boolean;
    isLocalAdmin: boolean;
    isCloudOwner: boolean;
    isMe: boolean;
    name: string;
    parentId: string;
    permissions: string;
    realm: string;
    role: NxSystemRole;
    typeId: string;
    url: string;
    userId: string;
    userRoleId: string;
}

export class SystemPermissions {
    editAdmins = false;
    editUsers = false;
    isAdmin = false;
    editCameras = false;
    viewArchives = false;
}
