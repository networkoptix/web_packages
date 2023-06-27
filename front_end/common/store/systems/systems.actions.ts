import { createAction, props } from '@ngrx/store';

import type { NxSystemInfo } from '@services/systems.service.types';

export const set = createAction(
    '[App Systems] Set System',
    props<{ systems: Array<NxSystemInfo> }>(),
);

export const clear = createAction('[App Systems] Clear System');
