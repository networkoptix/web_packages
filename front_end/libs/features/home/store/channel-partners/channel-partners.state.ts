import {
    ChannelPartner,
    Organization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

export interface ChannelPartnersState {
    currentPartnerId: number;
    channelPartners: ChannelPartner[];
    organizations: Organization[];
    visitedPartners: Record<string, boolean>;
}
