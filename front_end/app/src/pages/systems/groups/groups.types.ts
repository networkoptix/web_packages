import type { System } from '@services/nx-cloud-api/nx-cloud-api.types';

export interface BaseGroupItem {
    groups: BaseGroupItem[];
    id: string;
    name: string;
    owner_account_email: string;
    parent_group_id: string | null;
    systems: BaseSystemItem[];
    systemsCount: number;
    type: 'group';
    users: unknown[];
}

export interface BaseSystemItem {
    type: 'system';
    id: string;
    group_id: string | null;
}

// Should probably be NxSystemWithUserInfo once that's fixed
export interface SystemInfo extends System {
    authKeyHash: string;
    system2faEnabled: boolean;
    version: string;
}

export type SystemItem = BaseSystemItem & SystemInfo;

export interface GroupItem extends BaseGroupItem {
    groups: GroupItem[];
    systems: SystemItem[];
}

export type BaseGroupsItem = BaseGroupItem | BaseSystemItem;

export type GroupsItem = GroupItem | SystemItem;

export interface Crumb {
    id: string;
    name: string;
}
