import { createSelector, createFeatureSelector } from '@ngrx/store';

import { GroupsState } from './groups.state';
import { ListItem, SystemsItem } from './groups.types';

export const selectGroupState = createFeatureSelector<GroupsState>('groups');

const _extendSystemInfo = (list: Array<ListItem>, systems: Array<SystemsItem>): Array<ListItem> => list.map(li => {
    const result: ListItem = { ...li };
    if (li.type === 'system') {
        return { ...result, ...(systems.find(s => s.id === li.id) || {}) };
    }
    if (li.type === 'group') {
        if (li.groups) {
            // @ts-expect-error (weird)
            result.groups = _extendSystemInfo(li.groups, systems);
        }
        if (li.systems) {
            // @ts-expect-error (weird)
            result.systems = _extendSystemInfo(li.systems, systems);
        }
    }
    return result;
});

export const selectForest = createSelector(
    selectGroupState,
    state => _extendSystemInfo(state.list, state.systems)
);

export const selectRootGroups = createSelector(
    selectGroupState,
    state => state.list.filter(li => li.type === 'group')
);

export const selectRootSystems = createSelector(
    selectGroupState,
    state => _extendSystemInfo(state.list.filter(li => li.type === 'system'), state.systems)
);

export const selectGroup = createSelector(
    selectForest,
    (forest, groupId) => forest.reduce(function digForTheGroup(found: ListItem | null, candidate: ListItem) {
        if (found) {
            return found;
        }
        if (candidate.type !== 'group') {
            return null;
        }
        if (candidate.id === groupId) {
            return candidate;
        }
        if (candidate.groups?.length) {
            return candidate.groups.reduce(digForTheGroup, null);
        }
        return null;
    }, null)
);
