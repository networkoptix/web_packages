import { Component, HostBinding, HostListener, Input } from '@angular/core';

import { NxDropdownComponent } from '../../dropdown.component';

@Component({ template: '' })
export abstract class BaseDropdownItem<T> {
    @Input() value: T;

    @HostBinding('class.disabled') @Input() disabled: boolean = false;
    @HostBinding('class.selected') @Input() selected: boolean = false;
    @HostBinding('attr.aria-label') @Input('aria-label') ariaLabel: string = '';

    @HostBinding('attr.role') role = 'option';

    @HostListener('click', ['$event']) onClick(event: UIEvent): void {
        event.preventDefault();
        if (!this.disabled) {
            if (this.value !== undefined) {
                this.select.handleOptionSelected(this);
            } else {
                this.select.handleOptionSelected(undefined);
            }
        }
    }

    constructor(private select: NxDropdownComponent<T>) {}

    // This can be any html string that you want displayed in the selected portion of the dropdown
    abstract getOptionHtml(): string;
}
