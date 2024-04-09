import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { NxBaseTableComponent } from '@components/table/table.component';

import type { FormattedUsageReportRecord } from '../service-usage.types';

interface HEADER_ITEM {
    name: string;
    value: string;
    align?: string;
}

@Component({
    selector: 'nx-service-usage-table',
    templateUrl: './service-usage-table.component.html',
    imports: [TranslateModule, NxBaseTableComponent, CommonModule],
    standalone: true,
})
export class NxServiceUsageTableComponent {
    headers: HEADER_ITEM[] = [
        { value: 'Service Name', name: 'serviceName' },
        { value: 'Used By', name: 'usedBy' },
        { value: 'Channels', name: 'channels' },
        { value: 'Monthly Rate', name: 'monthlyRate' },
        { value: 'Fractional Usage', name: 'fractionalUsage' },
    ];
    selectedRecordId = '';
    records = input.required<FormattedUsageReportRecord[]>();
}
