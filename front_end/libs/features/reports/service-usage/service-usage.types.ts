export enum EntityType {
    channelPartner = 'channel-partner',
    organization = 'organization',
}

export interface FormattedUsageReportRecord {
    serviceName: string;
    usedBy: string | number;
    channels: number;
    monthlyRate: number;
    fractionalUsage: number;
}
