import { createReducer, on } from '@ngrx/store';

import * as GroupActions from './groups.actions';
import type { GroupsState } from './groups.state';

export const initialState: GroupsState = {
    items: [],
    systemInfo: [],
};

export const groupsReducer = createReducer(
    initialState,
    on(GroupActions.reset, (_state): GroupsState => ({
        items: [],
        systemInfo: [],
    })),
    on(GroupActions.setItems, (state, { items }): GroupsState => ({
        ...state,
        items,
    })),
    on(GroupActions.setSystemInfo, (state, { systemInfo }): GroupsState => ({
        ...state,
        systemInfo,
    })),

);
