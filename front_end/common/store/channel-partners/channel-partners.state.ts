import {
    ChannelPartner,
    ChannelPartnersStructure,
    Organization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

export const enum LoadingState {
    INIT = 'INIT',
    LOADING = 'LOADING',
    LOADED = 'LOADED',
}

export interface Banner {
    message: string;
    icon: string;
    type: 'error';
    page: 'channel-partner' | 'organization';
}

export interface ChannelPartnersState {
    arePartnerOrgsLoading: boolean;
    channelPartnersAndOrgsLoadState: LoadingState;
    currentParentPartnerId: string;
    currentPartnerId: string;
    currentOrgId: string;
    currentSubchannels: ChannelPartner[];
    currentPartnerOrganizations: Organization[];
    channelPartners: ChannelPartner[];
    organizations: Organization[];
    rootOrganizations: Organization[];
    channelStructure: ChannelPartnersStructure | undefined;
    hasStoreLoaded: boolean;
    banner: Banner | null;
    parentPartnerForCurrentChild: ChannelPartner | null;
}
