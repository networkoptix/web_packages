import type { BaseGroupsItem, SystemInfo } from '../groups.types';

export interface GroupsState {
    items: BaseGroupsItem[],
    systemInfo: SystemInfo[],
}
