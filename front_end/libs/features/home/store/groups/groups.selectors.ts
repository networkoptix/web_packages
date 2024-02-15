import { createSelector, createFeatureSelector } from '@ngrx/store';

import { OrgCardItem } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

import { GroupsState } from './groups.state';

const selectGroupState = createFeatureSelector<GroupsState>('groups');

export const selectGroupItems = createSelector(selectGroupState, state => state.groups);

export const selectOpenGroups = createSelector(selectGroupState, state => state.openGroups);

export const selectCurrentSystems = createSelector(selectGroupState, state => state.systems);

export const selectHasGroups = createSelector(selectGroupItems, items => items.length > 0);

export const selectCurrentGroupId = createSelector(selectGroupState, items => items.currentGroupId);

export const selectInGroup = createSelector(selectCurrentGroupId, id => !!id);

export const selectRootGroups = createSelector(
    selectGroupItems,
    groups => groups?.filter(group => !group.parentId),
);

export const selectCurrentGroup = createSelector(
    selectCurrentGroupId,
    selectGroupItems,
    (id, groups) => groups?.find(group => group.id === id),
);

export const selectCurrentGroups = createSelector(
    selectCurrentGroup,
    selectRootGroups,
    (group, rootGroups) =>
        (group?.children || rootGroups)?.map(group => ({ ...group, type: OrgCardItem.GROUP })),
);

export const selectCurrentPath = createSelector(
    selectCurrentGroup,
    selectGroupItems,
    (group, groups) => {
        if (!group) {
            return [];
        }
        const res = [group];
        let { parentId } = group;
        if (parentId) {
            const groupsMap = new Map(groups?.map(group => [group.id, group]));
            while (parentId) {
                const parentGroup = groupsMap.get(parentId);
                res.push(parentGroup);
                parentId = parentGroup?.parentId;
            }
        }
        return res;
    },
);
