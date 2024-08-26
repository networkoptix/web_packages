import { HiddenNameLink } from '../hidden-name-link/hidden-name-link.types';

interface BaseFormattedRegularServiceRecord {
    id: string;
    type: string;
    changed: string;
    channels: number;
    monthlyRate: number;
    fractionalUsage: number;
}

export interface EntityFormattedRegularServiceRecord extends BaseFormattedRegularServiceRecord {
    usedBy: string | HiddenNameLink;
}

export interface SystemFormattedRegularServiceRecord extends BaseFormattedRegularServiceRecord {
    usedByPath: string[];
}

export type FormattedRegularServiceRecord =
    | EntityFormattedRegularServiceRecord
    | SystemFormattedRegularServiceRecord;

export interface RegularServiceTotals {
    channels: number;
    monthlyRate: number;
    fractionalUsage: number;
}
