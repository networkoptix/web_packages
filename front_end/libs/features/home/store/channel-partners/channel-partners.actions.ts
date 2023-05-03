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

export const setCurrentPartnerId = createAction(
    '[Channel Parnters] Set current partner',
    props<{ currentPartnerId: number }>(),
);
