import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { NxDialogsService } from '@dialogs/dialogs.service';
import type { CancelReportExport as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';

@Component({
    selector: 'nx-cancel-export-dialog',
    templateUrl: 'cancel-report-export.component.html',
    styleUrls: ['cancel-report-export.component.scss'],
    standalone: true,
    imports: [CommonModule, TranslateModule],
})
export class NxCancelExportDialog extends ModalBase<DT['return']> {
    exportDialogRef: DT['data']['exportDialogRef'];
    cancelExport$: DT['data']['cancelExport$'];

    constructor(
        @Inject(DIALOG_DATA) { exportDialogRef, cancelExport$ }: DT['data'],
        dialogRef: DialogRef<DT['return']>,
        dialog: NxDialogsService,
    ) {
        super(dialogRef);
        this.exportDialogRef = exportDialogRef;
        this.cancelExport$ = cancelExport$;
    }

    cancelExport(): void {
        this.exportDialogRef.close();
        this.dialogRef.close();
        this.cancelExport$.next();
        this.cancelExport$.complete();
    }
}
