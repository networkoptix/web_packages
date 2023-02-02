// Old incorrect types, remove after fixing user groups types
export interface User {
    canBeEdited: boolean;
    canBeDeleted: boolean;
    email: string;
    id: string;
    isCloud: boolean;
    isAdmin?: boolean;
    isEnabled: boolean;
    userRoleId: string;
    permissions: string;
    // TODO: Remove the trash below after #VMS-2968
    name: string;
    fullName: string;
    username?: string;
    type?: string;
    isOwner?: boolean,
    isHttpDigestEnabled?: boolean,
    userGroupIds?: string[],
    resourceAccessRights?: {
        additionalProp1?: string,
        additionalProp2?: string,
        additionalProp3?: string
    }, // up to here, for only User with Groups
}

export interface UserGroups {
    id: string,
    name: string,
    description: string,
    type: string,
    externalId: string,
    permissions: string,
    parentGroupIds: string[],
    resourceAccessRights: {
        additionalProp1: string,
        additionalProp2: string,
        additionalProp3: string
    },
    isPredefined: boolean
}

// export interface UsersWithGroups {
//     id: string,
//     name: string,
//     email: string,
//     fullName: string,
//     type: string,
//     isOwner: boolean,
//     permissions: string,
//     isEnabled: boolean,
//     isHttpDigestEnabled: boolean,
//     userGroupIds: string[],
//     externalId: string,
//     resourceAccessRights: {
//         additionalProp1?: string,
//         additionalProp2?: string,
//         additionalProp3?: string
//     },
//     password?: string
// }
