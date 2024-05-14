export interface UsageDetailDialogRecord {
    changed: string;
    channels: number;
    monthlyRate: number;
    fractionalUsage: number;
    isChangeRecord: boolean;
}

export interface UsageDetailDialogTotals {
    channels: number;
    monthlyRate: number;
    fractionalUsage: number;
}
