import { createSelector } from '@ngrx/store';

import staticLang from '@common/language/language_i18n_static.json';
import { dirtyId } from '@utils/general';

import { selectLocalLayoutsState } from '../local-layouts/local-layouts.selectors';
import { UnsavedState } from '../shared/types/layout-state.types';
import { hashItem } from '../shared/utils';

import { unsavedLayoutsFeature } from './unsaved-layouts.feature';

export const { selectUnsavedLayoutsState } = unsavedLayoutsFeature;

const { unsavedStates } = staticLang.layouts;

export const selectUnsavedLayoutsInfo = createSelector(
    selectUnsavedLayoutsState,
    selectLocalLayoutsState,
    (
        unsavedLayoutsState,
        existingLayouts,
    ): { states: Record<string, string>; overwrites: Record<string, string> } =>
        unsavedLayoutsState.reduce(
            (unsavedLayouts, layout) => {
                const layoutId = dirtyId(layout.id);
                const existingWithSameName = existingLayouts.find(
                    ({ name, id, parentId }) =>
                        name === layout.layout.name &&
                        id !== layout.id &&
                        'parentId' in layout.layout &&
                        layout.layout.parentId === parentId,
                );

                if (existingWithSameName) {
                    unsavedLayouts.overwrites[layoutId] = existingWithSameName.id;
                }

                unsavedLayouts.states[layoutId] =
                    layout.unsaved === UnsavedState.ERROR
                        ? unsavedStates.error
                        : layout.unsaved === UnsavedState.PENDING
                          ? unsavedStates.saving
                          : existingWithSameName
                            ? unsavedStates.overwrite
                            : !existingLayouts.find(({ id }) => id === layout.id)
                              ? unsavedStates.unsaved
                              : hashItem(existingLayouts.find(({ id }) => id === layout.id)) ===
                                  layout.baseVersion
                                ? unsavedStates.changed
                                : unsavedStates.diverged;
                return unsavedLayouts;
            },
            { states: {}, overwrites: {} } as {
                states: Record<string, string>;
                overwrites: Record<string, string>;
            },
        ),
);

export const selectUnsavedLayoutsIds = createSelector(
    selectUnsavedLayoutsInfo,
    ({ states }) => states,
);

export const selectUnsavedLayoutsOverwrites = createSelector(
    selectUnsavedLayoutsInfo,
    ({ overwrites }) => overwrites,
);
