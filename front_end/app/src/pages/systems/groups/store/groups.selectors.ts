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

// eslint-disable-next-line ngrx/prefix-selectors-with-select
const _selectGroupsItems = createSelector(
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
    _selectGroupsItems,
    selectSystemInfoMap,
    (items, sysInfo) => {
        function extendSystemInfo(groupItem: BaseGroupItem): GroupItem {
            groupItem.groups = groupItem.groups.map(g =>
                extendSystemInfo({ ...g })
            );
            groupItem.systems = groupItem.systems.map(s => ({
                ...s,
                ...(sysInfo.get(s.id) ?? {})
                // TODO: Remove once backend only returns your systems
            }));
            return groupItem as GroupItem;
        }
        return items.map(item => {
            if (item.type === 'group') {
                item = extendSystemInfo({ ...item });
            } else {
                item = {
                    ...item,
                    ...(sysInfo.get(item.id) ?? {}) // Here as well
                };
            }
            return item as GroupsItem;
        });
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
