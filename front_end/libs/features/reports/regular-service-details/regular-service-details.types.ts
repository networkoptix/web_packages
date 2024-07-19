export interface FormattedRegularServiceRecord {
    id: string;
    type: string;
    usedBy: string;
    changed: string;
    channels: number;
    monthlyRate: number;
    fractionalUsage: number;
}

export interface RegularServiceTotals {
    channels: number;
    monthlyRate: number;
    fractionalUsage: number;
}
