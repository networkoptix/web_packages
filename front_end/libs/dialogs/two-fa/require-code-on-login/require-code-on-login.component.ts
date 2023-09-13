import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';

import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import { ToastType } from '@components/toast-container/toast.types';
import type { Require2faCodeOnLogin as DT } from '@dialogs/dialogs.types';
import staticLang from '@language_static';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { NxProcessService } from '@services/process.service';
import type { Process } from '@services/process.service/process';
import { NxToastService } from '@services/toast.service';
import { accountActions } from '@store/account';

import { Nx2faCodeInputComponent } from '../code-input/2fa-code-input.component';
import { NxSingleStage2faModalBase } from '../single-stage-base';

@Component({
    selector: 'nx-require-code-on-login',
    templateUrl: 'require-code-on-login.component.html',
    styleUrls: ['require-code-on-login.component.scss'],
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
export class NxRequire2faCodeOnLoginModalContent extends NxSingleStage2faModalBase<DT['return']> {
    @ViewChild('tfaCodeInput') protected tfaCodeInput: Nx2faCodeInputComponent;

    tfaCode: string;
    codeOnLoginProcess: Process;

    constructor(
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) public newState: DT['data'],
        processService: NxProcessService,
        cloudApiService: NxCloudApiService,
        toastService: NxToastService,
        store: Store,
    ) {
        super(dialogRef);
        this.codeOnLoginProcess = processService.createProcess(
            () => {
                this.lock();
                return cloudApiService.update2fa('', this.tfaCode, 'toggle');
            },
            {
                ignoreUnauthorized: true,
                ignoreError: true,
                errorCodes: {
                    noBackupCodes: () => {
                        toastService.notify(staticLang.common.generalError, ToastType.Danger);
                    },
                    forbidden: () => this.tfaCodeInput.setUnauthorized(),
                },
            },
            response => {
                if (response.account2faEnabled) {
                    this.close(true);
                } else {
                    store.dispatch(
                        accountActions.updateCurrentUser({
                            update: {
                                account2faEnabled: false,
                                totpExistsForAccount: false,
                            },
                        }),
                    );
                    this.close(false);
                }
            },
            () => {
                this.unlock();
            },
        );
    }
}
