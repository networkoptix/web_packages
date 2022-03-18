export interface DropdownItem<Value = any> {
    name: string,
    help?: string,
    value?: Value,
    state?: string,
    disabled?: boolean,
    icon?: string
}
