import { createSelector } from '@ngrx/store';
import { memoize } from 'lodash-es';

import { dirtyId } from '@utils/general';

import { layoutsResolutionFeature } from './layoutsResolutionFeature';
import { LayoutsResolutionState, Resolution } from './resolution.types';

export const { selectLayoutsResolutionState } = layoutsResolutionFeature;

export const selectLayoutResolution = memoize((layoutId: string) => {
    layoutId = dirtyId(layoutId);

    return createSelector(
        selectLayoutsResolutionState,
        (resolution: LayoutsResolutionState) =>
            (layoutId && resolution[layoutId]?.resolution) || Resolution.AUTO,
    );
});

export const selectCameraResolution = memoize(
    (layoutId: string, cameraId: string) => {
        layoutId = dirtyId(layoutId);
        cameraId = dirtyId(cameraId);
        return createSelector(
            selectLayoutsResolutionState,
            (resolution: LayoutsResolutionState) =>
                (layoutId &&
                    cameraId &&
                    resolution[layoutId] &&
                    resolution[layoutId].cameras[cameraId] &&
                    resolution[layoutId].cameras[cameraId].resolution) ||
                (resolution[layoutId] &&
                    resolution[layoutId].resolution !== Resolution.CUSTOM &&
                    resolution[layoutId].resolution) ||
                Resolution.AUTO,
        );
    },
    (layoutId: string, cameraId: string) => `${dirtyId(layoutId)}-${dirtyId(cameraId)}`,
);
