import { createReducer, on } from '@ngrx/store';

import * as ChannelPartnerActions from './channel-partners.actions';
import { ChannelPartnersState } from './channel-partners.state';

const initialState: ChannelPartnersState = {
    currentPartnerId: null,
    channelPartners: [],
    organizations: [],
    visitedPartners: {},
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
        ChannelPartnerActions.setCurrentPartnerId,
        (state, { currentPartnerId }): ChannelPartnersState => ({
            ...state,
            visitedPartners: { ...state.visitedPartners, currentPartnerId: true },
            currentPartnerId,
        }),
    ),
);
