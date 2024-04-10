import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { NxBaseTableComponent } from '@components/table/table.component';

import type { FormattedServiceDetailRecord } from '../service-usage-details.types';

interface HEADER_ITEM {
    name: string;
    value: string;
    align?: string;
}

@Component({
    selector: 'nx-service-details-table',
    templateUrl: './service-details-table.component.html',
    imports: [TranslateModule, NxBaseTableComponent, CommonModule],
    standalone: true,
})
export class NxServiceDetailsTableComponent {
    headers: HEADER_ITEM[] = [
        { value: 'Used By', name: 'usedBy' },
        { value: 'Changed', name: 'changed' },
        { value: 'Active Channels', name: 'activeChannels' },
        { value: 'Monthly Rate', name: 'monthlyRate' },
        { value: 'Fractional Usage', name: 'fractionalUsage' },
    ];
    selectedRecordId = '';
    records = input.required<FormattedServiceDetailRecord[]>();
}
