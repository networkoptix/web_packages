import {
    Component,
    HostBinding,
    HostListener,
    Inject,
    Input,
    computed,
    input,
} from '@angular/core';

import { BaseFilterComponent } from '../base-filter.component';
import { BaseFilterInjectionToken } from '../filters.types';

@Component({ template: '' })
export abstract class BaseFilterItem<T> {
    value = input.required<T>();

    @HostBinding('class.disabled') @Input() disabled: boolean = false;
    @HostBinding('attr.aria-label') @Input('aria-label') ariaLabel: string = '';

    @HostListener('click', ['$event']) onClick(event: MouseEvent): void {
        event.preventDefault();
        if (!this.disabled) {
            this.select.handleSelectionChange(this.value());
        }
    }

    isSelected = computed(() => {
        // Tracking the selected value so computed can re-run when the selected value changes
        this.select.selectedValue();
        return this.select.isFilterItemSelected(this.value());
    });

    constructor(
        @Inject(BaseFilterInjectionToken) private select: BaseFilterComponent<T, boolean>,
    ) {}
}
