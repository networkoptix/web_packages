import type { DropdownItem } from '../generic/dropdown.component.types';

export interface SearchableDropdownItem extends DropdownItem<string> {
    // These are used for internal highlighting and should not
    // be assigned in the parent component
    highlightedName?: string;
    highlightedHelp?: string;
}
