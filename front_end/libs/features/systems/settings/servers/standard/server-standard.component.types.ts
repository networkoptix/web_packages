import type {
    DropdownItem
} from '@components/dropdowns/generic/dropdown.component.types';

export interface DropdownStorage extends DropdownItem<string> {
    id: string;
    isOnline: boolean;
    isUsedForWriting?: boolean;
    isWritable: boolean;
    isNotSystem: boolean;
    selected: boolean;
    freeSpace: number;
}
