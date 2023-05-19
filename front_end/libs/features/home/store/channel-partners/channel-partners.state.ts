import {
    ChannelPartner,
    Organization,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

export interface ChannelPartnersState {
    currentPartnerId: string;
    currentOrgId: string;
    currentPartnerOrganizations: Organization[];
    channelPartners: ChannelPartner[];
    rootOrganizations: Organization[];
    visitedPartners: Record<string, boolean>;
}
