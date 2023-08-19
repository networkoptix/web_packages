import { createSelector } from '@ngrx/store';

import { selectLocalLayoutsState } from '../../local-layouts/local-layouts.selectors';
import { selectUnsavedLayoutsState } from '../../unsaved-layouts/unsaved-layouts.selectors';
import { LayoutState } from '../types/layout-state.types';
import { toLocalLayoutState } from '../utils';

export const selectLayouts = createSelector(
    selectLocalLayoutsState,
    selectUnsavedLayoutsState,
    (localLayouts, unsavedLayouts): LayoutState[] => {
        const unsaved = unsavedLayouts.map(({ id }) => id);
        const savedLocalLayouts = localLayouts
            .filter(({ id }) => !unsaved.includes(id))
            .map(toLocalLayoutState);
        return [...unsavedLayouts, ...savedLocalLayouts];
    },
);
