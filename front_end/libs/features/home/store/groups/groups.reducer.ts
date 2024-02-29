import { createReducer, on } from '@ngrx/store';

import * as GroupActions from './groups.actions';
import type { GroupsState } from './groups.state';

const initialState: GroupsState = {
    groups: null,
    currentGroupId: undefined,
    openGroups: undefined,
    systems: [],
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
        (state, { groups }): GroupsState => ({
            ...state,
            groups,
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
    on(
        GroupActions.setSystems,
        (state, { systems }): GroupsState => ({
            ...state,
            systems,
        }),
    ),
    on(
        GroupActions.setGroupsAndSystems,
        (state, { groups, systems }): GroupsState => ({
            ...state,
            groups,
            systems,
        }),
    ),
);
