export interface FormattedUsageReportRecord {
    serviceId: string;
    serviceName: string;
    usedByPartnerOrSystemCount: number;
    usedByOrgCount: number;
    channels: number;
    monthlyRate: number;
    fractionalUsage: number;
}
