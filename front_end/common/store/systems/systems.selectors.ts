import { createSelector, createFeatureSelector } from '@ngrx/store';

import type { NxSystemInfo } from '@services/systems.service.types';

export const selectSystems = createFeatureSelector<Array<NxSystemInfo>>('systems');

export const selectSystem = createSelector(
    selectSystems,
    (systems: Array<NxSystemInfo>, systemId: string) => systems.find(s => s.id === systemId),
);
