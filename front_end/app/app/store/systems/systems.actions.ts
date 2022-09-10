import { createAction, props } from '@ngrx/store';

import type {
    NxSystemWithUserInfo
} from '@services/system.service/system-types';

export const set = createAction(
    '[App Systems] Set System',
    props<{ systems: Array<NxSystemWithUserInfo> }>()
);

export const clear = createAction('[App Systems] Clear System');
