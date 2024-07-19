import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { NxHintComponent } from '@components/hint/hint.component';
import { NxQuantityChangeComponent } from '@components/quantity-change/quantity-change.component';
import { NxBaseTableComponent } from '@components/table/table.component';
import staticLang from '@language/language_i18n_static.json';

import type {
    RegularServiceDialogRecord,
    RegularServiceDialogTotals,
} from '../regular-service-details-dialog.types';

interface HEADER_ITEM {
    name: string;
    value: string;
    tooltip?: string;
    align?: string;
}

@Component({
    selector: 'nx-regular-service-dialog-table',
    templateUrl: './regular-service-dialog-table.component.html',
    styleUrls: ['./regular-service-dialog-table.component.scss'],
    imports: [
        TranslateModule,
        NxBaseTableComponent,
        CommonModule,
        NxHintComponent,
        NxQuantityChangeComponent,
    ],
    standalone: true,
})
export class NxRegularServiceDialogTable {
    LANG = staticLang;
    headers: HEADER_ITEM[] = [
        {
            value: 'Changed',
            name: 'changed',
            tooltip: this.LANG.channelPartnerReports.changedTooltip,
        },
        {
            value: 'Channels',
            name: 'channels',
            tooltip: this.LANG.channelPartnerReports.channelsTooltip,
        },
        {
            value: 'Monthly Rate',
            name: 'monthlyRate',
            tooltip: this.LANG.channelPartnerReports.monthlyRateTooltip,
        },
        {
            value: 'Fractional Usage',
            name: 'fractionalUsage',
            tooltip: this.LANG.channelPartnerReports.fractionalUsageTooltip,
        },
    ];
    selectedRecordId = '';
    records = input.required<RegularServiceDialogRecord[]>();
    totals = input.required<RegularServiceDialogTotals>();
}
