import { createReducer, on } from '@ngrx/store';

import { onSyncState } from '@store/sync.utils';

import { SystemResourcesBySystemId } from './system-resources.types';

import { SystemResourcesActions } from '.';

export const initialState: SystemResourcesBySystemId = {};

export const reducer = createReducer(
    initialState,
    on(
        SystemResourcesActions.setSystemResources,
        (_state, updates): SystemResourcesBySystemId => updates,
    ),
    on(
        SystemResourcesActions.updateSystemResources,
        (initialState, { type, ...updates }): SystemResourcesBySystemId =>
            Object.entries(updates).reduce((state, [systemId, update]) => {
                const lastUpdated = Date.now();
                return {
                    ...state,
                    [systemId]: {
                        ...state[systemId],
                        ...Object.entries(update).reduce(
                            (acc, [key, value]) => ({
                                ...acc,
                                [key]: { value, lastUpdated },
                            }),
                            {} as typeof update,
                        ),
                    },
                };
            }, initialState),
    ),
    onSyncState<SystemResourcesBySystemId>(),
);
