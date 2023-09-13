import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import { ToastType } from '@components/toast-container/toast.types';
import type { DisableAccount2fa as DT } from '@dialogs/dialogs.types';
import staticLang from '@language_static';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { NxProcessService } from '@services/process.service';
import type { Process } from '@services/process.service/process';
import { NxToastService } from '@services/toast.service';

import { Nx2faCodeInputComponent } from '../code-input/2fa-code-input.component';
import { NxSingleStage2faModalBase } from '../single-stage-base';

@Component({
    selector: 'nx-disable-account-2fa',
    templateUrl: 'disable-account-2fa.component.html',
    styleUrls: ['disable-account-2fa.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,

        Nx2faCodeInputComponent,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
    ],
})
export class NxDisableAccount2faModalContent extends NxSingleStage2faModalBase<DT['return']> {
    LANG = staticLang;
    @ViewChild('tfaCodeInput') protected tfaCodeInput: Nx2faCodeInputComponent;

    tfaCode: string;
    disableProcess: Process;

    constructor(
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) public num2faSystems: DT['data'],
        processService: NxProcessService,
        cloudApiService: NxCloudApiService,
        toastService: NxToastService,
    ) {
        super(dialogRef);

        this.disableProcess = processService.createProcess(
            () => {
                this.lock();
                return cloudApiService.update2fa('', this.tfaCode, 'deactivate');
            },
            {
                ignoreUnauthorized: true,
                ignoreError: true,
                errorCodes: {
                    noBackupCodes: () => {
                        toastService.notify(this.LANG.common.generalError, ToastType.Danger);
                    },
                    forbidden: () => this.tfaCodeInput.setUnauthorized(),
                    notAuthorized: () => this.tfaCodeInput.setUnauthorized(),
                    invalidTotp: () => this.tfaCodeInput.setUnauthorized(),
                },
            },
            () => {
                this.close(true);
            },
            () => {
                this.unlock();
            },
        );
    }
}
