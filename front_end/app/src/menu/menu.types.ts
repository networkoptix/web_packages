import type { Params } from '@angular/router';

import type { SearchModel } from '@services/search.service';

export interface Content {
    base: string;
    selectedSection: string;
    selectedSubSection?: string;
    selectedDetailsSection?: string;
    level1: Level1Item[];
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
export interface SanitizedLevel1Item extends Level1Item {
    level3?: SanitizedLevel3Item[];
}

export interface Level2Item {
    id: string;
    label?: string;
    items: Level2Button[]
    level3?: SanitizedLevel3Item[];

    path?: string;
    disabled?: boolean;
    additionalText?: string;
    additionalLabel?: string;
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
    icon?: string;
    svgIcon?: string;
    indent?: boolean;
    svg?: string;
    disabled?: boolean;

    horizontal?: true;
    // Used to get a horizontal divider (See menu.component.html)
}

// NxMenuService.sanitizeContent()
export interface SanitizedLevel3Item extends Level3Item {
    label: string;
    additionalLabel?: string;
    additionalText?: string;
}
