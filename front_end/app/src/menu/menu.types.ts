import type { Params } from '@angular/router';

import type { SearchModel } from '@services/search.service';
import type { NxSystem } from '@services/system.service';

export interface Content {
    base: string;
    selectedSection: string;
    selectedSubSection?: string;
    selectedDetailsSection?: string;
    level1: Level1Item[];

    searchableResults?: boolean;
    system?: NxSystem;
}

export interface Level1Item {
    id: string;
    label: string;
    path: string;
    svg?: string;
    level2?: Level2Item[];
    level3?: Level3Item[];

    toggle?: boolean;
    alerts?: Alert[];
    icon?: string;
    query?: string;
}

interface Alert {
    count: number;
    type: string;
}

// NxMenuService.sanitizeContent()
export type SanitizedLevel1Item = Omit<Level1Item, 'level3'> & {
    level3?: SanitizedLevel3Item[];
}

export interface Level2Item {
    id: string;
    label?: string;
    items: Level2Button[]
    level3?: SanitizedLevel3Item[];

    path?: string;
    isEnabled?: boolean;
    additionalText?: string;
    query?: SearchModel;
    icon?: string;
}

export interface Level2Button {
    id: string;
    label: (() => string) | string;
    disabled: boolean;
}

export interface Level3Item {
    id: string;
    label: string | string[];
    path: string;
    query?: Params;

    additionalLabel?: string | string[];
    additionalText?: string | string[];
    subNode?: Level1Item | Level2Item;
    horizontal?: boolean;
    icon?: string;
    svgIcon?: string;
    indent?: boolean;
    disabled?: boolean;
    svg?: string;
    isEnabled?: boolean;
}

// NxMenuService.sanitizeContent()
export type SanitizedLevel3Item = Omit<
    Level3Item,
    'label' | 'additionalLabel' | 'additionalText'
> & {
    label: string;
    additionalLabel?: string; // Sanitized
    additionalText?: string; // Sanitized
}
