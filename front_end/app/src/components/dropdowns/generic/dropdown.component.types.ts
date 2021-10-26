export class DropdownItem {
    constructor(
        public name: string,
        public help?: string,
        public value?: string | number,
        public state?: string,
        public disabled?: boolean
    ) {}
}
