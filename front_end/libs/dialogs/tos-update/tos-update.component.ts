import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { TosUpdate as DT } from '@dialogs/dialogs.types';
import { PipesModule } from '@pipes/pipes.module';
import { MS } from '@utils/general';

@Component({
    selector: 'nx-tos-update-content',
    templateUrl: 'tos-update.component.html',
    styleUrls: ['tos-update.component.scss'],
    standalone: true,
    imports: [CommonModule, TranslateModule, PipesModule],
})
export class TosUpdateModalContent {
    inGracePeriod: boolean = false;
    gracePeriod: Date;
    body: string;

    constructor(
        private dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) { grace_period, body, reviewed_date }: DT['data'],
    ) {
        const daysFromNow = new Date(reviewed_date);
        // eslint-disable-next-line camelcase
        daysFromNow.setTime(daysFromNow.getTime() + grace_period * MS.day);
        this.gracePeriod = daysFromNow;
        this.body = body;
        this.inGracePeriod = new Date() < this.gracePeriod;
    }

    close(status: DT['return']): void {
        this.dialogRef.close(status);
    }
}
