export class DropdownItem<Value = any> {
    constructor(
        public name: string,
        public help?: string,
        public value?: Value,
        public state?: string,
        public disabled?: boolean,
        public icon?: string
    ) {}
}
