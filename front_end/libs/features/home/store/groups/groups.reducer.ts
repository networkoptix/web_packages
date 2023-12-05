import { createReducer, on } from '@ngrx/store';

import * as GroupActions from './groups.actions';
import type { GroupsState } from './groups.state';

const initialState: GroupsState = {
    groups: null,
    groupsMap: null,
    currentGroupId: undefined,
    openGroups: {},
};

export const groupsReducer = createReducer(
    initialState,
    // on(GroupActions.reset, (_state): GroupsState => ({
    //     items: [],
    //     systemInfo: [],
    //     currentGroupId: undefined,
    // })),
    on(
        GroupActions.setGroups,
        (state, { groups, groupsMap }): GroupsState => ({
            ...state,
            groups,
            groupsMap,
        }),
    ),
    on(
        GroupActions.setCurrentGroupId,
        (state, { currentGroupId }): GroupsState => ({
            ...state,
            currentGroupId,
        }),
    ),
    on(
        GroupActions.setOpenGroups,
        (state, { openGroups }): GroupsState => ({
            ...state,
            openGroups: {
                ...state.openGroups,
                ...openGroups,
            },
        }),
    ),
);
