import type { Translatable } from '@pipes/nx-translate.types';

export interface ContentToggle {
    nodeId: string;
    state: boolean;
}

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
    params?: Record<string, string>;
}

interface Alert {
    count: number;
    type: string;
}

export interface Level2Item {
    id?: string;
    label?: string;
    items?: Level2Button[];
    level3?: Level3Item[];

    path?: string;
    disabled?: boolean;
    additionalLabel?: string;
    query?: Record<string, string>;
    icon?: string;
}

export interface Level2Button {
    id: string;
    label: string;
    disabled: boolean;
}

export interface Level3Item {
    id: string;
    label: string;
    path: string;
    query?: Record<string, string>;

    additionalLabel?: Translatable;
    subNode?: Level1Item | Level2Item;
    icon?: string;
    svgIcon?: string;
    indent?: boolean;
    svg?: string;
    disabled?: boolean;

    horizontal?: true;
    // Used to get a horizontal divider (See menu.component.html)
}
