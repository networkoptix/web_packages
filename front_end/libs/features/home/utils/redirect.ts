const toPartner = (partnerId: string): string => `/home/channel-partners/${partnerId}`;
const toPartnerSubChannels = (partnerId: string): string =>
    `/home/channel-partners/${partnerId}/subchannels`;
const toOrg = (partnerId: string): string => `/home/organization/${partnerId}`;
const toSubChannelPartner = (partnerId: string): string => `/home/subchannel/${partnerId}`;

export const PartnerRedirect = {
    toOrg,
    toPartner,
    toPartnerSubChannels,
    toSubChannelPartner,
};
