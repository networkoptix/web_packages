import { createReducer, on } from '@ngrx/store';

import type { NxSystemWithUserInfo } from '@services/system.service/system-types';

import * as SystemsActions from './systems.actions';
import type { SystemsState } from './systems.state';

export const initialState: NxSystemWithUserInfo[] = [];

export const systemsReducer = createReducer(
    initialState,
    on(SystemsActions.set, (_state, { systems }): SystemsState => systems),
    on(SystemsActions.clear, (_state): SystemsState => []),
);
