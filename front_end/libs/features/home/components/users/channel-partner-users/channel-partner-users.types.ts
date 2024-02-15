import { GroupRole } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

export interface UserRecord {
    email: string;
    userId: string;
    fullName?: string;
    userType: UserType;
    isOrgUser?: boolean;
    groupId?: string;
    roles?: string[];
    roleIds?: string[];
    groupRoles?: GroupRole[];
    accessLevel?: {
        id: string;
        name: string;
        membershipType: string;
    };
}

export enum UserType {
    CHANNEL_PARTNER = 'channelPartner',
    ORGANIZATION = 'organization',
    GROUP = 'group',
}
