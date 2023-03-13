// Old incorrect types, remove after fixing user groups types
export type NxSystemRole = any;
export type NxSystemUser = any;
// export type SystemPermissions = any;
export type NxUserGroup = any;
export type NxUserWithGroups = any;
// import { Translatable } from '@pipes/any-translate.types';

// import { PredefinedRole } from '../../nx-config/base-config';

// export interface NxSystemRole extends PredefinedRole {
//     id?: string;
//     isAdmin?: boolean;
//     label?: string;
//     optionLabel?: string;
// }

// export interface NxSystemUser {
//     id: string;
//     name: string;
//     email: string;
//     password: string;
//     fullName: string;
//     permissions: string;
//     isEnabled: boolean;
//     externalId: string; // up to here, shared fields between Users with Roles + Users with Groups
//     cryptSha512Hash?: string;
//     digest?: string;
//     hash?: string;
//     parentId?: string;
//     realm?: string;
//     typeId?: string;
//     url?: string;
//     userId?: string;
//     userRoleId?: string;
//     isAdmin: boolean;
//     isCloud: boolean;
//     isLdap: boolean; // up to here, from User with Roles api call
//     role?: NxSystemRole;
//     accessRole?: string;
//     accessRights?: { [resourceId: string]: true; }; // only for use with User with Roles
//     canBeDeleted: boolean;
//     canBeEdited: boolean;
//     isLocalOwner: boolean;
//     isCloudOwner: boolean;
//     isMe: boolean; // calculated fields that can be potentially shared b/t Roles & Groups
//     type?: string;
//     isOwner?: boolean;
//     isHttpDigestEnabled?: boolean;
//     userGroupIds?: string[];
//     resourceAccessRights?: {
//         additionalProp1?: string;
//         additionalProp2?: string;
//         additionalProp3?: string;
//     }; // up to here, from User with Groups api call
//     permissionsSet?: Set<string> // new calculated fields for just Groups
// }

export class SystemPermissions {
    editAdmins = false;
    editUsers = false;
    isAdmin = false;
    editCameras = false;
    exportArchives = false;
    viewArchives = false;
}

// export interface NxUserGroup {
//     id: string,
//     name: string,
//     description: string | Translatable,
//     type: string,
//     externalId: string,
//     permissions: string,
//     parentGroupIds: string[],
//     resourceAccessRights: {
//         additionalProp1: string,
//         additionalProp2: string,
//         additionalProp3: string
//     },
//     isPredefined: boolean
// }

// export interface NxUserWithGroups {
//     id: string,
//     name: string,
//     email: string,
//     type: string,
//     fullName: string,
//     isOwner: boolean,
//     permissions: string,
//     permissionsSet?: Set<string>
//     isEnabled: boolean,
//     isHttpDigestEnabled: boolean,
//     userGroupIds: string[],
//     externalId: string,
//     resourceAccessRights: {
//         additionalProp1: string,
//         additionalProp2: string,
//         additionalProp3: string
//     },
//     password?: string,
//     isMe?: boolean,
//     isCloudOwner?: boolean,
//     isLocalOwner?: boolean,
//     isAdmin?: boolean,
//     canBeEdited?: boolean,
// }
