import { createSelector, createFeatureSelector } from '@ngrx/store';

import { GroupsState } from './groups.state';

const selectGroupState = createFeatureSelector<GroupsState>('groups');

export const selectGroupItems = createSelector(selectGroupState, state => state.groups);

export const selectOpenGroups = createSelector(selectGroupState, state => state.openGroups);

export const selectHasGroups = createSelector(selectGroupItems, items => items.length > 0);

export const selectCurrentGroupId = createSelector(selectGroupState, items => items.currentGroupId);

export const selectRootGroups = createSelector(selectGroupItems, groups =>
    groups?.filter(group => !group.parentId),
);

export const selectCurrentGroup = createSelector(
    selectCurrentGroupId,
    selectGroupItems,
    (id, groups) => groups?.find(group => group.id === id),
);

export const selectCurrentGroups = createSelector(
    selectCurrentGroup,
    selectRootGroups,
    (group, rootGroups) => group?.children || rootGroups,
);
