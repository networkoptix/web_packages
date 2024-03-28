import { createFeatureSelector, createSelector, MemoizedSelector } from '@ngrx/store';

import {
    ChannelPartner,
    Organization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';
import { alphaNumericSort } from '@utils/general';

import { ChannelPartnersState } from './channel-partners.state';

const sortEntityByName = <T extends { name: string }>(toBeSorted: T[]): T[] =>
    toBeSorted
        ? [...toBeSorted].sort(alphaNumericSort(window.navigator.language, entity => entity.name))
        : toBeSorted;

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

export const selectChannelPartners = createSelector(
    selectChannelPartnersState,
    state => state.channelPartners,
);

export const selectRootChannelPartners = createSelector(selectChannelPartners, channelPartners => {
    const channelPartnerIds = new Set<string>(channelPartners.map(partner => partner.id));
    return channelPartners.filter(
        partner =>
            !partner.parentChannelPartner || !channelPartnerIds.has(partner.parentChannelPartner),
    );
});

export const selectRootOrganizations = createSelector(selectChannelPartnersState, state =>
    sortEntityByName(state.rootOrganizations),
);

export const selectOrganizations = createSelector(
    selectChannelPartnersState,
    state => state.organizations,
);

export const selectCurrentPartnerId = createSelector(
    selectChannelPartnersState,
    state => state.currentPartnerId,
);

export const selectCurrentPartnerOrgs = createSelector(selectChannelPartnersState, state =>
    sortEntityByName(state.currentPartnerOrganizations),
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
    (partners, id) => partners?.find(partner => partner.id === id),
);

export const selectCurrentPartnerInfo = createSelector(
    selectCurrentPartner,
    partner => partner?.supportInformation,
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
    createSelector(selectCurrentSubchannelPartners, (partners: ChannelPartner[]) =>
        partners.find(partner => partner.id === id),
    );
