import { createReducer, on } from '@ngrx/store';
import { cloneDeep } from 'lodash-es';

import * as GroupActions from './groups.actions';
import { GroupsState } from './groups.state';

export const initialState: GroupsState = {
    list: [],
    systems: [],
};

export const groupsReducer = createReducer(

    initialState,

    on(GroupActions.reset, (_state): GroupsState => cloneDeep(initialState)),

    on(GroupActions.loadList, (_state, { list }): GroupsState => ({ ..._state, list })),

    on(GroupActions.loadSystems, (_state, { systems }): GroupsState => ({ ..._state, systems })),

);
