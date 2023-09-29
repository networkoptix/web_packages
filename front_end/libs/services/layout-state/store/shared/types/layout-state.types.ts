import { Layout } from '@services/system-api.types';

// TODO: Need to figure out where this type should go
export interface CrossSystemLayout {
    id: string;
    name: string;
}

export const enum LayoutTypes {
    LOCAL = 'local',
    CROSS_SYSTEM = 'cross-system',
}

export const enum UnsavedState {
    SAVED = 0,
    PENDING = 1,
    UNSAVED = 2,
}

interface BaseLayoutState<LayoutTypeName, LayoutType, Unsaved> {
    id: string;
    layoutType: LayoutTypeName;
    layout: LayoutType;
    unsaved: Unsaved;
    baseVersion: string;
}

export interface LocalLayoutState
    extends BaseLayoutState<LayoutTypes.LOCAL, Layout, UnsavedState> {}

export interface CrossSystemLayoutState
    extends BaseLayoutState<LayoutTypes.CROSS_SYSTEM, CrossSystemLayout, UnsavedState> {}

export interface SavedLocalLayoutState
    extends BaseLayoutState<LayoutTypes.LOCAL, Layout, UnsavedState.SAVED> {}

export interface SavedCrossSystemLayoutState
    extends BaseLayoutState<LayoutTypes.CROSS_SYSTEM, CrossSystemLayout, UnsavedState.SAVED> {}

export interface UnsavedLocalLayoutState
    extends BaseLayoutState<
        LayoutTypes.LOCAL,
        Layout,
        UnsavedState.UNSAVED | UnsavedState.PENDING
    > {}

export interface UnsavedCrossSystemLayoutState
    extends BaseLayoutState<
        LayoutTypes.CROSS_SYSTEM,
        CrossSystemLayout,
        UnsavedState.UNSAVED | UnsavedState.PENDING
    > {}

export type LayoutState = LocalLayoutState | CrossSystemLayoutState;

export type UnsavedLayoutState = UnsavedLocalLayoutState | UnsavedCrossSystemLayoutState;
