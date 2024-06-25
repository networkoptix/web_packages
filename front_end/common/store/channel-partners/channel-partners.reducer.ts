import { createReducer, on } from '@ngrx/store';

import { alphaNumericSortByName } from '@utils/general';

import * as ChannelPartnerActions from './channel-partners.actions';
import { ChannelPartnersState, LoadingState } from './channel-partners.state';

const sortEntityByName = <T extends { name: string }>(toBeSorted: T[]): T[] =>
    toBeSorted ? [...toBeSorted].sort(alphaNumericSortByName) : toBeSorted;

const initialState: ChannelPartnersState = {
    arePartnerOrgsLoading: false,
    channelPartnersAndOrgsLoadState: LoadingState.INIT,
    currentParentPartnerId: null,
    currentPartnerId: null,
    currentOrgId: null,
    currentSubchannels: [],
    currentPartnerOrganizations: [],
    channelPartners: [],
    organizations: [],
    rootOrganizations: [],
    channelStructure: undefined,
    hasStoreLoaded: false,
    banner: null,
    parentPartnerForCurrentChild: null,
};

export const channelPartnersReducer = createReducer(
    initialState,
    on(
        ChannelPartnerActions.loadPartner,
        (state, { partnerId, currentParentPartnerId }): ChannelPartnersState => ({
            ...state,
            currentPartnerId: partnerId,
            currentParentPartnerId,
            arePartnerOrgsLoading: true,
        }),
    ),
    on(
        ChannelPartnerActions.showBannerAction,
        (state, { banner }): ChannelPartnersState => ({
            ...state,
            banner,
        }),
    ),
    on(ChannelPartnerActions.hideBannerAction, state => ({
        ...state,
        banner: null,
    })),
    on(
        ChannelPartnerActions.loadChannelPartnersAndOrgs,
        (state): ChannelPartnersState => ({
            ...state,
            channelPartnersAndOrgsLoadState: LoadingState.LOADING,
        }),
    ),
    on(
        ChannelPartnerActions.loadChannelStructure,
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
        ChannelPartnerActions.setCurrentParentPartnerId,
        (state, { currentParentPartnerId }): ChannelPartnersState => ({
            ...state,
            currentParentPartnerId,
        }),
    ),
    on(
        ChannelPartnerActions.setChannelStructure,
        (state, { channelStructure }): ChannelPartnersState => ({
            ...state,
            hasStoreLoaded: true,
            channelPartnersAndOrgsLoadState: LoadingState.LOADED,
            channelStructure,
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
    on(
        ChannelPartnerActions.setCurrentParentPartnerForChild,
        (state, { parentPartnerForCurrentChild }): ChannelPartnersState => ({
            ...state,
            parentPartnerForCurrentChild,
        }),
    ),
);
