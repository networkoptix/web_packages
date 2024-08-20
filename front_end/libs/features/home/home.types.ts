import type {
    GroupItem,
    SystemItem,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

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

export enum SystemsDisplayMode {
    Personal = 1,
    Shared = 2,
}

export type DraggableItem = GroupItem | SystemItem;
