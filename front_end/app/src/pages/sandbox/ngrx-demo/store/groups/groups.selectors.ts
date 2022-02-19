import { createSelector, createFeatureSelector } from '@ngrx/store';

import { GroupsState } from './groups.state';

export const selectGroupState = createFeatureSelector<GroupsState>('groups');
// it's a shame ngrx can't feature select using `.`, like `'groups.groupNames'`

export interface ISystem {
    id: string,
    // name: string,
    groupId: string,
}

export interface IGroup {
    id: string,
    name: string,
    parentId: string,
    children: Array<IGroup>,
    systems: Array<ISystem>,
}

const systemId2System = (state, systemId) => {
    return {
        id: systemId,
        // name: state.groupNames[systemId],
        parentId: state.systemGroups[systemId],
    };
};

const groupId2Group = (state, groupId) => {
    const childrenIds = Object.keys(state.groupParents).filter(
        childId => state.groupParents[childId] === groupId);
    const systemIds = Object.keys(state.systemGroups).filter(
        systemId => state.systemGroups[systemId] === groupId);
    return {
        id: groupId,
        name: state.groupNames[groupId],
        parentId: state.groupParents[groupId] || null,
        children: childrenIds.map(cid => groupId2Group(state, cid)),
        systems: systemIds.map(systemId => systemId2System(state, systemId))
    };
};

export const selectGroupList = createSelector(
    selectGroupState,
    state => Object.keys(state.groupNames).reduce(
        (acc: Array<IGroup>, groupId: string) => [...acc, groupId2Group(state, groupId)],
        []
    )
);

export const selectGroupForest = createSelector(
    selectGroupState,
    state => Object.keys(state.groupNames)
        .filter(
            groupId => !state.groupParents[groupId]
        ).reduce(
            (acc: Array<IGroup>, groupId: string) => [...acc, groupId2Group(state, groupId)],
            []
        )
);
