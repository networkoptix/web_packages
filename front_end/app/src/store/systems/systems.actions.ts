import { createAction, props } from '@ngrx/store';

import { NxSystemWithUserInfo } from '../../services/systems.service';

export const set = createAction('[Counter Component] Increment',
    props<{ systems: Array<NxSystemWithUserInfo> }>());

export const clear = createAction('[Counter Component] Decrement');
