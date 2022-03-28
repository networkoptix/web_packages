import { createReducer, on } from '@ngrx/store';
import { cloneDeep } from 'lodash-es';

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

export const groupsReducer = createReducer(

    initialState,

    on(GroupActions.reset, _state => cloneDeep(initialState)),

    on(GroupActions.load, (_state, { newState }) => cloneDeep(newState)),

    // actions below are not used; async service methods are called instead
    // these actions, however, may be useful for optimistic updates in UI
    // so the code is left to be here for the time being

    // on(GroupActions.createGroup, (state, { groupId, name, parentId }) => {
    //     const newState = cloneDeep(state);
    //     newState.groupNames[groupId] = name;
    //     if (parentId) {
    //         newState.groupParents[groupId] = parentId;
    //     }
    //     return newState;
    // }),

    // on(GroupActions.setGroupName, (state, { groupId, name }) => {
    //     const newState = cloneDeep(state);
    //     newState.groupNames[groupId] = name;
    //     return newState;
    // }),

    // on(GroupActions.setGroupParent, (state, { groupId, parentId }) => {
    //     const newState = cloneDeep(state);
    //     newState.groupParents[groupId] = parentId;
    //     return newState;
    // }),

    // on(GroupActions.setSystemGroup, (state, { systemId, groupId }) => {
    //     const newState = cloneDeep(state);
    //     if (groupId) {
    //         newState.systemGroups[systemId] = groupId;
    //     } else {
    //         delete newState.systemGroups[systemId];
    //     }
    //     return newState;
    // }),

);
