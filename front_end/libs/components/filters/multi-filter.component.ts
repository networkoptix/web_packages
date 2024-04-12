import { CommonModule } from '@angular/common';
import { Component, computed, forwardRef, signal } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

import { BaseFilterComponent } from './base-filter.component';
import { BaseFilterInjectionToken } from './filters.types';

@Component({
    imports: [CommonModule],
    selector: 'nx-multi-filter',
    templateUrl: 'filter.component.html',
    styleUrls: ['filter.component.scss'],
    standalone: true,
    providers: [
        {
            provide: BaseFilterInjectionToken,
            useExisting: forwardRef(() => NxMultiFilterComponent),
        },
        {
            provide: BaseFilterComponent,
            useExisting: forwardRef(() => NxMultiFilterComponent),
        },
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => NxMultiFilterComponent),
            multi: true,
        },
    ],
})
export class NxMultiFilterComponent<T> extends BaseFilterComponent<T, true> {
    selectedValue = signal<T[]>([]);

    override handleSelectionChange(newSelectedValue: T): void {
        const oldSelectedValues = this.selectedValue();
        const selectedValueIndex = oldSelectedValues.findIndex(value => value === newSelectedValue);
        if (selectedValueIndex === -1) {
            // If the option is not already selected, add it to the selected options
            this.updateSelected([...oldSelectedValues, newSelectedValue]);
        } else {
            // If the option is already selected, remove it from the selected options
            const newSelectedValues = [...oldSelectedValues];
            newSelectedValues.splice(selectedValueIndex, 1);
            this.updateSelected(newSelectedValues);
        }
    }

    override clearSelectedValue(): void {
        this.updateSelected([]);
    }

    override selectedValueExists = computed(() => this.selectedValue()?.length > 0);

    override isFilterItemSelected = (item: T): boolean => this.selectedValue()?.includes(item);
}
