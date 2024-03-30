import { Subject } from 'rxjs';

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
    searchQuery: string;
    /**
     * Notifier for when users should be refreshed.
     *
     * Currently this triggered refetching users for the current group as well
     * updating the cached users for the organization.
     *
     * Example usage for when the store wraps the value in a signal.
     *
     * ```
     * store.refreshUsersSubject().next();
     * ```
     *
     * The is intended to be used internally within the store only.
     *
     * A refreshUsers method is exposed on the store to be used externally.
     */
    readonly refreshUsersSubject: Subject<void>;
};

export interface OrgUsersByGroup {
    id: string;
    users: OrgUser[];
}
