import { createAction, props } from '@ngrx/store';

import {
    ChannelPartner,
    Organization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

export const loadPartner = createAction(
    '[Channel Partners] Load partner',
    props<{ partnerId: string; currentParentPartnerId: string }>(),
);

export const loadPartnerOrgs = createAction(
    '[Channel Partners] Load partner organizations',
    props<{ partnerId: string }>(),
);

export const setShowPermissionWarning = createAction(
    '[Channel Partners] Set Admin permissions',
    props<{ showPermissionWarning: boolean }>(),
);

export const loadChannelPartnersAndOrgs = createAction(
    '[Channel Partners] Load channel partners and organizations',
    props<{ includeChildOrgs: boolean }>(),
);

export const setChannelPartners = createAction(
    '[Channel Partners] Set channel partners',
    props<{ channelPartners: ChannelPartner[] }>(),
);

export const setRootOrganizations = createAction(
    '[Channel Partners] Set Root Organizations',
    props<{ rootOrganizations: Organization[] }>(),
);

export const setChannelPartnersAndOrgs = createAction(
    '[Channel Partners] Set Channel Partners and Orgs',
    props<{ channelPartners: ChannelPartner[]; organizations: Organization[] }>(),
);

export const setChannelPartnersAndRootOrgs = createAction(
    '[Channel Partners] Set Channel Partners and Root Orgs',
    props<{ channelPartners: ChannelPartner[]; rootOrganizations: Organization[] }>(),
);

export const setCurrentPartnerId = createAction(
    '[Channel Partners] Set current partner id',
    props<{ currentPartnerId: string }>(),
);

export const setCurrentOrgId = createAction(
    '[Channel Partners] Set current org id',
    props<{ currentOrgId: string }>(),
);

export const setCurrentParentPartnerId = createAction(
    '[Channel Partners] Set current parent channel partner id',
    props<{ currentParentPartnerId: string }>(),
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
