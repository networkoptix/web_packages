import { createReducer, on } from '@ngrx/store';

import * as ChannelPartnerActions from './channel-partners.actions';
import { ChannelPartnersState } from './channel-partners.state';

const initialState: ChannelPartnersState = {
    currentPartnerId: null,
    currentOrgId: null,
    currentPartnerOrganizations: [],
    channelPartners: [],
    rootOrganizations: [],
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
        (state, { rootOrganizations }): ChannelPartnersState => ({
            ...state,
            rootOrganizations,
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
    on(
        ChannelPartnerActions.setCurrentOrgId,
        (state, { currentOrgId }): ChannelPartnersState => ({
            ...state,
            currentOrgId,
        }),
    ),
    on(
        ChannelPartnerActions.setCurrentPartner,
        (state, { currentPartnerId, currentPartnerOrganizations }): ChannelPartnersState => ({
            ...state,
            currentPartnerId,
            currentPartnerOrganizations,
        }),
    ),
);
