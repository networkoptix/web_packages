import { createSelector, createFeatureSelector } from '@ngrx/store';

import type {
    BaseGroupItem,
    GroupItem,
    SystemInfo,
    GroupsItem,
    SystemItem,
    Crumb,
} from '../groups.types';
import { LoadingState } from '../groups.types';

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
    systems => {
        return systems
            ? new Map<string, SystemInfo>(systems.map(s => [s.id, s]))
            : systems as null;
    }
);

export const selectGroupsItems = createSelector(
    selectBaseGroupsItems,
    selectSystemInfoMap,
    (items, sysInfo) => {
        if (!items || !sysInfo) {
            return;
        }

        const placedSystem = new Set<string>();
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
    items => items?.filter(item => item.type === 'group') as GroupItem[]
);

export const selectRootSystemItems = createSelector(
    selectGroupsItems,
    items => items?.filter(item => item.type === 'system') as SystemItem[]
);

const selectCurrentGroupId = createSelector(
    selectGroupState,
    items => items.currentGroupId
);

function findTargetAddress(
    targetId: string,
    currentLevel: GroupItem[],
    addressBase: number[] = [],
    targetAddress?: number[],
): number[] {
    for (let i = 0; i < currentLevel.length; i++) {
        if (targetAddress) {
            return targetAddress;
        }

        const currentGroup = currentLevel[i];
        const currentAddress = [...addressBase, i];
        if (currentGroup.id === targetId) {
            return [...currentAddress];
        }

        targetAddress = findTargetAddress(
            targetId,
            currentGroup.groups,
            currentAddress,
            targetAddress,
        );
    }
    return targetAddress;
}

export const selectCurrentIndexes = createSelector(
    selectCurrentGroupId,
    selectRootGroupItems,
    (groupId, rootGroups) => {
        if (!rootGroups) {
            return null; // Still loading data
        } else if (!groupId) {
            return []; // Root
        } else {
            return findTargetAddress(groupId, rootGroups);
            // undefined: No matching group
        }
    }
);

export const selectLoadingState = createSelector(
    selectCurrentIndexes,
    indexes => {
        if (indexes === null) {
            return LoadingState.LOADING;
        } else if (indexes === undefined) {
            return LoadingState.NOT_FOUND;
        } else {
            return LoadingState.LOADED;
        }
    }
);

export const selectCurrentGroupItems = createSelector(
    selectCurrentIndexes,
    selectRootGroupItems,
    (indexes, rootGroups) => {
        if (!indexes) {
            return null;
        }
        return indexes.length
            ? indexes.reduce(
                (groups, index) => groups[index].groups,
                rootGroups
            )
            : rootGroups;
    }
);

export const selectCurrentSystemItems = createSelector(
    selectCurrentIndexes,
    selectRootGroupItems,
    selectRootSystemItems,
    (indexes, rootGroups, rootSystems) => {
        if (!indexes) {
            return null;
        }
        if (indexes.length) {
            const currentGroup = indexes.reduce(
                (group, index) => group.groups[index],
                { groups: rootGroups, systems: rootSystems }
            );
            return currentGroup.systems;
        } else {
            return rootSystems;
        }
    }
);

export const selectCrumbs = createSelector(
    selectCurrentIndexes,
    selectRootGroupItems,
    (indexes, rootGroups) => {
        if (!indexes) {
            return null;
        }
        const crumbs: Crumb[] = [];
        if (indexes.length) {
            let groups = rootGroups;
            indexes.forEach(i => {
                crumbs.push({ id: groups[i].id, name: groups[i].name });
                groups = groups[i].groups;
            });
        }
        return crumbs;
    }
);
