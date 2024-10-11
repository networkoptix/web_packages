import { createSelector } from '@ngrx/store';
import { memoize } from 'lodash-es';

import { dirtyId } from '@utils/general';

import { selectActiveLayoutState } from '../active-layout/active-layout.selectors';

import { layoutsResolutionFeature } from './layoutsResolutionFeature';
import { CamerasResolution, LayoutsResolutionState, Resolution } from './resolution.types';

export const { selectLayoutsResolutionState } = layoutsResolutionFeature;

export const selectLayoutResolution = memoize((layoutId: string) => {
    layoutId = dirtyId(layoutId);

    return createSelector(selectLayoutsResolutionState, (resolution: LayoutsResolutionState) => {
        const layoutResolution = (layoutId && resolution[layoutId]?.resolution) || Resolution.AUTO;

        if (
            layoutId &&
            Object.values(resolution[layoutId]?.cameras || {}).some(
                ({ resolution }) => resolution && resolution !== layoutResolution,
            )
        ) {
            return Resolution.CUSTOM;
        }

        return layoutResolution;
    });
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

export const selectCurrentLayoutCamerasLookup = createSelector(
    selectActiveLayoutState,
    selectLayoutsResolutionState,
    (layoutId, resolution: LayoutsResolutionState) => {
        const layoutState = layoutId
            ? resolution[dirtyId(layoutId)]
            : { cameras: {}, resolution: Resolution.AUTO };

        return new Proxy(layoutState?.cameras || {}, {
            get(target, prop: string) {
                return (
                    target[dirtyId(prop)] || {
                        resolution: layoutState?.resolution,
                    }
                );
            },
        });
    },
);

export const selectCurrentLayoutResolution = createSelector(
    selectActiveLayoutState,
    selectLayoutsResolutionState,
    (layoutId, resolution: LayoutsResolutionState) =>
        (layoutId && resolution[dirtyId(layoutId)]?.resolution) || Resolution.AUTO,
);

export const selectCurrentLayoutHighResolution = createSelector(
    selectCurrentLayoutResolution,
    selectCurrentLayoutCamerasLookup,
    (resolution: Resolution, deviceResolutions: CamerasResolution) =>
        [resolution, ...Object.values(deviceResolutions).map(({ resolution }) => resolution)].some(
            resolution => resolution === Resolution.HIGH,
        ),
);
