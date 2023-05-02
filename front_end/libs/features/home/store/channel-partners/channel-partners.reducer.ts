import { createReducer, on } from '@ngrx/store';

import * as ChannelPartnerActions from './channel-partners.actions';
import { ChannelPartnersState } from './channel-partners.state';

const initialState: ChannelPartnersState = {
    channelPartners: [],
    organizations: [],
    visitedPartners: [],
};

export const channelPartnersReducer = createReducer(
    initialState,
    on(
        ChannelPartnerActions.setChannelPartners,
        (state, { channelPartners }): ChannelPartnersState => ({
            ...state,
            channelPartners,
        }),
    ),
    on(
        ChannelPartnerActions.setOrganizations,
        (state, { organizations }): ChannelPartnersState => ({
            ...state,
            organizations,
        }),
    ),
    on(
        ChannelPartnerActions.setVisitedPartners,
        (state, { visitedPartners }): ChannelPartnersState => ({
            ...state,
            visitedPartners,
        }),
    ),
);
