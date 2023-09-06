import { createAction, props } from '@ngrx/store';

import { RefreshSystemResources, SystemResources } from './system-resources.types';

export const refreshSystemResources = createAction(
    '[System Resources] Refresh System Resources based on max age',
    props<{
        maxAge?: number;
        systems: {
            [systemid: string]: RefreshSystemResources;
        };
    }>(),
);

export const setSystemResources = createAction(
    '[System Resources] Set System Resources',
    props<{ [systemid: string]: SystemResources }>(),
);

export const updateSystemResources = createAction(
    '[System Resources] Partial Update System Resources',
    props<{ [systemid: string]: Partial<SystemResources> }>(),
);
