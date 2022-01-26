import type { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import type { OpenAPIJSON } from '@services/nx-cloud-api.types';

export const makeSystemName = (system) => {
    const name = system.info?.name || system.name || 'System';
    const version = system.info?.version || system.version || '';
    const versionString = version ? ' (' + version + ')' : '';
    return name + versionString;
};

export const makeReadonlyAPIName = (api: OpenAPIJSON) => {
    const name = api.name;
    const version = api.version ? ' v. ' + api.version : '';

    return name + version;
};

export const makeDropdownDisplayName = (name: string, error: string) => {
    return error ? name + ' - ' + error : name;
};

export const findExistingItem = (dropdownList: DropdownItem[], item) => {
    return dropdownList.find(dropdownItem => dropdownItem.value === item);
};
