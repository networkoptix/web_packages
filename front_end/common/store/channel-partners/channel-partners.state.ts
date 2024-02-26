import {
    ChannelPartner,
    Organization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

export interface ChannelPartnersState {
    arePartnerOrgsLoading: boolean;
    areChannelPartnersAndOrgsLoading: boolean;
    currentPartnerId: string;
    currentOrgId: string;
    currentSubchannels: ChannelPartner[];
    currentPartnerOrganizations: Organization[];
    channelPartners: ChannelPartner[];
    rootOrganizations: Organization[];
}
