import { createSelector } from '@ngrx/store';

import { hashItem } from '../shared/utils';

import { localLayoutsFeature } from './local-layouts.feature';

export const { selectLocalLayoutsState } = localLayoutsFeature;

export const selectLocalLayoutsBaseVersion = createSelector(selectLocalLayoutsState, layouts =>
    layouts.reduce((baseVersions, layout) => {
        baseVersions[layout.id] = hashItem(layout);
        return baseVersions;
    }, {} as Record<string, string>),
);
