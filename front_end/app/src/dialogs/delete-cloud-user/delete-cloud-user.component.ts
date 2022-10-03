import { Component, Input, ViewChild } from '@angular/core';
import type { NgForm } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';

@Component({
    selector: 'nx-modal-delete-cloud-user-content',
    templateUrl: 'delete-cloud-user.component.html'
})
export class DeleteCloudUserModalContent {
    @Input() cloudApi;
    @Input() closable;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    deleteCloudUser: Process;
    passwordForUser: string = '';
    passwordError: string = '';

    @ViewChild('deleteCloudUserForm') deleteForm: NgForm;

    constructor(
        public activeModal: NgbActiveModal,
        private configService: NxConfigService,
        private language: NxLanguageProviderService,
        private processService: NxProcessService
    ) {
        this.CONFIG = this.configService.getConfig();
        this.LANG = this.language.translations;
    }

    ngOnInit() {
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
                    this.activeModal.close(res);
                }
            });
    }

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
