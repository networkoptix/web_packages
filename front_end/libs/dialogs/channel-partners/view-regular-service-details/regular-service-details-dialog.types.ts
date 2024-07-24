export interface RegularServiceDialogRecord {
    changed: string;
    channels: number;
    monthlyRate: number;
    fractionalUsage: number;
    isChangeRecord: boolean;
}

export interface RegularServiceDialogTotals {
    channels: number;
    monthlyRate: number;
    fractionalUsage: number;
}
