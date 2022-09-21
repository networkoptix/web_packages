import type {
    DropdownItem
} from '@components/dropdowns/generic/dropdown.component.types';
import type {
    MultiSelectItem
} from '@components/dropdowns/multi-select/multi-select.component.types';
import type { SearchModel } from '@services/search.service.types';

/** Extend this with selects/mulitselects and other params */
export type SearchParams = Partial<{
    search: string;
    tags: string;
    page: string;
}>;

export interface SearchTag {
    id: string,
    label: string,
    value: boolean,
}

export interface SearchFilter extends SearchModel {
    tags?: SearchTag[],
    selects?: Array<{
        id: string;
        label: string;
        items: DropdownItem<string>[];
        selected: DropdownItem<string>;
        css?: string;
    }>,
    multiselects?: Array<{
        id: string;
        label: string;
        items: MultiSelectItem[];
        selected: string[];
        singular?: string;
        searchLabel?: string;
        searchLabelSingular?: string;
    }>,
    search?: string;
}
