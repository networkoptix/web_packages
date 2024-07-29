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
    currentPartnerSupportInformation: undefined,
    currentOrgId: null,
    currentSubChannels: [],
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
        (state, { channelPartners, organizations, rootOrganizations }): ChannelPartnersState => ({
            ...state,
            hasStoreLoaded: true,
            channelPartnersAndOrgsLoadState: LoadingState.LOADED,
            channelPartners: sortEntityByName(channelPartners),
            organizations: sortEntityByName(organizations),
            rootOrganizations: sortEntityByName(rootOrganizations),
        }),
    ),
    on(
        ChannelPartnerActions.addOrganizations,
        (state, { organizations }): ChannelPartnersState => ({
            ...state,
            organizations: sortEntityByName(
                (() => {
                    const existingOrgIds = new Set<string>();
                    return [...organizations, ...state.organizations].filter(org =>
                        existingOrgIds.has(org.id) ? false : !!existingOrgIds.add(org.id),
                    );
                })(),
            ),
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
        ChannelPartnerActions.setCurrentPartnerSupportInfo,
        (state, { currentPartnerSupportInfo }): ChannelPartnersState => ({
            ...state,
            currentPartnerSupportInformation: currentPartnerSupportInfo,
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
        ChannelPartnerActions.setCurrentSubChannelPartners,
        (state, { currentSubchannels }): ChannelPartnersState => ({
            ...state,
            currentSubChannels: sortEntityByName(currentSubchannels),
        }),
    ),
    on(
        ChannelPartnerActions.setCurrentParentPartnerForChild,
        (state, { parentPartnerForCurrentChild }): ChannelPartnersState => ({
            ...state,
            parentPartnerForCurrentChild,
        }),
    ),
    on(ChannelPartnerActions.patchOrganization, (state, { patch }): ChannelPartnersState => {
        const { rootOrganizations, currentPartnerOrganizations } = state;
        const rootIndex = rootOrganizations.findIndex(org => org.id === patch.id);
        if (rootIndex !== -1) {
            const newRoot = rootOrganizations.slice();
            newRoot.splice(rootIndex, 1, patch);
            return {
                ...state,
                rootOrganizations: newRoot,
            };
        }

        const partnerOrgIndex = currentPartnerOrganizations.findIndex(org => org.id === patch.id);
        const patchedPartnerOrgs = currentPartnerOrganizations.slice();
        patchedPartnerOrgs.splice(partnerOrgIndex, 1, patch);
        return {
            ...state,
            currentPartnerOrganizations: patchedPartnerOrgs,
        };
    }),
    on(ChannelPartnerActions.removeRootOrganization, (state, { id }): ChannelPartnersState => {
        const { rootOrganizations } = state;
        return {
            ...state,
            rootOrganizations: rootOrganizations.filter(org => org.id !== id),
        };
    }),
    on(ChannelPartnerActions.patchPartner, (state, { patch }): ChannelPartnersState => {
        const { channelPartners } = state;
        const patchIndex = channelPartners.findIndex(p => p.id === patch.id);
        const patchedPartners = channelPartners.slice();
        patchedPartners.splice(patchIndex, 1, patch);
        return {
            ...state,
            channelPartners: patchedPartners,
        }
    }),
);
