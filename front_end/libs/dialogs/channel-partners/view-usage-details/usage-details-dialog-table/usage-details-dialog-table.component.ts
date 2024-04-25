import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { NxBaseTableComponent } from '@components/table/table.component';

import type { UsageDetailDialogRecord } from '../view-usage-details.types';

interface HEADER_ITEM {
    name: string;
    value: string;
    align?: string;
}

@Component({
    selector: 'nx-usage-details-dialog-table',
    templateUrl: './usage-details-dialog-table.component.html',
    styleUrls: ['./usage-details-dialog-table.component.scss'],
    imports: [TranslateModule, NxBaseTableComponent, CommonModule],
    standalone: true,
})
export class NxUsageDetailsDialogTableComponent {
    headers: HEADER_ITEM[] = [
        { value: 'Changed', name: 'changed' },
        { value: 'Channels', name: 'channels' },
        { value: 'Monthly Rate', name: 'monthlyRate' },
        { value: 'Fractional Usage', name: 'fractionalUsage' },
    ];
    selectedRecordId = '';
    records = input.required<UsageDetailDialogRecord[]>();
}
