import type { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import type { ReadOnlyAPI } from '@services/nx-cloud-api/nx-cloud-api.types';

export const makeSystemName = system => {
    const name = system.info?.name || system.name || 'System';
    const version = system.info?.version || system.version || '';
    const versionString = version ? ' (' + version + ')' : '';
    return name + versionString;
};

export const makeReadonlyAPIName = (api: ReadOnlyAPI) => {
    const name = api.name;
    const version = api.version ? ' v. ' + api.version : '';

    return name + version;
};

export const makeDropdownDisplayName = (name: string, error: string) => {
    return error ? name + ' - ' + error : name;
};

export const findExistingItem = <
    Item extends DropdownItem<unknown>
>(dropdownList: Item[], itemValue: Item['value']): Item => {
    return dropdownList.find(dropdownItem => dropdownItem.value === itemValue);
};
