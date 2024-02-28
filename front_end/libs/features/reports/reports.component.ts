import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { NxSearchableDropdown } from '@components/dropdowns/searchable/searchable.component';
import type { SearchableDropdownItem } from '@components/dropdowns/searchable/searchable.component.types';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';

@Component({
    selector: 'nx-reports',
    templateUrl: 'reports.component.html',
    styleUrl: 'reports.component.scss',
    imports: [
        CommonModule,
        NxPreLoaderComponent,
        NxSearchableDropdown,
        FormsModule,
        TranslateModule,
        RouterModule,
    ],
    standalone: true,
})
export class NxReportsComponent {
    cpAndOrgItems = signal<SearchableDropdownItem[]>([
        { name: 'Org 1', value: '1' },
        { name: 'Org 2', value: '2' },
        { name: 'Org 3', value: '3' },
    ]);

    selectedItem: SearchableDropdownItem;

    selectItem(org: SearchableDropdownItem): void {
        this.selectedItem = { ...org };
    }
}
