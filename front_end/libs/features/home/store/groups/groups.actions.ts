import { createAction, props } from '@ngrx/store';

import type { BaseGroupsItem, OpenGroups, SystemInfo } from '../../home.types';

export const reset = createAction('[System Groups] Reset');

export const setItems = createAction(
    '[System Groups] Set Items',
    props<{ items: BaseGroupsItem[] }>(),
);

export const setSystemInfo = createAction(
    '[System Groups] Set System Info',
    props<{ systemInfo: SystemInfo[] }>(),
);

export const setCurrentGroupId = createAction(
    '[System Groups] Set current group ID',
    props<{ currentGroupId: string }>(),
);

export const setOpenGroups = createAction(
    '[SystemGroups] Set open groups',
    props<{ openGroups: OpenGroups }>(),
);
