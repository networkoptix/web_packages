export interface FormattedExpiringServiceRecord {
    id: string;
    type: string;
    usedBy: string;
    channels: number;
    expirationDate: string;
    hasMultipleExpirations: boolean;
}

export interface ExpiringServiceTotals {
    channels: number;
}
