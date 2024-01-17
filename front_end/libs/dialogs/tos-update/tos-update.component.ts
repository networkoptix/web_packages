import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { TosUpdate as DT } from '@dialogs/dialogs.types';
import { PipesModule } from '@pipes/pipes.module';
import { offsetDate } from '@utils/general';

@Component({
    selector: 'nx-tos-update-content',
    templateUrl: 'tos-update.component.html',
    styleUrls: ['tos-update.component.scss'],
    standalone: true,
    imports: [CommonModule, TranslateModule, PipesModule],
})
export class TosUpdateModalContent {
    inGracePeriod: boolean = false;
    gracePeriodDeadline: Date;
    body: string;

    constructor(
        private dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) { grace_period: gracePeriod, body }: DT['data'],
    ) {
        this.gracePeriodDeadline = offsetDate(new Date(), { day: gracePeriod });
        this.body = body;
        this.inGracePeriod = gracePeriod > 0;
    }

    close(status: DT['return']): void {
        this.dialogRef.close(status);
    }
}
