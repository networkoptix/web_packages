import {createReducer, on} from '@ngrx/store';

import * as ChannelPartnerActions from './channel-partners.actions';
import {ChannelPartnersState, LoadingState} from './channel-partners.state';

const initialState: ChannelPartnersState = {
    arePartnerOrgsLoading: false,
    channelPartnersAndOrgsLoadState: LoadingState.INIT,
    currentPartnerId: null,
    currentOrgId: null,
    currentSubchannels: [],
    currentPartnerOrganizations: [],
    channelPartners: [],
    rootOrganizations: [],
    hasStoreLoaded: false,
};

export const channelPartnersReducer = createReducer(
    initialState,
    on(
        ChannelPartnerActions.loadPartnerOrgs,
        (state): ChannelPartnersState => ({
            ...state,
            arePartnerOrgsLoading: true,
        }),
    ),
    on(
        ChannelPartnerActions.loadChannelPartnersAndOrgs,
        (state): ChannelPartnersState => ({
            ...state,
            channelPartnersAndOrgsLoadState: LoadingState.LOADING,
        }),
    ),
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
        ChannelPartnerActions.setChannelPartnersAndOrgs,
        (state, { channelPartners, rootOrganizations }): ChannelPartnersState => ({
            ...state,
            hasStoreLoaded: true,
            channelPartnersAndOrgsLoadState: LoadingState.LOADED,
            channelPartners,
            rootOrganizations,
        }),
    ),
    on(
        ChannelPartnerActions.setCurrentPartnerId,
        (state, { currentPartnerId }): ChannelPartnersState => ({
            ...state,
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
            arePartnerOrgsLoading: false,
            currentPartnerId,
            currentPartnerOrganizations,
        }),
    ),
    on(
        ChannelPartnerActions.addPartnerOrg,
        (state, { newPartnerOrg }): ChannelPartnersState => ({
            ...state,
            currentPartnerOrganizations: [...state.currentPartnerOrganizations, newPartnerOrg],
        }),
    ),
    on(
        ChannelPartnerActions.setCurrentSubchannelPartners,
        (state, { currentSubchannels }): ChannelPartnersState => ({
            ...state,
            currentSubchannels,
        }),
    ),
);
