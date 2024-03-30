import { createReducer, on } from '@ngrx/store';

import { alphaNumericSort } from '@utils/general';

import * as ChannelPartnerActions from './channel-partners.actions';
import { ChannelPartnersState, LoadingState } from './channel-partners.state';

const sortEntityByName = <T extends { name: string }>(toBeSorted: T[]): T[] =>
    toBeSorted ? [...toBeSorted].sort(alphaNumericSort(entity => entity.name)) : toBeSorted;

const initialState: ChannelPartnersState = {
    arePartnerOrgsLoading: false,
    channelPartnersAndOrgsLoadState: LoadingState.INIT,
    currentPartnerId: null,
    currentOrgId: null,
    currentSubchannels: [],
    currentPartnerOrganizations: [],
    channelPartners: [],
    organizations: [],
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
            channelPartners: sortEntityByName(channelPartners),
        }),
    ),
    on(
        ChannelPartnerActions.setRootOrganizations,
        (state, { rootOrganizations }): ChannelPartnersState => ({
            ...state,
            rootOrganizations: sortEntityByName(rootOrganizations),
        }),
    ),
    on(
        ChannelPartnerActions.setChannelPartnersAndOrgs,
        (state, { channelPartners, organizations }): ChannelPartnersState => ({
            ...state,
            hasStoreLoaded: true,
            channelPartnersAndOrgsLoadState: LoadingState.LOADED,
            channelPartners: sortEntityByName(channelPartners),
            organizations: sortEntityByName(organizations),
        }),
    ),
    on(
        ChannelPartnerActions.setChannelPartnersAndRootOrgs,
        (state, { channelPartners, rootOrganizations }): ChannelPartnersState => ({
            ...state,
            hasStoreLoaded: true,
            channelPartnersAndOrgsLoadState: LoadingState.LOADED,
            channelPartners: sortEntityByName(channelPartners),
            rootOrganizations: sortEntityByName(rootOrganizations),
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
            currentPartnerOrganizations: sortEntityByName(currentPartnerOrganizations),
        }),
    ),
    on(
        ChannelPartnerActions.addPartnerOrg,
        (state, { newPartnerOrg }): ChannelPartnersState => ({
            ...state,
            currentPartnerOrganizations: sortEntityByName([
                ...state.currentPartnerOrganizations,
                newPartnerOrg,
            ]),
        }),
    ),
    on(
        ChannelPartnerActions.setCurrentSubchannelPartners,
        (state, { currentSubchannels }): ChannelPartnersState => ({
            ...state,
            currentSubchannels: sortEntityByName(currentSubchannels),
        }),
    ),
);
