import { createSelector } from '@ngrx/store';

import staticLang from '@common/language/language_i18n_static.json';
import { dirtyId } from '@utils/general';

import { selectLocalLayoutsState } from '../local-layouts/local-layouts.selectors';
import { UnsavedState } from '../shared/types/layout-state.types';
import { hashItem } from '../shared/utils';

import { unsavedLayoutsFeature } from './unsaved-layouts.feature';

export const { selectUnsavedLayoutsState } = unsavedLayoutsFeature;

const { unsavedStates } = staticLang.layouts;

export const selectUnsavedLayoutsIds = createSelector(
    selectUnsavedLayoutsState,
    selectLocalLayoutsState,
    (unsavedLayouts, existingLayouts): Record<string, string> =>
        unsavedLayouts.reduce(
            (unsavedLayouts, layout) => {
                unsavedLayouts[dirtyId(layout.id)] =
                    layout.unsaved === UnsavedState.PENDING
                        ? unsavedStates.saving
                        : !existingLayouts.find(({ id }) => id === layout.id)
                          ? unsavedStates.unsaved
                          : hashItem(existingLayouts.find(({ id }) => id === layout.id)) ===
                              layout.baseVersion
                            ? unsavedStates.changed
                            : unsavedStates.diverged;
                return unsavedLayouts;
            },
            {} as Record<string, string>,
        ),
);
