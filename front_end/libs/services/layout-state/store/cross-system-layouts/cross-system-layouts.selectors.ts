import { createSelector } from '@ngrx/store';

import { hashItem } from '../shared/utils';

import { crossSystemLayoutsFeature } from './cross-system-layouts.feature';

export const { selectCrossSystemLayoutsState } = crossSystemLayoutsFeature;

export const selectCrossSystemLayoutsBaseVersion = createSelector(
    selectCrossSystemLayoutsState,
    layouts =>
        layouts.reduce(
            (baseVersions, layout) => {
                baseVersions[layout.id] = hashItem(layout);
                return baseVersions;
            },
            {} as Record<string, string>,
        ),
);
