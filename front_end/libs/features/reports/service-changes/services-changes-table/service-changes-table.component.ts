import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { NxQuantityChangeComponent } from '@components/quantity-change/quantity-change.component';
import { NxBaseTableComponent } from '@components/table/table.component';
import { PageChange } from '@components/table/table.types';
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
    styleUrl: './service-changes-table.component.scss',
    imports: [TranslateModule, NxBaseTableComponent, CommonModule, NxQuantityChangeComponent],
    standalone: true,
})
export class NxServiceChangesTableComponent {
    headers: HEADER_ITEM[] = [
        { value: 'Service Name', name: 'serviceName', align: 'flex-start' },
        { value: 'Amount', name: 'amount' },
        { value: 'Changed At', name: 'changedAtName', align: 'flex-start' },
        { value: 'Date', name: 'date' },
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
