import { GroupRole } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

export interface AccessLevel {
    id: string;
    name: string;
    membershipType: string;
}

export interface UserRecord {
    email: string;
    userId: string;
    fullName?: string;
    userType: UserType;
    groupId?: string;
    roles?: string[];
    rolesIds?: string[];
    groupRoles?: GroupRole[];
    isOrgUser?: boolean;
    accessLevel?: AccessLevel;
    accessId?: string;
}

export enum UserType {
    CHANNEL_PARTNER = 'channelPartner',
    ORGANIZATION = 'organization',
    GROUP = 'group',
}
