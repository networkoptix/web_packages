import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { NxFilterContainerComponent } from '@components/filters/filter-container/filter-container.component';
import { NxCheckboxFilterItemComponent } from '@components/filters/filter-items/checkbox-filter-item/checkbox-filter-item.component';
import { NxChipFilterItemComponent } from '@components/filters/filter-items/chip-filter-item/chip-filter-item.component';
import { NxRadioFilterItemComponent } from '@components/filters/filter-items/radio-filter-item/radio-filter-item.component';
import { NxMultiFilterComponent } from '@components/filters/multi-filter.component';
import { NxSingleFilterComponent } from '@components/filters/single-filter.component';

import { ALL_PEOPLE, ALL_STATES, ComplicatedObject } from './test-data';

@Component({
    selector: 'sandbox-filters',
    templateUrl: 'sandbox-filters.component.html',
    styleUrls: ['sandbox-filters.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        NxFilterContainerComponent,
        NxCheckboxFilterItemComponent,
        NxRadioFilterItemComponent,
        NxSingleFilterComponent,
        FormsModule,
        NxMultiFilterComponent,
        NxChipFilterItemComponent,
    ],
})
export class SandboxFiltersComponent {
    selectedState = signal<string | undefined>('Alabama');

    selectedStates = signal(['Arizona', 'California', 'Delaware']);
    selectedStatesTags = signal<string[]>([]);

    selectedPerson = signal<ComplicatedObject | undefined>(undefined);

    ALL_STATES = ALL_STATES;
    ALL_PEOPLE = ALL_PEOPLE;

    reducerRolesToString(acc: string, role: string): string {
        return `${acc} ${role}`;
    }
}
