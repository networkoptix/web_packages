import {
    OrganizationStructure,
    PartnerStructure,
} from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

export interface FormattedOrganizationStructure extends OrganizationStructure {
    parentPartner: string | null;
}

export interface FormattedPartnerStructure extends PartnerStructure {
    parentPartner: string | null;
    subChannels: FormattedPartnerStructure[];
    organizations: FormattedOrganizationStructure[];
}

export interface FormattedChannelStructure {
    channelPartners: FormattedPartnerStructure[];
    organizations: FormattedOrganizationStructure[];
}
