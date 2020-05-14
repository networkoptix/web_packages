import { Component, Input, ViewChild } from '@angular/core';
import { NgbActiveModal }              from '@ng-bootstrap/ng-bootstrap';
import { NxConfigService, IConfig }    from '../../services';
import { NxLanguageProviderService }   from '../../services/nx-language-provider';
import { NxProcessService, Process }            from '../../services/process.service';
import { LanguageI18NStaticTypes }     from '../../../language_i18n_static_types';

@Component({
    selector    : 'nx-modal-delete-cloud-user-content',
    templateUrl : 'delete-cloud-user.component.html'
})
export class DeleteCloudUserModalContent {
    @Input() cloudApi;
    @Input() closable;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    deleteCloudUser: Process;
    passwordForUser: string = '';
    passwordError: string = '';

    @ViewChild('deleteCloudUserForm') deleteForm: HTMLFormElement;

    constructor(public activeModal: NgbActiveModal,
                private configService: NxConfigService,
                private language: NxLanguageProviderService,
                private processService: NxProcessService
    ) {
        this.CONFIG = this.configService.getConfig();
        this.LANG = this.language.getTranslations();
    }

    ngOnInit() {
        this.deleteCloudUser = this.processService
            .createProcess(() => this.cloudApi.deleteCloudUser(this.passwordForUser),
                {
                    errorCodes: {
                        missingPassword: () => {
                            this.passwordError = this.LANG.passwordRequirements.missingMessage;
                        },
                        wrongPassword: () => {
                            this.deleteForm.form.controls.password.setErrors({ passwordWrong: true });
                            this.passwordError = this.LANG.errorCodes.notAuthorized;
                        }
                    },
                    ignoreError: true
                })
            .then(res => {
                if (res.resultCode === 'ok') {
                    this.activeModal.close(res);
                }
            });
    }

    setPassword(input) {
        this.passwordError = input.touched && input.errors?.required
            ? this.LANG.passwordRequirements.missingMessage
            : '';
        this.passwordForUser = input.value;
    }
}
