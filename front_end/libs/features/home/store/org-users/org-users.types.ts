import {
    AccessLevel,
    UserType,
} from '@pages/home/components/users/channel-partner-users/channel-partner-users.types';
import {
    GroupItem,
    GroupRole,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

export interface OrgUser {
    email: string;
    fullName: string | null;
    roles: string[];
    rolesIds: string[];
    groupRoles: GroupRole[];
    isOrgUser: boolean;
    userType: UserType;
    accessLevel: AccessLevel;
}

export type OrgUsersState = {
    selectedGroupId: string;
    selectedUser: string;
    groups: GroupItem[];
};
