import { Component, Input }            from '@angular/core';
import { NgbActiveModal }              from '@ng-bootstrap/ng-bootstrap';
import { NxLanguageProviderService }   from '../../services/nx-language-provider';
import { NxProcessService }            from '../../services/process.service';
import { NxConfigService }             from '../../services/nx-config/nx-config.service';
import { IConfig } from '../../services/nx-config/config-types';

@Component({
    selector: 'nx-modal-change-password',
    templateUrl: 'change-password.component.html',
    styleUrls: []
})
export class ChangePasswordModalContent {
    @Input() system: any;
    @Input() user: any;
    @Input() closable;

    LANG: any;
    CONFIG: IConfig;
    changePassword: any;
    newPasswordForUser: string;

    constructor(private activeModal: NgbActiveModal,
                private language: NxLanguageProviderService,
                private processService: NxProcessService,
                private configService: NxConfigService,
    ) {
        this.CONFIG = this.configService.getConfig();
        this.LANG = this.language.getTranslations();
        this.newPasswordForUser = '';
    }

    ngOnInit() {
        this.changePassword = this.processService
            .createProcess(() => {
                this.user.password = this.newPasswordForUser;
                return this.system.saveUser(this.user, this.user.role)
                    .then(() => this.activeModal.close());
            }, {
                errorCodes          : {
                    notAuthorized   : this.LANG.errorCodes.oldPasswordMistmatch,
                    wrongOldPassword: this.LANG.errorCodes.oldPasswordMistmatch
                },
                successMessage      : this.LANG.account.passwordChangedSuccess,
                errorPrefix         : this.LANG.errorCodes.cantChangePasswordPrefix,
                ignoreUnauthorized  : true
            });
    }

    setPassword(e) {
        this.newPasswordForUser = e;
    }
}
