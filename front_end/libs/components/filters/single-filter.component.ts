import { CommonModule } from '@angular/common';
import { Component, computed, forwardRef, signal } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

import { BaseFilterComponent } from './base-filter.component';
import { BaseFilterInjectionToken } from './filters.types';

@Component({
    imports: [CommonModule],
    selector: 'nx-single-filter',
    templateUrl: 'filter.component.html',
    styleUrls: ['filter.component.scss'],
    standalone: true,
    providers: [
        {
            provide: BaseFilterInjectionToken,
            useExisting: forwardRef(() => NxSingleFilterComponent),
        },
        {
            provide: BaseFilterComponent,
            useExisting: forwardRef(() => NxSingleFilterComponent),
        },
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => NxSingleFilterComponent),
            multi: true,
        },
    ],
})
export class NxSingleFilterComponent<T> extends BaseFilterComponent<T, false> {
    selectedValue = signal<T | undefined>(undefined);

    override handleSelectionChange(newSelectedValue: T): void {
        if (this.selectedValue() === newSelectedValue) {
            this.updateSelected(undefined);
        } else {
            this.updateSelected(newSelectedValue);
        }
    }

    override clearSelectedValue(): void {
        this.updateSelected(undefined);
    }

    override selectedValueExists = computed(() => this.selectedValue() !== undefined);

    override isFilterItemSelected = (item: T): boolean => this.selectedValue() === item;
}
