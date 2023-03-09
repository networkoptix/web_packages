export enum DataStructureType {
    TEXT = 'text',
    DROPDOWN = 'dropdown',
}

export enum SortOptions {
    TEXT = 'text',
    DATE = 'date',
}

export enum GroupingOptions {
    TEXT = 'textAlpha',
    DATE_DAY = 'dateDay',
    DATE_MONTH = 'dateMonth',
    DATE_AUTO = 'dateAuto',
}

export interface DataStructureFilter {
    sortable?: SortOptions;
    multiSelect?: boolean;
    grouping?: GroupingOptions;
}

export interface DataStructureMeta {
    options?: Record<any, any>;
    icon?: string;
    tooltip?: string;
    styles?: string;
    filter?: DataStructureFilter;
}
