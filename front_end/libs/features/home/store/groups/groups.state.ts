import type { BaseGroupsItem, OpenGroups, SystemInfo } from '../../home.types';

export interface GroupsState {
    items: BaseGroupsItem[] | null;
    orgSystems: SystemInfo[] | null;
    currentGroupId: string;
    openGroups: OpenGroups;
}
