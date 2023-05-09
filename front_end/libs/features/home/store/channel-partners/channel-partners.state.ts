import {
    ChannelPartner,
    Organization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

export interface ChannelPartnersState {
    currentPartnerId: number;
    currentOrgId: number;
    currentPartnerOrganizations: Organization[];
    channelPartners: ChannelPartner[];
    rootOrganizations: Organization[];
    visitedPartners: Record<string, boolean>;
}
