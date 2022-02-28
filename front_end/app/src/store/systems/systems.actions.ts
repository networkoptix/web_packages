import { createAction, props } from '@ngrx/store';

import { NxSystemWithUserInfo } from '../../services/systems.service';

export const set = createAction(
    '[App Systems] Set System',
    props<{ systems: Array<NxSystemWithUserInfo> }>()
);

export const clear = createAction('[App Systems] Clear System');
