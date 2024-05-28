const toPartner = (partnerId: string): string => `/home/channelPartners/${partnerId}`;
const toPartnerSubChannels = (partnerId: string): string =>
    `/home/channelPartners/${partnerId}/subchannels`;
const toOrg = (partnerId: string): string => `/home/organization/${partnerId}`;
const toSubChannelPartner = (partnerId: string): string => `/home/subChannel/${partnerId}`;

export const PartnerRedirect = {
    toOrg,
    toPartner,
    toPartnerSubChannels,
    toSubChannelPartner,
};
