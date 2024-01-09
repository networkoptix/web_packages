import { GroupRole } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

export interface UserRecord {
    email: string;
    userId: string;
    fullName: string;
    userType: UserType;
    roles?: string[];
    groupRoles?: GroupRole[];
    isOrgUser?: boolean;
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
