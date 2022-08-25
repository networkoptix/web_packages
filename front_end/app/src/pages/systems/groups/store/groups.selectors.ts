import { createSelector, createFeatureSelector } from '@ngrx/store';

import type {
    BaseGroupItem,
    GroupItem,
    SystemInfo,
    GroupsItem,
    SystemItem,
} from '../groups.types';

import { GroupsState } from './groups.state';

const selectGroupState = createFeatureSelector<GroupsState>('groups');

const selectBaseGroupsItems = createSelector(
    selectGroupState,
    state => state.items
);

const selectSystemInfo = createSelector(
    selectGroupState,
    state => state.systemInfo,
);

const selectSystemInfoMap = createSelector(
    selectSystemInfo,
    systems => new Map<string, SystemInfo>(systems.map(s => [s.id, s]))
);

export const selectGroupsItems = createSelector(
    selectBaseGroupsItems,
    selectSystemInfoMap,
    (items, sysInfo) => {
        const placedSystem: Set<string> = new Set();
        function extendSystemInfo(groupItem: BaseGroupItem): GroupItem {
            groupItem.groups = groupItem.groups.map(g =>
                extendSystemInfo({ ...g })
            );
            groupItem.systems = groupItem.systems.map(s => {
                placedSystem.add(s.id);
                return {
                    ...s,
                    ...sysInfo.get(s.id)
                };
            });
            return groupItem as GroupItem;
        }
        const data = items.map(item => {
            if (item.type === 'group') {
                item = extendSystemInfo({ ...item });
            } else {
                item = {
                    ...item,
                    ...sysInfo.get(item.id)
                };
            }
            return item as GroupsItem;
        });

        sysInfo.forEach(system => {
            if (!placedSystem.has(system.id)) {
                data.push({ ...system, type: 'system', group_id: null });
                placedSystem.add(system.id);
            }
        });
        return data;
    }
);

export const selectRootGroupItems = createSelector(
    selectGroupsItems,
    items => items.filter(item => item.type === 'group') as GroupItem[]
);

export const selectRootSystemItems = createSelector(
    selectGroupsItems,
    items => items.filter(item => item.type === 'system') as SystemItem[]
);
