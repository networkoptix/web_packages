import { createReducer, on } from '@ngrx/store';

import * as GroupActions from './groups.actions';
import { GroupsState } from './groups.state';

export const initialState: GroupsState = {
    systemGroups: {
        system11: 'group1',
        system12: 'group1',
        system2: 'group2',
    },
    groupNames: {
        group1: 'Group One',
        group2: 'Group Two',
        group3: 'Group Three',
    },
    groupParents: {
        group2: 'group1',
        group3: 'group2',
    },
};

export const groupsReducer = createReducer(

    initialState,

    on(GroupActions.reset, (state): GroupsState => ({ ...initialState })),

    on(GroupActions.load, (state, { newState }): GroupsState => ({ ...newState })),

    on(GroupActions.createGroup, (state, { groupId, name, parentId }): GroupsState => ({
        ...state,
        groupNames: {
            ...state.groupNames,
            [groupId]: name
        },
        groupParents: {
            ...state.groupParents,
            [groupId]: parentId
        }
    })),

    on(GroupActions.setGroupName, (state, { groupId, name }): GroupsState => ({
        ...state,
        groupNames: {
            ...state.groupNames,
            [groupId]: name
        }
    })),

    on(GroupActions.setGroupParent, (state, { groupId, parentId }): GroupsState => ({
        ...state,
        groupParents: {
            ...state.groupParents,
            [groupId]: parentId
        }
    })),

    on(GroupActions.setSystemGroup, (state, { systemId, groupId }): GroupsState => ({
        ...state,
        systemGroups: {
            ...state.systemGroups,
            systemId: groupId
        }
    })),

);
