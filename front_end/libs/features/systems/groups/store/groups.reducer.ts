import { createReducer, on } from '@ngrx/store';

import * as GroupActions from './groups.actions';
import type { GroupsState } from './groups.state';

const initialState: GroupsState = {
    items: null,
    systemInfo: null,
    currentGroupId: undefined,
    currentSharedOwner: null,
    accountEmail: null,
};

export const groupsReducer = createReducer(
    initialState,
    // on(GroupActions.reset, (_state): GroupsState => ({
    //     items: [],
    //     systemInfo: [],
    //     currentGroupId: undefined,
    // })),
    on(GroupActions.setItems, (state, { items }): GroupsState => ({
        ...state,
        items,
    })),
    on(GroupActions.setSystemInfo, (state, { systemInfo }): GroupsState => ({
        ...state,
        systemInfo,
    })),
    on(
        GroupActions.setCurrentGroupId,
        (state, { currentGroupId }): GroupsState => ({
            ...state,
            currentGroupId,
        })),
    on(
        GroupActions.setCurrentSharedOwner,
        (state, { currentSharedOwner }): GroupsState => ({
            ...state,
            currentSharedOwner
        })),
    on(
        GroupActions.setAccountEmail,
        (state, { accountEmail }): GroupsState => ({
            ...state,
            accountEmail
        })
    )
);
