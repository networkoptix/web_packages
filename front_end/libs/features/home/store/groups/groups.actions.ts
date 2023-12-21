import { createAction, props } from '@ngrx/store';

import { GroupItem } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

import type { OpenGroups } from '../../home.types';

export const reset = createAction('[System Groups] Reset');

export const setGroups = createAction(
    '[System Groups] Set groups',
    props<{ groups: GroupItem[] }>(),
);

export const setCurrentGroupId = createAction(
    '[System Groups] Set current group ID',
    props<{ currentGroupId: string }>(),
);

export const setOpenGroups = createAction(
    '[SystemGroups] Set open groups',
    props<{ openGroups: OpenGroups }>(),
);
