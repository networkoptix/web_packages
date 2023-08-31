import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject, Renderer2, ViewChild } from '@angular/core';
import type { NgForm } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import { ToastType } from '@components/toast-container/toast.types';
import type { Mandatory2fa as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import { DirectivesModule } from '@directives/directives.module';
import staticLang from '@language_static';
import { NxAccountService } from '@services/account.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import type { NxSystem } from '@services/system.service/system';
import { NxToastService } from '@services/toast.service';
import { assignFrom } from '@utils/general';

@Component({
    selector: 'nx-mandatory-2fa',
    templateUrl: 'mandatory-2fa.component.html',
    styleUrls: [],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        RouterModule,

        DirectivesModule,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
    ],
})
export class Mandatory2faModalContent extends ModalBase<DT['return']> {
    LANG = staticLang;

    system: NxSystem;
    system2faEnabled: boolean;
    mandatory2fa: Process;
    verificationCode: string;
    accountTotpExists = false;

    public notAuthorized: boolean;

    @ViewChild('mandatory2faForm') private mandatory2faForm: NgForm;

    // TODO: get the number of user's without 2fa for system
    usersWithout2fa = 0;

    constructor(
        private accountService: NxAccountService,
        private cloudApiService: NxCloudApiService,
        private processService: NxProcessService,
        private toastService: NxToastService,
        private renderer: Renderer2,
        protected dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) private dialogData: DT['data'],
    ) {
        super(dialogRef);
    }

    ngOnInit(): void {
        assignFrom(this.dialogData, ['system2faEnabled', 'system'], this);

        this.accountTotpExists = this.accountService.account.totpExistsForAccount;

        const notAuthorizedHandler = (): void => {
            this.notAuthorized = true;
            this.mandatory2faForm.controls.verificationCode.markAsTouched();
            this.mandatory2faForm.controls.verificationCode.setErrors({ invalid: true });
            this.renderer.selectRootElement('#verificationCode').focus();
        };

        this.mandatory2fa = this.processService.createProcess(
            () => {
                this.lock();
                return this.cloudApiService.toggle2faForSystem(
                    this.system.id,
                    this.verificationCode,
                );
            },
            {
                ignoreUnauthorized: true,
                ignoreError: true,
                errorCodes: {
                    notAuthorized: notAuthorizedHandler,
                    badRequest: notAuthorizedHandler,
                },
            },
            () => {
                this.close(true);
                const successMessage = !this.system2faEnabled
                    ? this.LANG.dialogs.message.system2faEnabled
                    : this.LANG.dialogs.message.system2faDisabled;
                this.toastService.notify(successMessage, ToastType.Success);
            },
            err => {
                this.unlock();
                if (!err.resultCode) {
                    this.accountTotpExists = false;
                }
            },
        );
    }
}
