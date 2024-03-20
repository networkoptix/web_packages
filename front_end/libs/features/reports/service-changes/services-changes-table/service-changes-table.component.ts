import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { NxBaseTableComponent } from '@components/table/table.component';

import type { ServiceChangeRecord } from '../service-changes.types';

interface HEADER_ITEM {
    name: string;
    value: string;
    align?: string;
}

@Component({
    selector: 'nx-service-changes-table',
    templateUrl: './service-changes-table.component.html',
    imports: [TranslateModule, NxBaseTableComponent, CommonModule],
    standalone: true,
})
export class NxServiceChangesTableComponent {
    headers: HEADER_ITEM[] = [
        { value: 'Service Name', name: 'serviceName' },
        { value: 'Amount', name: 'amount' },
        { value: 'Added To', name: 'addedTo' },
        { value: 'Date', name: 'date' },
    ];
    selectedRecordId = '';
    @Input() records: ServiceChangeRecord[];
}
