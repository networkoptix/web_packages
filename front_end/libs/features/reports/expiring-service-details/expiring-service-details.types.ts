export interface FormattedExpiringServiceRecord {
    id: string;
    usedBy: string;
    channels: number;
    expirationDate: string;
}

export interface ExpiringServiceTotals {
    channels: number;
}
