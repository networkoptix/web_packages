import { HiddenNameLink } from '../hidden-name-link/hidden-name-link.types';

export interface FormattedRegularServiceRecord {
    id: string;
    type: string;
    usedBy: string | HiddenNameLink;
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
