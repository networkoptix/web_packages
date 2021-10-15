import { Component, Input }          from '@angular/core';
import { NgbActiveModal }            from '@ng-bootstrap/ng-bootstrap';

import { NxProcessService, Process } from '@services/process.service';
import { NxToastService }            from '../toast.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxConfigService, IConfig }  from '@services/nx-config';
import { LanguageI18NStaticTypes }   from '@app/language_i18n_static_types';
import { NxSystem }                  from '@services/system.service';
import { NxCloudApiService }         from '@services/nx-cloud-api';
import { NxAccountService }          from '@services/account.service';

@Component({
    selector: 'mandatory-2fa',
    templateUrl: 'mandatory-2fa.component.html',
    styleUrls: []
})
export class Mandatory2faModalContent {
    @Input() system2faEnabled: boolean;
    @Input() system: NxSystem;
    @Input() closable;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;
    mandatory2fa: Process;
    verificationCode: string;
    showError = false;

    // TODO: get the number of user's without 2fa for system
    usersWithout2fa = 0;

    constructor(
        language: NxLanguageProviderService,
        configService: NxConfigService,
        public activeModal: NgbActiveModal,
        private accountService: NxAccountService,
        private cloudApiService: NxCloudApiService,
        private processService: NxProcessService,
        private toastService: NxToastService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;
    }

    cancel = () => this.activeModal.close('cancel');

    ngOnInit() {
        this.showError = !this.accountService.account.account2faEnabled;
        const options = {
            classname: this.CONFIG.toast.warning,
            autohide: true,
            delay: this.CONFIG.alertTimeout
        };
        this.mandatory2fa = this.processService
            .createProcess(
                () => this.cloudApiService.toggle2faForSystem(this.system.id, this.verificationCode).toPromise(),
                { ignoreError: true },
                () => {
                    this.system.currentServerNotBusy = true;
                    this.activeModal.close('success');
                    options.classname = this.CONFIG.toast.success;
                    const successMessage = this.system2faEnabled
                        ? this.LANG.dialogs.message.system2faEnabled()
                        : this.LANG.dialogs.message.system2faDisabled();
                    this.toastService.show(successMessage, options);
                },
                () => {
                    this.system.currentServerNotBusy = true;
                    this.showError = true;
                }
            );
    }

    close() {
        this.activeModal.close();
    }
}
