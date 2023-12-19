import { Component, HostBinding, HostListener, Inject, Input } from '@angular/core';

import { BaseDropdownComponent } from '../../base-dropdown.component';
import { BaseDropdownInjectionToken } from '../../dropdown.types';

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
            this.select.handleOptionSelected(this);
        }
    }

    constructor(
        @Inject(BaseDropdownInjectionToken) private select: BaseDropdownComponent<T, boolean>,
    ) {}

    // This can be any html string that you want displayed in the selected portion of the dropdown
    abstract getOptionHtml(): string;
}
