import { createAction, props } from '@ngrx/store';

import { GroupsState } from './groups.state';

export const reset = createAction('[System Groups] Reset');

export const load = createAction(
    '[System Groups] Load',
    props<{ newState: GroupsState }>()
);

// actions below are not used; async service methods are called instead
// these actions, however, may be useful for optimistic updates in UI
// so the code is left to be here for the time being

// export const createGroup = createAction(
//     '[System Groups] Create Group',
//     props<{ groupId: string, name: string, parentId: string | null }>()
// );

// export const setGroupName = createAction(
//     '[System Groups] Set Group Name',
//     props<{ groupId: string, name: string }>()
// );

// export const setGroupParent = createAction(
//     '[System Groups] Set Group Parent',
//     props<{ groupId: string, parentId: string }>()
// );

// export const setSystemGroup = createAction(
//     '[System Groups] Set System Group',
//     props<{ systemId: string, groupId: string }>()
// );
