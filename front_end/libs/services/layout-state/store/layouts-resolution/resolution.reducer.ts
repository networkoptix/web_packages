import { Action, createReducer, on } from '@ngrx/store';

import {
    LayoutsResolutionState,
    Resolution,
} from '@services/layout-state/store/layouts-resolution/resolution.types';
import { dirtyId } from '@utils/general';

import * as LayoutResolutionActions from './resolution.actions';

export const initialState: LayoutsResolutionState = {};

export const layoutsResolutionReducer = createReducer(
    initialState,
    on(
        LayoutResolutionActions.updateLayoutResolution,
        (state, { resolution, layoutId }): LayoutsResolutionState => ({
            ...state,
            [dirtyId(layoutId)]: {
                resolution,
                cameras: {},
            },
        }),
    ),
    on(
        LayoutResolutionActions.updateCameraResolution,
        (state, { resolution, layoutId, cameraId }): LayoutsResolutionState => {
            layoutId = dirtyId(layoutId);
            cameraId = dirtyId(cameraId);

            return {
                ...state,
                [layoutId]: {
                    ...state[layoutId],
                    resolution:
                        state[layoutId]?.resolution !== resolution ? Resolution.CUSTOM : resolution,
                    cameras: {
                        ...state[layoutId]?.cameras,
                        [cameraId]: {
                            resolution,
                        },
                    },
                },
            };
        },
    ),
);

export const reducer = (
    state: LayoutsResolutionState | undefined,
    action: Action,
): LayoutsResolutionState => {
    return layoutsResolutionReducer(state, action);
};
