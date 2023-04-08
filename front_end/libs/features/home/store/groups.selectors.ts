import { createSelector, createFeatureSelector } from '@ngrx/store';

import type {
    BaseGroupItem,
    GroupItem,
    SystemInfo,
    GroupsItem,
    SystemItem,
    Crumb,
    SharedItems,
} from '../home.types';
import { LoadingState } from '../home.types';

import { GroupsState } from './groups.state';

const selectGroupState = createFeatureSelector<GroupsState>('groups');

const selectBaseGroupsItems = createSelector(selectGroupState, state => state.items);

const selectSystemInfo = createSelector(selectGroupState, state => state.systemInfo);

export const selectOpenGroups = createSelector(selectGroupState, state => state.openGroups);

const selectAccountEmail = createSelector(selectGroupState, state => state.accountEmail);

export const selectCurrentSharedOwner = createSelector(
    selectGroupState,
    state => state.currentSharedOwner,
);

const selectSystemInfoMap = createSelector(selectSystemInfo, systems => {
    return systems ? new Map<string, SystemInfo>(systems.map(s => [s.id, s])) : (systems as null);
});

const hasAccessToSystem = (system: SystemItem): boolean => {
    // Systems without name property are systems user has not been added to
    return !!system.name;
};

export const selectGroupsItems = createSelector(
    selectBaseGroupsItems,
    selectSystemInfoMap,
    (items, sysInfo) => {
        if (!items || !sysInfo) {
            return;
        }

        const placedSystem = new Set<string>();
        function extendSystemInfo(groupItem: BaseGroupItem): GroupItem {
            groupItem.groups = groupItem.groups.map(g => extendSystemInfo({ ...g }));
            groupItem.systems = groupItem.systems
                .map(s => {
                    placedSystem.add(s.id);
                    return {
                        ...s,
                        ...sysInfo.get(s.id),
                    };
                })
                .filter(system => hasAccessToSystem(system));
            return groupItem as GroupItem;
        }
        const data = items.map(item => {
            if (item.type === 'group') {
                item = extendSystemInfo({ ...item });
            } else {
                item = {
                    ...item,
                    ...sysInfo.get(item.id),
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
    },
);

export const selectRootGroupItems = createSelector(
    selectGroupsItems,
    items => items?.filter(item => item.type === 'group') as GroupItem[],
);

export const selectHasGroups = createSelector(selectRootGroupItems, groups => !!groups?.length);

export const selectRootSystemItems = createSelector(
    selectGroupsItems,
    items => items?.filter(item => item.type === 'system') as SystemItem[],
);

export const selectCurrentGroupId = createSelector(selectGroupState, items => items.currentGroupId);

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
            return [];
        } else {
            return findTargetAddress(groupId, rootGroups);
            // undefined: No matching group
        }
    },
);

export const selectHasCurrentIndexes = createSelector(
    selectCurrentIndexes,
    indexes => !indexes?.length,
);

export const selectLoadingState = createSelector(selectCurrentIndexes, indexes => {
    if (indexes === null) {
        return LoadingState.LOADING;
    } else if (indexes === undefined) {
        return LoadingState.NOT_FOUND;
    } else {
        return LoadingState.LOADED;
    }
});

export const selectCurrentGroupItems = createSelector(
    selectCurrentIndexes,
    selectRootGroupItems,
    (indexes, rootGroups) => {
        if (!indexes) {
            return null;
        }
        return indexes.length
            ? indexes.reduce((groups, index) => groups[index].groups, rootGroups)
            : rootGroups;
    },
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
            const currentGroup = indexes.reduce((group, index) => group.groups[index], {
                groups: rootGroups,
                systems: rootSystems,
            });
            return currentGroup.systems;
        } else {
            return rootSystems;
        }
    },
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
    },
);

// Same as above to prevent unexpected changes for crumbs
export const selectCurrentPath = createSelector(
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
    },
);

export const selectCurrentRootGroup = createSelector(selectCurrentPath, path => path[0]);

const createSharedItemsObject = (groups: GroupItem[], systems: SystemItem[]): SharedItems => {
    const result: SharedItems = {};

    for (const group of groups) {
        if (!result[group.owner_account_email]) {
            result[group.owner_account_email] = { groups: [], systems: [] };
        }
        result[group.owner_account_email].groups.push(group);
    }

    for (const system of systems) {
        if (!result[system.ownerAccountEmail]) {
            result[system.ownerAccountEmail] = { groups: [], systems: [] };
        }
        result[system.ownerAccountEmail].systems.push(system);
    }
    return result;
};

export const selectRootPersonalItems = createSelector(
    selectRootGroupItems,
    selectRootSystemItems,
    selectAccountEmail,
    (groups, systems, email) => {
        return {
            groups: groups.filter(group => group.owner_account_email === email),
            systems: systems.filter(system => system.ownerAccountEmail === email),
        };
    },
);

export const selectRootSharedItems = createSelector(
    selectRootGroupItems,
    selectRootSystemItems,
    selectAccountEmail,
    (groups, systems, email) =>
        createSharedItemsObject(
            groups.filter(group => group.owner_account_email !== email),
            systems.filter(system => system.ownerAccountEmail !== email),
        ),
);

export const selectPersonalGroupItems = createSelector(
    selectCurrentGroupItems,
    selectAccountEmail,
    (groups, email) => groups.filter(group => group.owner_account_email === email),
);

export const selectPersonalSystemItems = createSelector(
    selectCurrentSystemItems,
    selectAccountEmail,
    (systems, email) => systems.filter(system => system.ownerAccountEmail === email),
);

export const selectPersonalItems = createSelector(
    selectPersonalGroupItems,
    selectPersonalSystemItems,
    (groups, systems) => {
        return { groups, systems };
    },
);

export const selectSharedGroupItems = createSelector(
    selectCurrentGroupItems,
    selectAccountEmail,
    (groups, email) => groups.filter(group => group.owner_account_email !== email),
);

export const selectSharedSystemItems = createSelector(
    selectCurrentSystemItems,
    selectAccountEmail,
    (systems, email) => systems.filter(system => system.ownerAccountEmail !== email),
);

export const selectSharedItems = createSelector(
    selectSharedGroupItems,
    selectSharedSystemItems,
    (groups, systems) => createSharedItemsObject(groups, systems),
);

export const selectCurrentGroupOwner = createSelector(
    selectCurrentIndexes,
    selectRootGroupItems,
    (indexes, groups) => {
        if (!indexes?.length) {
            return;
        }
        return groups[indexes[0]].owner_account_email;
    },
);
