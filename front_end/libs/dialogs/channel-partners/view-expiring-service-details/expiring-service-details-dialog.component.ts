import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, computed, Inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import type { ViewExpiringServiceDetails as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { NxDateTimeFormatService } from '@services/datetime-format.service';
import { ExpiringServiceDetailDialogResponse } from '@services/nx-cloud-api/cloud-services/channel-partners/channel-partners-api.types';

import {
    ExpiringServiceDialogRecord,
    ExpiringServiceDialogTotals,
} from './expiring-service-details-dialog.types';
import { NxExpiringServiceDialogTable } from './expiring-service-dialog-table/expiring-service-dialog-table.component';

@Component({
    selector: 'nx-expiring-service-details-dialog',
    templateUrl: 'expiring-service-details-dialog.component.html',
    styleUrls: ['./expiring-service-details-dialog.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        NxPreLoaderComponent,
        NxExpiringServiceDialogTable,
    ],
})
export class NxExpiringServiceDetailsDialog extends ModalBase<DT['return']> {
    entityName: string;
    expiringServiceDialogRecords$$: Signal<ExpiringServiceDetailDialogResponse | undefined>;
    isLoading$$ = computed<boolean>(() => !this.expiringServiceDialogRecords$$());
    formattedRecords$$ = computed<ExpiringServiceDialogRecord[]>(() => {
        const records = this.expiringServiceDialogRecords$$();
        if (!records) {
            return [];
        }
        return records.reduce((formattedRecords, { channels, expiration_date }) => {
            if (expiration_date !== 'total') {
                const [year, month, day] = expiration_date.split('-').map(d => Number(d));
                formattedRecords.push({
                    channels,
                    expirationDate: this.dateTimeFormat.mediumDateString(
                        new Date(year, month - 1, day),
                    ),
                });
            }
            return formattedRecords;
        }, [] as ExpiringServiceDialogRecord[]);
    });
    totals$$ = computed<ExpiringServiceDialogTotals>(() => {
        const records = this.expiringServiceDialogRecords$$();
        if (!records) {
            return { channels: 0 };
        }
        const totalsRecord = records.find(({ expiration_date }) => expiration_date === 'total');
        return {
            channels: totalsRecord?.channels ?? 0,
        };
    });

    constructor(
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) { expiringServiceDialogData$, entityName }: DT['data'],
        private dateTimeFormat: NxDateTimeFormatService,
    ) {
        super(dialogRef);
        this.entityName = entityName;
        this.expiringServiceDialogRecords$$ = toSignal(expiringServiceDialogData$);
    }
}
