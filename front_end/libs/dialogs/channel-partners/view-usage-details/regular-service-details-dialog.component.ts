import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject, Signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import type { ViewRegularServiceDetails as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { NxDateTimeFormatService } from '@services/datetime-format.service';
import { RegularServiceDetailDialogResponse } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

import {
    RegularServiceDialogRecord,
    RegularServiceDialogTotals,
} from './regular-service-details-dialog.types';
import { NxRegularServiceDialogTable } from './regular-service-dialog-table/regular-service-dialog-table.component';

@Component({
    selector: 'nx-regular-service-details-dialog',
    templateUrl: 'regular-service-details-dialog.component.html',
    styleUrls: ['./regular-service-details-dialog.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        NxPreLoaderComponent,
        NxRegularServiceDialogTable,
    ],
})
export class NxRegularServiceDetailsDialog extends ModalBase<DT['return']> {
    entityName: string;
    regularServiceDialogRecords$$: Signal<RegularServiceDetailDialogResponse | undefined>;
    isLoading$$ = computed<boolean>(() => !this.regularServiceDialogRecords$$());
    formattedRecords$$ = computed<RegularServiceDialogRecord[]>(() => {
        const records = this.regularServiceDialogRecords$$();
        // previousPeriod is always assigned in the loop below because 'beginning' is always returned by the API
        // TypeScript however can't know that for certain and throws a warning below without the non null assertion
        let previousPeriod!: RegularServiceDialogRecord;
        const currentPeriodChanges: RegularServiceDialogRecord[] = [];

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
    totals$$ = computed<RegularServiceDialogTotals>(() => {
        const records = this.regularServiceDialogRecords$$();
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
        @Inject(DIALOG_DATA) { regularServiceDialogData$, entityName }: DT['data'],
        private dateTimeFormat: NxDateTimeFormatService,
    ) {
        super(dialogRef);
        this.entityName = entityName;
        this.regularServiceDialogRecords$$ = toSignal(regularServiceDialogData$);
    }
}
