export interface ec2PredefinedRole {
    isOwner: boolean;
    name: string;
    permissions: string;
}

export interface ec2UserRole {
    description: string;
    id: string;
    isLdap: boolean;
    name: string;
    parentRoleIds: unknown[];
    permissions: string;
}

export interface RestUserRole {
    accessibleResources: string[];
    id: string;
    name: string;
    permissions: string;
}

/** /api/getCurrentUser or /rest/v1/users?name=username */
export interface CurrentUser {
    fullName?: string;
    email?: string;
    id: string;
    permissions: string;
    name: string;
    isOwner?: boolean;
    type?: string;
}

export interface ec2User {
    cryptSha512Hash: string;
    digest: string;
    email: string;
    fullName: string;
    hash: string;
    id: string;
    isAdmin: boolean;
    isCloud: boolean;
    isEnabled: boolean;
    isLdap: boolean;
    name: string;
    parentId: string;
    permissions: string;
    realm: string;
    typeId: string;
    url: string;
    userRoleId: string;
    userRoleIds: string[];
}

export interface RestUser {
    accessibleResources: string[];
    email: string;
    fullName: string;
    id: string;
    isEnabled: boolean;
    isHttpDigestEnabled: boolean;
    isOwner: boolean;
    name: string;
    permissions: string;
    type: string;
    userRoleId: string;
}

export interface RestUserCompat extends RestUser {
    isCloud: boolean;
    isLdap: boolean;
}

export interface UserSession {
    username: string;
    token: string;
    ageS: number;
    expiresInS: number;
}

export interface UserSessionV3 {
    id: string;
    username: string;
    token: string;
    ageS: number;
    expiresInS: number;
}

export type ec2SaveUser = Partial<{
    id: string;
    email: string;
    name: string;
    fullName: string;
    userId: string;
    userRoleId: string;
    permissions: string;
    isCloud: boolean;
    isEnabled: boolean;
    password: string;
}>;

export type RestV1SaveUser = ec2SaveUser &
    Partial<{
        type: string;
        isOwner: boolean;
        accessibleResources: unknown;
        isHttpDigestEnabled: boolean;
    }>;

export type RestV3SaveUser = ec2SaveUser &
    Partial<{
        type: string;
        isOwner: boolean;
        isHttpDigestEnabled: boolean;
        groupIds?: string[];
    }>;
