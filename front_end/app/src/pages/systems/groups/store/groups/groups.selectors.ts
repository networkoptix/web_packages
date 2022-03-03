import { createSelector, createFeatureSelector } from '@ngrx/store';

import { GroupsState } from './groups.state';

export interface ISystem {
    id: string,
    // name: string,
    parentId: string,
}

export interface IGroup {
    id: string,
    name: string,
    parentId: string,
    children: Array<IGroup>,
    systems: Array<ISystem>,
}

export const selectGroupState = createFeatureSelector<GroupsState>('groups');

export const selectGroup = createSelector(
    selectGroupState,
    (state: GroupsState, groupId: string) => _groupId2Group(state, groupId)
);

export const selectGroupList = createSelector(
    selectGroupState,
    state => Object.keys(state.groupNames).map(groupId =>
        _groupId2Group(state, groupId)
    )
);

export const selectGroupForest = createSelector(
    selectGroupState,
    state => Object.keys(state.groupNames)
        .filter(groupId => !state.groupParents[groupId]) // Top-level groups
        .map(groupId => _groupId2Group(state, groupId))
);

const _systemId2System = (state: GroupsState, systemId: string): ISystem => {
    return {
        id: systemId,
        // name: state.groupNames[systemId],
        parentId: state.systemGroups[systemId],
    };
};

const _groupId2Group = (state: GroupsState, groupId: string): IGroup => {
    const childrenIds = Object.keys(state.groupParents).filter(
        childId => state.groupParents[childId] === groupId
    );
    const systemIds = Object.keys(state.systemGroups).filter(
        systemId => state.systemGroups[systemId] === groupId
    );
    return {
        id: groupId,
        name: state.groupNames[groupId],
        parentId: state.groupParents[groupId] || null,
        children: childrenIds.map(cid => _groupId2Group(state, cid)),
        systems: systemIds.map(systemId => _systemId2System(state, systemId))
    };
};
