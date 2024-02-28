import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import { Component, Inject, Renderer2, ViewChild } from '@angular/core';
import type { NgForm } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import { ToastType } from '@components/toast-container/toast.types';
import { ModalBase } from '@dialogs/modal-base';
import { NxFocusMeDirective } from '@directives/nx-focus-me';
import staticLang from '@language_static';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { NxToastService } from '@services/toast.service';

import type { RemoveSystem as DT } from '../dialogs.types';

@Component({
    selector: 'nx-modal-remove-model-content',
    templateUrl: 'remove-system.component.html',
    styleUrls: [],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,

        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
        NxFocusMeDirective,
    ],
})
export class RemoveSystemModalContent extends ModalBase<DT['return']> {
    LANG = staticLang;

    disconnectFromAccount: Process;
    wrongPassword: boolean;
    auth = {
        username: '',
        password: '',
    };

    hideErrors = true;

    @ViewChild('disconnectAccountForm', { static: true }) private disconnectAccountForm: NgForm;

    constructor(
        private processService: NxProcessService,
        private renderer: Renderer2,
        private toastService: NxToastService,
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) public system: DT['data'],
    ) {
        super(dialogRef);
    }

    private credentialErrorHandler = (): true => {
        this.wrongPassword = true;
        this.auth.password = '';

        this.renderer.selectRootElement('#password').focus();
        return true;
    };

    ngOnInit(): void {
        this.auth.username = this.system.permissionManager.currentUser$$().email;

        this.disconnectFromAccount = this.processService.createProcess(
            () => {
                this.lock();
                this.disconnectAccountForm.controls.password.setErrors(undefined);
                this.wrongPassword = false;
                return firstValueFrom(this.system.deleteFromCurrentAccount(this.auth.password));
            },
            {
                ignoreUnauthorized: true,
                errorCodes: {
                    accountBlocked: this.credentialErrorHandler,
                    notAuthorized: this.credentialErrorHandler,
                },
                errorPrefix: this.LANG.errorCodes.cantUnshareWithMeSystemPrefix,
            },
            () => {
                this.close(true);
                const msg = {
                    value: this.LANG.toastMessage.system.deleted.success,
                    params: {
                        systemName: this.system.info.systemName || this.system.info.name,
                    },
                };
                this.toastService.notify(msg, ToastType.Success);
            },
            err => {
                console.error(err);
                this.unlock();
            },
        );
    }
}
