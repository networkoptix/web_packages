import { createSelector } from '@ngrx/store';

import { Layout } from '@services/system-api.types/layouts.types';
import { alphabeticalSort } from '@utils/general';

import { selectLocalLayoutsState } from '../../local-layouts/local-layouts.selectors';
import { selectUnsavedLayoutsState } from '../../unsaved-layouts/unsaved-layouts.selectors';
import { LayoutState, LayoutTypes, LocalLayoutState } from '../types/layout-state.types';
import { toLocalLayoutState } from '../utils';

const isLocalLayoutState = (layout: LayoutState): layout is LocalLayoutState =>
    layout.layoutType === LayoutTypes.LOCAL;

export const selectLayouts = createSelector(
    selectLocalLayoutsState,
    selectUnsavedLayoutsState,
    (localLayouts, unsavedLayouts): LayoutState[] => {
        const unsaved = unsavedLayouts.map(({ id }) => id);
        const savedLocalLayouts = localLayouts
            .filter(({ id }) => !unsaved.includes(id))
            .map(toLocalLayoutState);
        return [...unsavedLayouts, ...savedLocalLayouts].sort(
            alphabeticalSort(({ layout }) => layout.name),
        );
    },
);

export const selectLocalLayouts = createSelector(selectLayouts, (layouts): Layout[] =>
    layouts.filter(isLocalLayoutState).map(({ layout }) => layout),
);
