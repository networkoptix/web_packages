export interface MultiSelectItem {
    id: string;
    label: string;
    selected?: boolean;
    tooltip?: string;
    disabled?: boolean;
}

export enum DATA_TYPE {
    ANY,
    GROUPS,
    PERMISSIONS,
}
