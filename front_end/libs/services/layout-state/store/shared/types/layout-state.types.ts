import { Layout } from '@services/system-api.types';

export const enum LayoutTypes {
    LOCAL = 'local',
    CROSS_SYSTEM = 'cross-system',
}

export const enum UnsavedState {
    SAVED = 0,
    PENDING = 1,
    UNSAVED = 2,
    ERROR = 3,
}

interface BaseLayoutState<LayoutTypeName, LayoutType, Unsaved> {
    id: string;
    layoutType: LayoutTypeName;
    layout: LayoutType;
    unsaved: Unsaved;
    baseVersion: string;
}

interface LayoutTypeCrossSystem {
    layoutType: LayoutTypes.CROSS_SYSTEM;
}

export interface LocalLayoutState
    extends BaseLayoutState<LayoutTypes.LOCAL, Layout, UnsavedState> {}

export interface CrossSystemLayoutState
    extends BaseLayoutState<LayoutTypes.CROSS_SYSTEM, Layout, UnsavedState> {}

export interface SavedLocalLayoutState
    extends BaseLayoutState<LayoutTypes.LOCAL, Layout, UnsavedState.SAVED> {}

export interface SavedCrossSystemLayoutState
    extends Omit<SavedLocalLayoutState, 'layoutType'>,
        LayoutTypeCrossSystem {}

export interface UnsavedLocalLayoutState
    extends BaseLayoutState<LayoutTypes.LOCAL, Layout, Exclude<UnsavedState, UnsavedState.SAVED>> {}

export interface UnsavedCrossSystemLayoutState
    extends Omit<UnsavedLocalLayoutState, 'layoutType'>,
        LayoutTypeCrossSystem {}

export type LayoutState = LocalLayoutState | CrossSystemLayoutState;

export type UnsavedLayoutState = UnsavedLocalLayoutState | UnsavedCrossSystemLayoutState;
