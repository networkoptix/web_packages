export interface FormattedUsageReportRecord {
    serviceId: string;
    serviceName: string;
    usedByPartnerCount: number;
    usedByOrgCount: number;
    usedBySystemCount: number;
    channels: number;
    monthlyRate: number;
    fractionalUsage: number;
}
