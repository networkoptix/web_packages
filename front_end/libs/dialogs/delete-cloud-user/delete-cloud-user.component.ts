import { DialogRef } from '@angular/cdk/dialog';
import { Component, ViewChild } from '@angular/core';
import type { NgForm, NgModel } from '@angular/forms';

import staticLang from '@common/language/language_i18n_static.json';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';

import type { DeleteCloudUser as DialogTypes } from '../dialogs.types';

@Component({
    selector: 'nx-modal-delete-cloud-user-content',
    templateUrl: 'delete-cloud-user.component.html'
})
export class DeleteCloudUserModalContent {
    LANG = staticLang;

    deleteCloudUser: Process;
    passwordForUser: string = '';
    passwordError: string = '';

    @ViewChild('deleteCloudUserForm') private deleteForm: NgForm;

    constructor(
        private processService: NxProcessService,
        private cloudService: NxCloudApiService,
        public dialogRef: DialogRef<DialogTypes['return']>,
    ) {}

    ngOnInit(): void {
        this.deleteCloudUser = this.processService.createProcess(
            () => {
                this.dialogRef.disableClose = true;
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

    close = (msg?: DialogTypes['return']): void => {
        this.dialogRef.close(msg);
    };

    unlock = (): void => {
        this.dialogRef.disableClose = false;
    };

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
