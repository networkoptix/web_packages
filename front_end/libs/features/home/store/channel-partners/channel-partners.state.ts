import {
    ChannelPartner,
    Organization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

export interface ChannelPartnersState {
    channelPartners: ChannelPartner[];
    organizations: Organization[];
    visitedPartners: number[];
}
