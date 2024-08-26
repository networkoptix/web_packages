import { HiddenNameLink } from '../hidden-name-link/hidden-name-link.types';

export interface BaseFormattedExpiringServiceRecord {
    id: string;
    type: string;
    channels: number;
    expirationDate: string;
    hasMultipleExpirations: boolean;
}

export interface EntityFormattedExpiringServiceRecord extends BaseFormattedExpiringServiceRecord {
    usedBy: string | HiddenNameLink;
}

export interface SystemFormattedExpiringServiceRecord extends BaseFormattedExpiringServiceRecord {
    usedByPath: string[];
}

export type FormattedExpiringServiceRecord =
    | EntityFormattedExpiringServiceRecord
    | SystemFormattedExpiringServiceRecord;

export interface ExpiringServiceTotals {
    channels: number;
}
