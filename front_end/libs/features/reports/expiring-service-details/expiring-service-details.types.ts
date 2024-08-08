import { HiddenNameLink } from '../hidden-name-link/hidden-name-link.types';

export interface FormattedExpiringServiceRecord {
    id: string;
    type: string;
    usedBy: string | HiddenNameLink;
    channels: number;
    expirationDate: string;
    hasMultipleExpirations: boolean;
}

export interface ExpiringServiceTotals {
    channels: number;
}
