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

    searchString = input('', { transform: (value: string) => value.toLowerCase() });

    searchableValue = computed<string | undefined>(() => {
        if (this.searchString()) {
            return this.searchString();
        }
        const value = this.value();
        if (typeof value === 'string') {
            return value.toLowerCase();
        }
        if (typeof value === 'number') {
            return String(value);
        }
        return undefined;
    });

    @HostBinding('class.disabled') @Input() disabled: boolean = false;
    @HostBinding('attr.aria-label') @Input('aria-label') ariaLabel: string = '';

    @HostBinding('class.hidden') hidden = false;

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

    hide(): void {
        this.hidden = true;
    }
    show(): void {
        this.hidden = false;
    }
}
