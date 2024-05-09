import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject, Signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import type { ViewUsageDetails as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { NxDateTimeFormatService } from '@services/datetime-format.service';
import { DetailTableResponse } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

import { NxUsageDetailsDialogTableComponent } from './usage-details-dialog-table/usage-details-dialog-table.component';
import { UsageDetailDialogRecord } from './view-usage-details.types';

@Component({
    selector: 'nx-usage-details-content',
    templateUrl: 'view-usage-details.component.html',
    styleUrls: [],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        NxPreLoaderComponent,
        NxUsageDetailsDialogTableComponent,
    ],
})
export class NxUsageDetailsModalContent extends ModalBase<DT['return']> {
    entityName: string;
    detailTableData$$: Signal<DetailTableResponse | undefined>;
    isLoading$$ = computed<boolean>(() => !this.detailTableData$$());
    formattedRecords$$ = computed<UsageDetailDialogRecord[]>(() => {
        const records = this.detailTableData$$();
        // previousPeriod and total are always assigned in the loop below because 'beginning' and 'total'
        // are always returned by the API, although TypeScript can't know that for certain and throws a warning below
        // without these non null assertions
        let previousPeriod!: UsageDetailDialogRecord;
        let total!: UsageDetailDialogRecord;
        const currentPeriodChanges: UsageDetailDialogRecord[] = [];

        if (!records) {
            return [];
        }

        records.forEach(({ date, channels, monthly_rate, daily_rate }) => {
            const formattedRecord = {
                changed: '',
                channels,
                monthlyRate: monthly_rate,
                fractionalUsage: daily_rate,
                isChangeRecord: false,
            };
            if (date === 'beginning') {
                formattedRecord.changed = 'Previous periods';
                previousPeriod = formattedRecord;
            } else if (date === 'total') {
                formattedRecord.changed = 'Total';
                total = formattedRecord;
            } else {
                const [year, month, day] = date.split('-').map(d => Number(d));
                formattedRecord.changed = this.dateTimeFormat.mediumDateString(
                    new Date(year, month - 1, day),
                );
                formattedRecord.isChangeRecord = true;
                currentPeriodChanges.push(formattedRecord);
            }
        });
        return [...currentPeriodChanges, previousPeriod, total];
    });

    constructor(
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) { detailTableData$, entityName }: DT['data'],
        private dateTimeFormat: NxDateTimeFormatService,
    ) {
        super(dialogRef);
        this.entityName = entityName;
        this.detailTableData$$ = toSignal(detailTableData$);
    }
}
