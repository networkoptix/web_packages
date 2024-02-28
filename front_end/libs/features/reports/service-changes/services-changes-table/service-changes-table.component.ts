import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { NxBaseTableComponent } from '@components/table/table.component';

interface ServiceChangeRecord {
    serviceName: string;
    amount: number;
    addedTo: string;
    date: string;
}

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
    records: ServiceChangeRecord[] = [
        {
            serviceName: 'Recording',
            amount: 5,
            addedTo: 'Partner 1',
            date: '29 Dec 2023 10:53am',
        },
        {
            serviceName: 'Cloud storage per 1 channel above 5 MP',
            amount: 20,
            addedTo: 'Bank of America',
            date: '25 Dec 2023 11:17am',
        },
    ];
}
