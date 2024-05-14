export interface FormattedServiceDetailRecord {
    id: string;
    type: string;
    usedBy: string;
    changed: string;
    channels: number;
    monthlyRate: number;
    fractionalUsage: number;
}

export interface ServiceDetailTotals {
    channels: number;
    monthlyRate: number;
    fractionalUsage: number;
}
