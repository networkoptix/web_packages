import { Layout } from '@services/system-api.types';

import {
    CrossSystemLayout,
    LayoutTypes,
    SavedCrossSystemLayoutState,
    SavedLocalLayoutState,
    UnsavedState,
} from './types/layout-state.types';

export const toLocalLayoutState = (layout: Layout): SavedLocalLayoutState => ({
    id: layout.id,
    layout,
    layoutType: LayoutTypes.LOCAL,
    unsaved: UnsavedState.SAVED,
});

export const toCrossSystemLayoutState = (
    layout: CrossSystemLayout,
): SavedCrossSystemLayoutState => ({
    id: layout.id,
    layout,
    layoutType: LayoutTypes.CROSS_SYSTEM,
    unsaved: UnsavedState.SAVED,
});
