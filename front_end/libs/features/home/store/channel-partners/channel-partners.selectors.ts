import { createFeatureSelector, createSelector } from '@ngrx/store';

import { ChannelPartnersState } from './channel-partners.state';

const selectChannelPartnersState = createFeatureSelector<ChannelPartnersState>('channelPartners');

export const selectChannelPartners = createSelector(
    selectChannelPartnersState,
    state => state.channelPartners,
);

export const selectOrganizations = createSelector(
    selectChannelPartnersState,
    state => state.organizations,
);

export const selectVisitedPartners = createSelector(
    selectChannelPartnersState,
    state => state.visitedPartners,
);
