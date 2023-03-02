import { DialogRef } from '@angular/cdk/dialog';
import { Component, ViewChild } from '@angular/core';
import type { NgForm, NgModel } from '@angular/forms';

import staticLang from '@common/language/language_i18n_static.json';
import { ModalBase } from '@dialogs/modal-base';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';

import type { DeleteCloudUser as DT } from '../dialogs.types';

@Component({
    selector: 'nx-modal-delete-cloud-user-content',
    templateUrl: 'delete-cloud-user.component.html',
})
export class DeleteCloudUserModalContent extends ModalBase<DT['return']> {
    LANG = staticLang;

    deleteCloudUser: Process;
    passwordForUser: string = '';
    passwordError: string = '';

    @ViewChild('deleteCloudUserForm') private deleteForm: NgForm;

    constructor(
        private processService: NxProcessService,
        private cloudService: NxCloudApiService,
        public dialogRef: DialogRef<DT['return']>,
    ) {
        super(dialogRef);
    }

    ngOnInit(): void {
        this.deleteCloudUser = this.processService.createProcess(
            () => {
                this.lock();
                return this.cloudService.deleteCloudUser(this.passwordForUser);
            },
            {
                errorCodes: {
                    forbidden: this.LANG.errorCodes.cantDeleteAccountOwningSystems,
                    wrongParameters: () => {
                        this.deleteForm.form.controls.password.setErrors({ passwordMissing: true });
                        this.passwordError = this.LANG.passwordRequirements.missingMessage;
                    },
                    wrongPassword: () => {
                        this.deleteForm.form.controls.password.setErrors({ passwordWrong: true });
                        this.passwordError = this.LANG.errorCodes.notAuthorized;
                    }
                },
                ignoreError: false
            }, res => {
                if (res.resultCode === 'ok') {
                    this.close(res);
                }
                this.unlock();
            }, () => {
                this.unlock();
            });
    }

    clearErrors(): void {
        this.deleteForm.form.controls.password.setErrors({});
    }

    setPassword(input: NgModel): void {
        this.passwordError = input.touched && input.errors?.required
            ? this.LANG.passwordRequirements.missingMessage
            : '';
        this.passwordForUser = input.value;
    }
}
