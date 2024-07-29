import { createAction, props } from '@ngrx/store';

import {
    ChannelPartner,
    ChannelPartnersStructure,
    Organization,
    SupportInformationServer,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { Banner } from '@store/channel-partners/channel-partners.state';

export const loadPartner = createAction(
    '[Channel Partners] Load partner',
    props<{ partnerId: string; currentParentPartnerId: string }>(),
);

export const showBannerAction = createAction(
    '[Channel Partners] Set Banner',
    props<{ banner: Banner }>(),
);

export const hideBannerAction = createAction('[Channel Partners] Hide Banner');

export const loadChannelPartnersAndOrgs = createAction(
    '[Channel Partners] Load channel partners and organizations',
    props<{ includeChildOrgs: boolean }>(),
);

export const loadChannelStructure = createAction(
    '[Channel Partners] Load channel partners structure',
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
    props<{
        channelPartners: ChannelPartner[];
        organizations: Organization[];
        rootOrganizations: Organization[];
    }>(),
);

export const addOrganizations = createAction(
    '[Channel Partners] Add Organizations',
    props<{
        organizations: Organization[];
    }>(),
);

export const setChannelPartnersAndRootOrgs = createAction(
    '[Channel Partners] Set Channel Partners and Root Orgs',
    props<{ channelPartners: ChannelPartner[]; rootOrganizations: Organization[] }>(),
);

export const setChannelStructure = createAction(
    '[Channel Partners] Set channel structure',
    props<{
        channelStructure: ChannelPartnersStructure;
    }>(),
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

export const setCurrentPartnerSupportInfo = createAction(
    "[Channel Partners] Set current partner's support information",
    props<{
        currentPartnerSupportInfo: SupportInformationServer | undefined;
    }>(),
);

export const addPartnerOrg = createAction(
    '[Channel Partners] Add partner organization',
    props<{ newPartnerOrg: Organization }>(),
);

export const setCurrentSubChannelPartners = createAction(
    '[Channel Partners] Set current subchannels',
    props<{ currentSubchannels: ChannelPartner[] }>(),
);

export const loadCurrentParentPartnerForChild = createAction(
    '[Channel Partners] Load current parent partner for a child partner or org',
    props<{ parentId: string }>(),
);

export const setCurrentParentPartnerForChild = createAction(
    '[Channel Partners] Set current parent partner for a child partner or org',
    props<{ parentPartnerForCurrentChild: ChannelPartner | null }>(),
);

export const patchOrganization = createAction(
    '[Channel Partners] Patch an organization',
    props<{ patch: Organization }>(),
);

export const removeRootOrganization = createAction(
    '[Channel Partners] Remove a root organization',
    props<{ id: string }>(),
);

export const patchPartner = createAction(
    '[Channel Partners] Patch a channel partner',
    props<{ patch: ChannelPartner }>(),
);
