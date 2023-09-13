import { DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { ToastType } from '@components/toast-container/toast.types';
import type { New2faBackupCodes as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import staticLang from '@language_static';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { NxToastService } from '@services/toast.service';

import { NxBackupCodesComponent } from '../backup-codes/backup-codes.component';

@Component({
    selector: 'nx-new-backup-codes',
    templateUrl: 'new-backup-codes.component.html',
    styleUrls: ['new-backup-codes.component.scss'],
    standalone: true,
    imports: [CommonModule, TranslateModule, NxBackupCodesComponent],
})
export class NxNew2faBackupCodesModalContent extends ModalBase<DT['return']> {
    newCodes: string[];

    constructor(
        dialogRef: DialogRef<DT['return']>,
        cloudApiService: NxCloudApiService,
        toastService: NxToastService,
    ) {
        super(dialogRef);
        cloudApiService.get2FaBackupCode().then(
            response => {
                this.newCodes = response.map(code => code.backup_code);
            },
            () => {
                this.close();
                toastService.notify(staticLang.common.generalError, ToastType.Danger);
            },
        );
    }
}
