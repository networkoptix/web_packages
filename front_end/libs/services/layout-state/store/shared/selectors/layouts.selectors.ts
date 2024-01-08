import { createSelector } from '@ngrx/store';

import { Layout } from '@services/system-api.types/layouts.types';
import { alphabeticalSort } from '@utils/general';

import { CrossSystemLayoutsSelectors } from '../../cross-system-layouts';
import { LocalLayoutsSelectors } from '../../local-layouts';
import { UnsavedLayoutsSelectors } from '../../unsaved-layouts';
import { LayoutState, UnsavedState } from '../types/layout-state.types';
import { toCrossSystemLayoutState, toLocalLayoutState } from '../utils';

export const selectLayoutsState = createSelector(
    LocalLayoutsSelectors.selectLocalLayoutsState,
    CrossSystemLayoutsSelectors.selectCrossSystemLayoutsState,
    UnsavedLayoutsSelectors.selectUnsavedLayoutsState,
    (localLayouts, crossSystemLayouts, unsavedLayouts): LayoutState[] => {
        const unsaved = unsavedLayouts.map(({ id }) => id);
        const savedLocalLayouts = localLayouts
            .filter(({ id }) => !unsaved.includes(id))
            .map(toLocalLayoutState);
        const savedCrossSystemLayouts = crossSystemLayouts
            .filter(({ id }) => !unsaved.includes(id))
            .map(toCrossSystemLayoutState);
        return [...unsavedLayouts, ...savedLocalLayouts, ...savedCrossSystemLayouts].sort(
            alphabeticalSort(({ layout }) => layout.name),
        );
    },
);

export const selectLayoutsSavedState = createSelector(
    selectLayoutsState,
    (layouts): LayoutState[] => layouts.filter(({ unsaved }) => unsaved === UnsavedState.SAVED),
);

export const selectLayouts = createSelector(selectLayoutsState, (layouts): Layout[] =>
    layouts.map(({ layout }) => layout),
);

export const selectLayoutsBaseVersion = createSelector(
    LocalLayoutsSelectors.selectLocalLayoutsBaseVersion,
    CrossSystemLayoutsSelectors.selectCrossSystemLayoutsBaseVersion,
    (localLayoutsBaseVersion, crossSystemLayoutsBaseVersion): Record<string, string> => ({
        ...localLayoutsBaseVersion,
        ...crossSystemLayoutsBaseVersion,
    }),
);
