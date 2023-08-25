import { ChannelPartnerUser } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

export interface ChannelPartnerUserExt extends ChannelPartnerUser {
    userId: string;
    fullName: string;
    accessLevel: string[];
}
