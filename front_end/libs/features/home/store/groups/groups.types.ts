import {
    CloudSystem,
    GroupItem,
    SystemItem,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

import type { OpenGroups } from '../../home.types';

export interface GroupsState {
    groups: GroupItem[] | null;
    currentGroupId: string | undefined;
    openGroups: OpenGroups | undefined;
    systems: SystemItem[];
}

export type Undo = () => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MethodsWithUndo<Target extends Record<string, (...args: any[]) => unknown>> = {
    [Key in keyof Target]: (...args: Parameters<Target[Key]>) => Undo;
};

export interface SystemsByOrgOrGroup {
    id: string;
    systems: string[];
    cloudSystems: CloudSystem[];
}

export type GroupFlatItem = Omit<GroupItem, 'children'>;

export type GroupFlatMap = Record<string, GroupFlatItem>;
