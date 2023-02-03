import type { AdditionalFilter } from '@components/console-table/console-table.component.types';

export enum FilterSort {
    ASC = 'asc',
    DESC = 'desc',
    NONE = '',
}

interface Selection {
    name: string;
    value: boolean;
}

export interface FilterState {
    sort: FilterSort;
    selections: Selection[];
}

export interface FilterUpdatePayload {
    filter: AdditionalFilter;
    state: FilterState;
}
