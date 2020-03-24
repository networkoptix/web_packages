import { Component, Input }          from '@angular/core';
import { NgbActiveModal }            from '@ng-bootstrap/ng-bootstrap';
import { NxConfigService, IConfig }  from '../../services/nx-config';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxProcessService }          from '../../services/process.service';
import { LanguageI18NStaticTypes }   from '../../../language_i18n_static_types';

@Component({
    selector    : 'nx-modal-delete-cloud-user-content',
    templateUrl : 'delete-cloud-user.component.html'
})
export class DeleteCloudUserModalContent {
    @Input() cloudApi;
    @Input() closable;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    deleteCloudUser: any;
    passwordForUser: string = '';
    passwordError: string = '';

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
                            this.passwordError = this.LANG.errorCodes.notAuthorized;
                        }
                    },
                    ignoreError: true
                })
            .then(res => this.activeModal.close(res));
    }

    setPassword(input) {
        this.passwordError = input.touched && input.errors && input.errors.required
            ? this.LANG.passwordRequirements.missingMessage
            : '';
        this.passwordForUser = input.value;
    }
}
