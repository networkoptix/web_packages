export interface FormattedUsageReportRecord {
    serviceId: string;
    serviceName: string;
    usedBy: string | number;
    channels: number;
    monthlyRate: number;
    fractionalUsage: number;
}
