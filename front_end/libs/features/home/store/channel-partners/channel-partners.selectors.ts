import { createFeatureSelector, createSelector, MemoizedSelector } from '@ngrx/store';

import { ChannelPartner } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

import { ChannelPartnersState } from './channel-partners.state';

const selectChannelPartnersState = createFeatureSelector<ChannelPartnersState>('channelPartners');

export const selectChannelPartners = createSelector(
    selectChannelPartnersState,
    state => state.channelPartners,
);

export const selectRootOrganizations = createSelector(
    selectChannelPartnersState,
    state => state.rootOrganizations,
);

export const selectVisitedPartners = createSelector(
    selectChannelPartnersState,
    state => state.visitedPartners,
);

export const selectCurrentPartnerId = createSelector(
    selectChannelPartnersState,
    state => state.currentPartnerId,
);

export const selectCurrentPartnerOrgs = createSelector(
    selectChannelPartnersState,
    state => state.currentPartnerOrganizations,
);

export const selectCurrentOrgId = createSelector(
    selectChannelPartnersState,
    state => state.currentOrgId,
);

export const selectCurrentSubchannelPartners = createSelector(
    selectChannelPartnersState,
    state => state.currentSubchannels,
);

export const selectCurrentPartner = createSelector(
    selectChannelPartners,
    selectCurrentPartnerId,
    (partners, id) => partners.find(partner => partner.id === id),
);

export const selectCurrentOrganization = createSelector(
    selectRootOrganizations,
    selectCurrentOrgId,
    (orgs, id) => orgs.find(org => org.id === id),
);

export const selectCurrentOrganizations = createSelector(
    selectCurrentPartner,
    partner => partner.organizations,
);

export const selectSubchannelPartner = (
    id: string,
): MemoizedSelector<ChannelPartnersState, ChannelPartner> =>
    createSelector(selectCurrentSubchannelPartners, (partners: ChannelPartner[]) =>
        partners.find(partner => partner.id === id),
    );
