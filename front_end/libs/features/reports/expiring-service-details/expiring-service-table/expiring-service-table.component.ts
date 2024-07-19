import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { NxHintComponent } from '@components/hint/hint.component';
import { NxBaseTableComponent } from '@components/table/table.component';
import staticLang from '@language/language_i18n_static.json';

import {
    ExpiringServiceTotals,
    type FormattedExpiringServiceRecord,
} from '../expiring-service-details.types';

interface HEADER_ITEM {
    name: string;
    value: string;
    tooltip?: string;
    align?: string;
}

@Component({
    selector: 'nx-expiring-service-table',
    templateUrl: './expiring-service-table.component.html',
    styleUrls: ['./expiring-service-table.component.scss'],
    imports: [TranslateModule, NxBaseTableComponent, CommonModule, NxHintComponent],
    standalone: true,
})
export class NxExpiringServiceTableComponent {
    LANG = staticLang;
    headers: HEADER_ITEM[] = [
        { value: 'Used By', name: 'usedBy', align: 'flex-start' },
        {
            value: 'Expiration Date',
            name: 'expirationDate',
            tooltip: this.LANG.channelPartnerReports.expirationDateTooltip,
        },
        {
            value: 'Channels',
            name: 'channels',
            tooltip: this.LANG.channelPartnerReports.channelsTooltip,
        },
    ];
    selectedRecordId = '';
    records = input.required<FormattedExpiringServiceRecord[]>();
    totals = input.required<ExpiringServiceTotals>();
    serviceId = input.required<string>();
    entityId = input.required<string>();
    startTs = input<string>('');
}
