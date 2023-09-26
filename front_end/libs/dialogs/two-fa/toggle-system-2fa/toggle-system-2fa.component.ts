import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import { ToastType } from '@components/toast-container/toast.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import type { ToggleSystem2fa as DT } from '@dialogs/dialogs.types';
import staticLang from '@language_static';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { NxToastService } from '@services/toast.service';

import { Nx2faCodeInputComponent } from '../code-input/2fa-code-input.component';
import { NxSingleStage2faModalBase } from '../single-stage-base';

@Component({
    selector: 'nx-toggle-system-2fa',
    templateUrl: 'toggle-system-2fa.component.html',
    styleUrls: [],
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
export class ToggleSystem2faModalContent extends NxSingleStage2faModalBase<DT['return']> {
    @ViewChild('tfaCodeInput') protected tfaCodeInput: Nx2faCodeInputComponent;

    LANG = staticLang;

    system2faEnabled: boolean;
    toggleSystem2faProcess: Process;
    tfaCode: string;

    // TODO: get the number of user's without 2fa for system
    // usersWithout2fa = 0;

    constructor(
        cloudApiService: NxCloudApiService,
        processService: NxProcessService,
        toastService: NxToastService,
        dialog: NxDialogsService,
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) { system2faEnabled, system }: DT['data'],
    ) {
        super(dialogRef);
        this.system2faEnabled = system2faEnabled;

        this.toggleSystem2faProcess = processService.createProcess(
            () => {
                this.lock();
                return cloudApiService.toggle2faForSystem(system.id, this.tfaCode);
            },
            {
                ignoreUnauthorized: true,
                ignoreError: true,
                errorCodes: {
                    notAuthorized: () => this.tfaCodeInput.setUnauthorized(),
                    badRequest: () => this.tfaCodeInput.setUnauthorized(),
                },
            },
            () => {
                this.close(true);
                const successMessage = !this.system2faEnabled
                    ? this.LANG.dialogs.message.system2faEnabled
                    : this.LANG.dialogs.message.system2faDisabled;
                toastService.notify(successMessage, ToastType.Success);
            },
            err => {
                this.unlock();
                if (!err.resultCode) {
                    this.close();
                    dialog.cantEnableSystem2fa();
                }
            },
        );
    }
}
