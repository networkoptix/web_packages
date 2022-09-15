import { createReducer, on } from '@ngrx/store';

import type { NxSystemInfo } from '@services/systems.service.types';

import * as SystemsActions from './systems.actions';
import type { SystemsState } from './systems.state';

export const initialState: NxSystemInfo[] = [];

export const systemsReducer = createReducer(
    initialState,
    on(SystemsActions.set, (_state, { systems }): SystemsState => systems),
    on(SystemsActions.clear, (_state): SystemsState => []),
);
