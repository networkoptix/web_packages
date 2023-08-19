import type { System } from '@services/nx-cloud-api/nx-cloud-api.types';

export interface BaseGroupItem {
    groups: BaseGroupItem[];
    id: string;
    name: string;
    org_id: string;
    parent_group_id: string | null;
    systems: BaseSystemItem[];
    systemsCount: number;
    type: 'group';
    users: unknown[];
}

export type SystemInfo = System;

export interface BaseSystemItem {
    type: 'system';
    id: string;
    group_id: string | null;
}

export type SystemItem = BaseSystemItem & System;

export interface GroupItem extends BaseGroupItem {
    groups: GroupItem[];
    systems: SystemItem[];
}

export type BaseGroupsItem = BaseGroupItem | BaseSystemItem;

export type GroupsItem = GroupItem | SystemItem;

export interface BaseItems {
    groups: GroupItem[];
    systems: SystemItem[];
}

export interface SharedItems {
    [email: string]: BaseItems;
}

export interface Crumb {
    id: string;
    name: string;
}

export interface GroupPath {
    id: string;
    name: string;
}

export interface OpenGroups {
    [systemId: string]: boolean;
}

export enum LoadingState {
    LOADING = 1,
    LOADED = 2,
    NOT_FOUND = 404,
}

export interface HEADER_ITEM {
    name: string;
    value: string;
    sort?: string;
    align?: string;
}
