import { Component, Inject, Input, ViewChild } from '@angular/core';
import type { NgForm } from '@angular/forms';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import { pickFrom } from '@utils/general';

@Component({
    selector: 'nx-modal-delete-cloud-user-content',
    templateUrl: 'delete-cloud-user.component.html'
})
export class DeleteCloudUserModalContent {
    @Input() closable = true;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    cloudApi: NxCloudApiService;
    deleteCloudUser: Process;
    passwordForUser: string = '';
    passwordError: string = '';

    @ViewChild('deleteCloudUserForm') deleteForm: NgForm;

    constructor(
        private configService: NxConfigService,
        private language: NxLanguageProviderService,
        private processService: NxProcessService,
        private dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: any,
    ) {
        this.CONFIG = this.configService.getConfig();
        this.LANG = this.language.translations;
    }

    ngOnInit(): void {
        pickFrom(this.dialogData, ['cloudApi'], this);

        this.deleteCloudUser = this.processService
            .createProcess(() => this.cloudApi.deleteCloudUser(this.passwordForUser),
                {
                    errorCodes: {
                        forbidden: this.LANG.errorCodes.cantDeleteAccountOwningSystems(),
                        wrongParameters: () => {
                            this.deleteForm.form.controls.password.setErrors({ passwordMissing: true });
                            this.passwordError = this.LANG.passwordRequirements.missingMessage();
                        },
                        wrongPassword: () => {
                            this.deleteForm.form.controls.password.setErrors({ passwordWrong: true });
                            this.passwordError = this.LANG.errorCodes.notAuthorized();
                        }
                    },
                    ignoreError: false
                })
            .then(res => {
                if (res.resultCode === 'ok') {
                    this.close(res);
                }
            });
    }

    close = (msg: string | boolean = false) => {
        this.dialogRef.close(msg);
    };

    clearErrors() {
        this.deleteForm.form.controls.password.setErrors({});
    }

    setPassword(input) {
        this.passwordError = input.touched && input.errors?.required
            ? this.LANG.passwordRequirements.missingMessage()
            : '';
        this.passwordForUser = input.value;
    }
}
