import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { Component, Inject, Renderer2, ViewChild } from '@angular/core';
import type { NgForm } from '@angular/forms';

import staticLang from '@common/language/language_i18n_static.json';
import { ToastType } from '@components/toast-container/toast.types';
import { ModalBase } from '@dialogs/modal-base';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { NxToastService } from '@services/toast.service';

import type { RemoveSystem as DT } from '../dialogs.types';

@Component({
    selector: 'nx-modal-remove-model-content',
    templateUrl: 'remove-system.component.html',
    styleUrls: [],
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
        public dialogRef: DialogRef<DT['return']>,
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
        this.auth.username = this.system.userManager.currentUserEmail;

        this.disconnectFromAccount = this.processService.createProcess(
            () => {
                this.lock();
                this.disconnectAccountForm.controls.password.setErrors(undefined);
                this.wrongPassword = false;
                return this.system.deleteFromCurrentAccount(this.auth.password).toPromise();
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
