import { createFeatureSelector, createSelector, MemoizedSelector } from '@ngrx/store';

import {
    ChannelPartner,
    ChannelPartnersStructure,
    Organization,
    OrganizationStructure,
    PartnerStructure,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

import { ChannelPartnersState } from './channel-partners.state';

const selectChannelPartnersState = createFeatureSelector<ChannelPartnersState>('channelPartners');

export const selectArePartnerOrgsLoading = createSelector(
    selectChannelPartnersState,
    state => state.arePartnerOrgsLoading,
);

export const selectAreChannelPartnersAndOrgsLoading = createSelector(
    selectChannelPartnersState,
    state => state.channelPartnersAndOrgsLoadState,
);

export const selectHasStoreLoaded = createSelector(
    selectChannelPartnersState,
    state => state.hasStoreLoaded,
);

export const selectBanner = createSelector(selectChannelPartnersState, state => state.banner);

export const selectChannelPartners = createSelector(
    selectChannelPartnersState,
    state => state.channelPartners,
);

export const selectCurrentParentPartnerForChild = createSelector(
    selectChannelPartnersState,
    state => state.parentPartnerForCurrentChild,
);

export const selectRootChannelPartners = createSelector(selectChannelPartners, channelPartners => {
    const channelPartnerIds = new Set<string>(channelPartners.map(partner => partner.id));
    return channelPartners.filter(
        partner =>
            !partner.parentChannelPartner || !channelPartnerIds.has(partner.parentChannelPartner),
    );
});

export const selectRootOrganizations = createSelector(
    selectChannelPartnersState,
    state => state.rootOrganizations,
);

export const selectOrganizations = createSelector(
    selectChannelPartnersState,
    state => state.organizations,
);

export const selectChannelStructure = createSelector(
    selectChannelPartnersState,
    state => state.channelStructure,
);

// traverse the channel structure tree to get all partners in the format Map<partnerId, partner>
export const selectPartnersFromStructure = createSelector(
    selectChannelStructure,
    (channelStructure: ChannelPartnersStructure) => {
        const partners = new Map<string, PartnerStructure>();
        function traversePartner(partner: PartnerStructure): void {
            partners.set(partner.id, partner);
            partner.subChannels.forEach(traversePartner);
        }
        channelStructure.channelPartners.forEach(traversePartner);
        return partners;
    },
);

// traverse the channel structure tree to get all orgs in the format Map<orgId, org>
export const selectOrgsFromStructure = createSelector(
    selectChannelStructure,
    (channelStructure: ChannelPartnersStructure) => {
        const orgs = new Map<string, OrganizationStructure>();
        channelStructure.organizations.forEach(org => orgs.set(org.id, org));
        function traverserPartner(partner: PartnerStructure): void {
            partner.organizations.forEach(org => orgs.set(org.id, org));
            partner.subChannels.forEach(traverserPartner);
        }
        channelStructure.channelPartners.forEach(traverserPartner);
        return orgs;
    },
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

export const selectCurrentParentChannelPartnerId = createSelector(
    selectChannelPartnersState,
    state => state.currentParentPartnerId,
);

export const selectCurrentSubChannelPartners = createSelector(
    selectChannelPartnersState,
    state => state.currentSubChannels,
);

export const selectCurrentPartner = createSelector(
    selectChannelPartners,
    selectCurrentPartnerId,
    (partners, id) => partners?.find(partner => partner.id === id),
);

export const selectCurrentPartnerSupportInfo = createSelector(
    selectChannelPartnersState,
    state => state.currentPartnerSupportInformation,
);

export const selectCurrentOrganization = createSelector(
    selectRootOrganizations,
    selectCurrentPartnerOrgs,
    selectCurrentOrgId,
    (rootOrgs, partnerOrgs, id) => {
        const orgs: Organization[] = [];
        if (rootOrgs) {
            orgs.push(...rootOrgs);
        }
        if (partnerOrgs) {
            orgs.push(...partnerOrgs);
        }
        return orgs.find(org => org.id === id);
    },
);

export const selectSubchannelPartner = (
    id: string,
): MemoizedSelector<ChannelPartnersState, ChannelPartner> =>
    createSelector(selectCurrentSubChannelPartners, (partners: ChannelPartner[]) =>
        partners.find(partner => partner.id === id),
    );

export const selectCurrentPartnerParent = createSelector(
    selectCurrentParentChannelPartnerId,
    selectChannelPartners,
    (parentId: string, partners: ChannelPartner[]) => partners.find(({ id }) => id === parentId),
);
