import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { NxQuantityChangeComponent } from '@components/quantity-change/quantity-change.component';
import { NxBaseTableComponent } from '@components/table/table.component';

import type { FormattedServiceChangeRecord } from '../service-changes.types';

interface HEADER_ITEM {
    name: string;
    value: string;
    align?: string;
}

@Component({
    selector: 'nx-service-changes-table',
    templateUrl: './service-changes-table.component.html',
    styleUrl: './service-changes-table.component.scss',
    imports: [TranslateModule, NxBaseTableComponent, CommonModule, NxQuantityChangeComponent],
    standalone: true,
})
export class NxServiceChangesTableComponent {
    headers: HEADER_ITEM[] = [
        { value: 'Service Name', name: 'serviceName' },
        { value: 'Amount', name: 'amount' },
        { value: 'Added To', name: 'addedToName' },
        { value: 'Date', name: 'date' },
    ];
    selectedRecordId = '';
    records = input.required<FormattedServiceChangeRecord[]>();
}
