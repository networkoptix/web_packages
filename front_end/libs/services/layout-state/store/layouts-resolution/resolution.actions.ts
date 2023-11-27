import { createAction, props } from '@ngrx/store';

import { Resolution } from '@services/layout-state/store/layouts-resolution/resolution.types';

export const updateLayoutResolution = createAction(
    '[Layouts Resolution] Set layouts-resolution of Layout',
    props<{ resolution: Resolution; layoutId: string }>(),
);

export const updateCameraResolution = createAction(
    '[Layouts Resolution] Set layouts-resolution of Layout Camera',
    props<{ resolution: Resolution; layoutId: string; cameraId: string }>(),
);
