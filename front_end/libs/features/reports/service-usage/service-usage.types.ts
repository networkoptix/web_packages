import { ServiceType } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

export interface FormattedUsageReportRecord {
    serviceId: string;
    serviceName: string;
    serviceType: ServiceType;
    usedByPartnerCount: number;
    usedByOrgCount: number;
    usedBySystemCount: number;
    channels: number;
    monthlyRate: number;
    fractionalUsage: number;
}
