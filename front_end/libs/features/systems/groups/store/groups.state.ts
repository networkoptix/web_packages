import type { BaseGroupsItem, SystemInfo } from '../groups.types';

export interface GroupsState {
    items: BaseGroupsItem[] | null;
    systemInfo: SystemInfo[] | null;
    currentGroupId: string;
    currentSharedOwner: string;
    accountEmail: string;
}
