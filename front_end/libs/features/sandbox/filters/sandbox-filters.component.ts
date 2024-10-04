import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
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
export class SandboxFiltersComponent implements OnInit {
    selectedState = signal<string | undefined>('Alabama');

    selectedStates = signal(['Arizona', 'California', 'Delaware']);
    selectedStatesTags = signal<string[]>([]);

    selectedPerson = signal<ComplicatedObject | undefined>(undefined);

    ALL_STATES = ALL_STATES;
    ALL_PEOPLE = ALL_PEOPLE;
    allStates = signal<string[]>([]);

    reducerRolesToString(acc: string, role: string): string {
        return `${acc} ${role}`;
    }

    fiveItems = signal(['Item 1', 'Item 2', 'Item 3', 'Item 4', 'Item 5']);
    selectedItem = signal<string | undefined>(undefined);

    ngOnInit(): void {
        setTimeout(() => {
            this.allStates.set(ALL_STATES.slice(0, 5));
        }, 1000);
        setTimeout(() => {
            this.allStates.update(states => [...states, ...ALL_STATES.slice(5)]);
        }, 2000);
    }
}
