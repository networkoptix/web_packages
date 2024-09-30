import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { NxHintComponent } from '@components/hint/hint.component';
import { NxBaseTableComponent } from '@components/table/table.component';
import staticLang from '@language/language_i18n_static.json';

import type {
    ExpiringServiceDialogRecord,
    ExpiringServiceDialogTotals,
} from '../expiring-service-details-dialog.types';

interface HEADER_ITEM {
    name: string;
    value: string;
    tooltip?: string;
    align?: string;
}

@Component({
    selector: 'nx-expiring-service-dialog-table',
    templateUrl: './expiring-service-dialog-table.component.html',
    styleUrls: ['./expiring-service-dialog-table.component.scss'],
    imports: [TranslateModule, NxBaseTableComponent, CommonModule, NxHintComponent],
    standalone: true,
})
export class NxExpiringServiceDialogTable {
    LANG = staticLang;
    headers: HEADER_ITEM[] = [
        {
            value: this.LANG.channelPartnerReports.tableHeaders.channels,
            name: 'channels',
            tooltip: this.LANG.channelPartnerReports.tooltips.channels,
        },
        {
            value: this.LANG.channelPartnerReports.tableHeaders.expirationDate,
            name: 'expirationDate',
            tooltip: this.LANG.channelPartnerReports.tooltips.expirationDate,
        },
    ];
    selectedRecordId = '';
    records = input.required<ExpiringServiceDialogRecord[]>();
    totals = input.required<ExpiringServiceDialogTotals>();
}
