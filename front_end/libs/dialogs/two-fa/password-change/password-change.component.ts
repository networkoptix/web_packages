import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import type { PasswordChange2fa as DT } from '@dialogs/dialogs.types';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { NxProcessService } from '@services/process.service';
import type { Process } from '@services/process.service/process';

import { Nx2faCodeInputComponent } from '../code-input/2fa-code-input.component';
import { NxSingleStage2faModalBase } from '../single-stage-base';

@Component({
    selector: 'nx-password-change',
    templateUrl: 'password-change.component.html',
    styleUrls: ['password-change.component.scss'],
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
export class NxPasswordChange2faModalContent extends NxSingleStage2faModalBase<DT['return']> {
    @ViewChild('tfaCodeInput') protected tfaCodeInput: Nx2faCodeInputComponent;

    tfaCode: string;
    changePasswordProcess: Process;

    constructor(
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) { newPassword, oldPassword }: DT['data'],
        processService: NxProcessService,
        cloudApiService: NxCloudApiService,
    ) {
        super(dialogRef);

        this.changePasswordProcess = processService.createProcess(
            () => {
                this.lock();
                return cloudApiService.changePassword(newPassword, oldPassword, this.tfaCode);
            },
            {
                ignoreUnauthorized: true,
                ignoreError: true,
                errorCodes: {
                    notAuthorized: () => this.tfaCodeInput.setUnauthorized(),
                    badRequest: () => this.tfaCodeInput.setUnauthorized(),
                },
            },
            _ => {
                this.close(true);
            },
            () => {
                this.unlock();
            },
        );
    }
}
