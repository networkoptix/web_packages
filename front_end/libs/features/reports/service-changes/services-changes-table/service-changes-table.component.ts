import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { NxQuantityChangeComponent } from '@components/quantity-change/quantity-change.component';
import { NxBaseTableComponent } from '@components/table/table.component';
import { PageChange } from '@components/table/table.types';
import staticLang from '@language/language_i18n_static.json';
import { NxGroupPathComponent } from '@pages/reports/group-path/group-path.component';
import { EntityType } from '@pages/reports/reports.types';

import type {
    FormattedOrgServiceChangeRecord,
    FormattedPartnerServiceChangeRecord,
    FormattedServiceChangeRecord,
} from '../service-changes.types';

interface HEADER_ITEM {
    name: string;
    value: string;
    align?: string;
}

@Component({
    selector: 'nx-service-changes-table',
    templateUrl: './service-changes-table.component.html',
    imports: [
        TranslateModule,
        NxBaseTableComponent,
        CommonModule,
        NxQuantityChangeComponent,
        NxGroupPathComponent,
    ],
    standalone: true,
})
export class NxServiceChangesTableComponent {
    LANG = staticLang;
    headers: HEADER_ITEM[] = [
        {
            value: this.LANG.channelPartnerReports.tableHeaders.serviceName,
            name: 'serviceName',
            align: 'flex-start',
        },
        { value: this.LANG.channelPartnerReports.tableHeaders.amount, name: 'amount' },
        {
            value: this.LANG.channelPartnerReports.tableHeaders.changedAt,
            name: 'changedAtName',
            align: 'flex-start',
        },
        { value: this.LANG.channelPartnerReports.tableHeaders.date, name: 'date' },
    ];
    selectedRecordId = '';
    entityType$$ = input.required<EntityType>({ alias: 'entityType' });
    partnerRecords$$ = input.required<FormattedPartnerServiceChangeRecord[]>({
        alias: 'partnerRecords',
    });
    orgRecords$$ = input.required<FormattedOrgServiceChangeRecord[]>({ alias: 'orgRecords' });

    isPartnerTable$$ = computed<boolean>(() => this.entityType$$() === EntityType.channelPartner);
    records$$ = computed<FormattedServiceChangeRecord[]>(() => {
        const isPartnerTable = this.isPartnerTable$$();
        const partnerRecords = this.partnerRecords$$();
        const orgRecords = this.orgRecords$$();

        return isPartnerTable ? partnerRecords : orgRecords;
    });

    @Output() onPageChange = new EventEmitter<PageChange>();
    handlePageChange(pageChange: PageChange): void {
        this.onPageChange.emit(pageChange);
    }
}
