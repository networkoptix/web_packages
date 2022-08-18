import { createAction, props } from '@ngrx/store';

import type { BaseGroupsItem, SystemInfo } from '../groups.types';

export const reset = createAction('[System Groups] Reset');

export const setItems = createAction(
    '[System Groups] Set Items',
    props<{ items: BaseGroupsItem[] }>()
);

export const setSystemInfo = createAction(
    '[System Groups] Set System Info',
    props<{ systemInfo: SystemInfo[] }>()
);
