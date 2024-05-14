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
import { UsageDetailDialogRecord, UsageDetailDialogTotals } from './view-usage-details.types';

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
        // previousPeriod is always assigned in the loop below because 'beginning' is always returned by the API
        // TypeScript however can't know that for certain and throws a warning below without the non null assertion
        let previousPeriod!: UsageDetailDialogRecord;
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
            } else if (date !== 'total') {
                // Totals are handled in a different computed signal below
                const [year, month, day] = date.split('-').map(d => Number(d));
                formattedRecord.changed = this.dateTimeFormat.mediumDateString(
                    new Date(year, month - 1, day),
                );
                formattedRecord.isChangeRecord = true;
                currentPeriodChanges.push(formattedRecord);
            }
        });
        return [...currentPeriodChanges, previousPeriod];
    });
    totals$$ = computed<UsageDetailDialogTotals>(() => {
        const records = this.detailTableData$$();
        const totalsRecord = records?.find(record => record.date === 'total');
        if (!totalsRecord) {
            return {
                channels: 0,
                monthlyRate: 0,
                fractionalUsage: 0,
            };
        } else {
            return {
                channels: totalsRecord.channels,
                monthlyRate: totalsRecord.monthly_rate,
                fractionalUsage: totalsRecord.daily_rate,
            };
        }
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
