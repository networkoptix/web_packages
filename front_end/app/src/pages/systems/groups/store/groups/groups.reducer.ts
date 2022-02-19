import { createReducer, on } from '@ngrx/store';

import * as GroupActions from './groups.actions';
import { GroupsState } from './groups.state';

export const initialState: GroupsState = {
    systemGroups: {
        // system11: 'group1',
        // system12: 'group1',
        // system2: 'group2',
    },
    groupNames: {
        // group1: 'Group One',
        // group2: 'Group Two',
        // group3: 'Group Three',
    },
    groupParents: {
        // group2: 'group1',
        // group3: 'group2',
    },
};

const _groupsReducer = createReducer(

    initialState,

    on(GroupActions.reset, state => ({ ...initialState })),

    on(GroupActions.load, (state, { newState }) => ({ ...newState })),

    on(GroupActions.createGroup, (state, { groupId, name, parentId }) => {
        state.groupNames[groupId] = name;
        state.groupParents[groupId] = parentId;
        return state;
    }),

    on(GroupActions.setGroupName, (state, { groupId, name }) => {
        state.groupNames[groupId] = name;
        return state;
    }),

    on(GroupActions.setGroupParent, (state, { groupId, parentId }) => {
        state.groupParents[groupId] = parentId;
        return state;
    }),

    on(GroupActions.setSystemGroup, (state, { systemId, groupId }) => {
        state.systemGroups[systemId] = groupId;
        return state;
    }),

);

export function groupsReducer(state, action) {
    return _groupsReducer(state, action);
}
