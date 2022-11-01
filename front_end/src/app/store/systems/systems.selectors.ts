import { createSelector, createFeatureSelector } from '@ngrx/store';

import type {
    NxSystemWithUserInfo
} from '@services/system.service/system-types';

export const selectSystems =
    createFeatureSelector<Array<NxSystemWithUserInfo>>('systems');

export const selectSystem = createSelector(
    selectSystems,
    (systems: Array<NxSystemWithUserInfo>, systemId: string) =>
        systems.find(s => s.id === systemId)
);
