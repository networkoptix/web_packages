import { createAction, props } from '@ngrx/store';

import {
    ChannelPartner,
    Organization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

export const setChannelPartners = createAction(
    '[Channel Partners] Set channel partners',
    props<{ channelPartners: ChannelPartner[] }>(),
);

export const setOrganizations = createAction(
    '[Channel Partners] Set Organiations',
    props<{ organizations: Organization[] }>(),
);

export const setVisitedPartners = createAction(
    '[Channel Partners] Set visited partners',
    props<{ visitedPartners: number[] }>(),
);
