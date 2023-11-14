import md5 from 'md5';
import stringify from 'safe-stable-stringify';

import { Layout } from '@services/system-api.types/layouts.types';

import {
    CrossSystemLayout,
    LayoutTypes,
    SavedCrossSystemLayoutState,
    SavedLocalLayoutState,
    UnsavedState,
} from './types/layout-state.types';

export const hashItem = (layout: unknown): string => md5(stringify(layout));

export const toLocalLayoutState = (layout: Layout): SavedLocalLayoutState => ({
    id: layout.id,
    layout,
    layoutType: LayoutTypes.LOCAL,
    unsaved: UnsavedState.SAVED,
    baseVersion: hashItem(layout),
});

export const toCrossSystemLayoutState = (
    layout: CrossSystemLayout,
): SavedCrossSystemLayoutState => ({
    id: layout.id,
    layout,
    layoutType: LayoutTypes.CROSS_SYSTEM,
    unsaved: UnsavedState.SAVED,
    baseVersion: hashItem(layout),
});
