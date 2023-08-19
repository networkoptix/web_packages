import { createSelector } from '@ngrx/store';

import { selectActiveLayoutState } from '../../active-layout/active-layout.selectors';
import { selectLocalLayoutsState } from '../../local-layouts/local-layouts.selectors';
import { selectUnsavedLayoutsState } from '../../unsaved-layouts/unsaved-layouts.selectors';
import { LayoutState, LayoutTypes } from '../types/layout-state.types';
import { toLocalLayoutState } from '../utils';

export const selectCurrentLayoutState = createSelector(
    selectActiveLayoutState,
    selectLocalLayoutsState,
    selectUnsavedLayoutsState,
    (selectedLayoutId, localLayouts, unsavedLayouts): LayoutState => {
        const unsavedLayout = unsavedLayouts.find(({ id }) => id === selectedLayoutId);
        const localLayout = localLayouts.find(({ id }) => id === selectedLayoutId);

        if (unsavedLayout) {
            return unsavedLayout;
        }

        if (localLayout) {
            return toLocalLayoutState(localLayout);
        }
    },
);

export const selectCurrentLayoutType = createSelector(
    selectCurrentLayoutState,
    ({ layoutType }): LayoutTypes => layoutType,
);

export const selectCurrentLayoutUnsaved = createSelector(
    selectCurrentLayoutState,
    (state): boolean => Boolean(state.unsaved),
);

export const selectCurrentLayout = createSelector(selectCurrentLayoutState, state => state.layout);
