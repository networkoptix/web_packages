import { createSelector } from '@ngrx/store';
import { memoize, uniq } from 'lodash-es';

import { extractSystemAndResourceId } from '@utils/extract-system-and-resources';
import { dirtyId } from '@utils/general';

import { selectActiveLayoutState } from '../../active-layout/active-layout.selectors';
import { selectCrossSystemLayoutsState } from '../../cross-system-layouts/cross-system-layouts.selectors';
import { selectLocalLayoutsState } from '../../local-layouts/local-layouts.selectors';
import { selectUnsavedLayoutsState } from '../../unsaved-layouts/unsaved-layouts.selectors';
import { LayoutState, LayoutTypes } from '../types/layout-state.types';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const findLayoutFactory =
    (selectedLayoutId: string) =>
    <T extends { id: string }>(layouts: T[]): T | undefined =>
        layouts.find(({ id }) => dirtyId(id || '') === dirtyId(selectedLayoutId || ''));

export const selectCurrentLayoutState = createSelector(
    selectActiveLayoutState,
    selectLocalLayoutsState,
    selectCrossSystemLayoutsState,
    selectUnsavedLayoutsState,
    (selectedLayoutId, localLayouts, crossSystemLayouts, unsavedLayouts): LayoutState => {
        const findLayout = findLayoutFactory(selectedLayoutId);

        return (findLayout(unsavedLayouts) ||
            findLayout(localLayouts) ||
            findLayout(crossSystemLayouts)) as LayoutState;
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

export const selectCurrentLayout = createSelector(selectCurrentLayoutState, state => state?.layout);

export const selectOtherSystems = memoize((currentSystemId: string) => {
    return createSelector(
        selectActiveLayoutState,
        selectCrossSystemLayoutsState,
        selectUnsavedLayoutsState,
        (selectedLayoutId, crossSystemLayouts, unsavedLayouts): string[] => {
            const findLayout = findLayoutFactory(selectedLayoutId);
            const currentLayout =
                findLayout(unsavedLayouts)?.layout || findLayout(crossSystemLayouts);

            if (!currentLayout) {
                return [];
            }

            return uniq(
                currentLayout.items
                    .map(({ resourcePath }) => extractSystemAndResourceId(resourcePath)?.systemId)
                    .filter(systemId => systemId && systemId !== currentSystemId),
            );
        },
    );
});
