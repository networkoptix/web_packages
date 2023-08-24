import { createSelector } from '@ngrx/store';

import staticLang from '@common/language/language_i18n_static.json';

import { selectLocalLayoutsState } from '../local-layouts/local-layouts.selectors';
import { UnsavedState } from '../shared/types/layout-state.types';

import { unsavedLayoutsFeature } from './unsaved-layouts.feature';

export const { selectUnsavedLayoutsState } = unsavedLayoutsFeature;

const { unsavedStates } = staticLang.layouts;

export const selectUnsavedLayoutsIds = createSelector(
    selectUnsavedLayoutsState,
    selectLocalLayoutsState,
    (unsavedLayouts, existingLayouts): Record<string, string> =>
        unsavedLayouts.reduce((unsavedLayouts, layout) => {
            unsavedLayouts[layout.id] =
                layout.unsaved === UnsavedState.PENDING
                    ? unsavedStates.saving
                    : existingLayouts.find(({ id }) => id === layout.id)
                    ? unsavedStates.changed
                    : unsavedStates.unsaved;
            return unsavedLayouts;
        }, {} as Record<string, string>),
);
