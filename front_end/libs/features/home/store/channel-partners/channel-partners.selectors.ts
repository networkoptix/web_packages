import { createFeatureSelector, createSelector } from '@ngrx/store';

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

export const selectCurrentPartner = createSelector(
    selectChannelPartners,
    selectCurrentPartnerId,
    (partners, id) => partners.find(partner => partner.id === id),
);

export const selectCurrentOrganization = createSelector(
    selectCurrentPartnerOrgs,
    selectCurrentOrgId,
    (orgs, id) => orgs.find(org => org.id === id),
);

export const selectCurrentOrganizations = createSelector(
    selectCurrentPartner,
    partner => partner.organizations,
);
