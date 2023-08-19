import { createReducer, on } from '@ngrx/store';

import { onSyncState } from '@store/sync.utils';

import { UnsavedLayoutState } from '../shared/types/layout-state.types';
import { createNewUnsavedLocalLayout } from '../utils/create-new-local-layout';

import * as UnsavedLayoutActions from './unsaved-layouts.actions';

export const initialState: UnsavedLayoutState[] = [];

export const reducer = createReducer(
    initialState,
    on(
        UnsavedLayoutActions.set,
        (_state, { unsavedLayouts }): UnsavedLayoutState[] => unsavedLayouts,
    ),
    on(UnsavedLayoutActions.clear, (_state): UnsavedLayoutState[] => []),
    on(
        UnsavedLayoutActions.createNewLocalLayout,
        (state, { name, items }): UnsavedLayoutState[] => [
            ...state,
            createNewUnsavedLocalLayout(name, items),
        ],
    ),
    onSyncState<UnsavedLayoutState[]>(),
);
