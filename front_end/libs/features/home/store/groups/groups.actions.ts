import { createAction, props } from '@ngrx/store';

import type { System } from '@services/nx-cloud-api/nx-cloud-api.types';

import type { BaseGroupsItem, OpenGroups } from '../../home.types';

export const reset = createAction('[System Groups] Reset');

export const setItems = createAction(
    '[System Groups] Set Items',
    props<{ items: BaseGroupsItem[] }>(),
);

export const setSystemInfo = createAction(
    '[System Groups] Set System Info',
    props<{ orgSystems: System[] }>(),
);

export const setCurrentGroupId = createAction(
    '[System Groups] Set current group ID',
    props<{ currentGroupId: string }>(),
);

export const setOpenGroups = createAction(
    '[SystemGroups] Set open groups',
    props<{ openGroups: OpenGroups }>(),
);
