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
    props<{ rootOrganizations: Organization[] }>(),
);

export const setChannelPartnersAndOrgs = createAction(
    '[Channel Partners] Set Channel Partners and Orgs',
    props<{ channelPartners: ChannelPartner[]; rootOrganizations: Organization[] }>(),
);

export const setCurrentPartnerId = createAction(
    '[Channel Parnters] Set current partner id',
    props<{ currentPartnerId: string }>(),
);

export const setCurrentOrgId = createAction(
    '[Channel Partners] Set current org id',
    props<{ currentOrgId: string }>(),
);

export const setCurrentPartner = createAction(
    '[Channel Partners] Set current partner and partner orgs',
    props<{ currentPartnerId: string; currentPartnerOrganizations: Organization[] }>(),
);

export const addPartnerOrg = createAction(
    '[Channel Partners] Add partner organization',
    props<{ newPartnerOrg: Organization }>(),
);

export const setCurrentSubchannelPartners = createAction(
    '[Channel Partners] Set current subchannels',
    props<{ currentSubchannels: ChannelPartner[] }>(),
);

export const loadPartnerOrgs = createAction(
    '[Channel Partners] Load partner organizations',
    props<{ partnerId: string }>(),
);

export const loadChannelPartnersAndOrgs = createAction(
    '[Channel Partners] Load channel partners and organizations',
);
