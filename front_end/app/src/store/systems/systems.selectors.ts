import { createSelector, createFeatureSelector } from '@ngrx/store';

import { NxSystemWithUserInfo } from '../../services/systems.service';

export const selectSystems =
    createFeatureSelector<Array<NxSystemWithUserInfo>>('systems');

export const selectSystem = createSelector(
    selectSystems,
    (systems, systemId) => systems.find(s => s.id === systemId)
);
