import { Component, Input, Renderer2, ViewChild } from '@angular/core';
import type { NgForm } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxAccountService } from '@services/account.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import { NxSystem } from '@services/system.service';

import { NxToastService } from '../toast.service';

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

    public notAuthorized: boolean;

    @ViewChild('mandatory2faForm') mandatory2faForm: NgForm;

    // TODO: get the number of user's without 2fa for system
    usersWithout2fa = 0;

    constructor(
        language: NxLanguageProviderService,
        configService: NxConfigService,
        public activeModal: NgbActiveModal,
        private accountService: NxAccountService,
        private cloudApiService: NxCloudApiService,
        private processService: NxProcessService,
        private toastService: NxToastService,
        private renderer: Renderer2,
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;
    }

    cancel = () => this.activeModal.close('cancel');

    ngOnInit() {
        this.showError = !this.accountService.account.totpExistsForAccount;
        const options = {
            classname: this.CONFIG.toast.warning,
            autohide: true,
            delay: this.CONFIG.alertTimeout
        };
        const notAuthorizedHandler = () => {
            this.notAuthorized = true;
            this.mandatory2faForm.controls.verificationCode.markAsTouched();
            this.mandatory2faForm.controls.verificationCode.setErrors({ invalid: true });
            this.renderer.selectRootElement('#verificationCode').focus();
        };

        this.mandatory2fa = this.processService
            .createProcess(() => {
                return this.cloudApiService.toggle2faForSystem(
                    this.system.id,
                    this.verificationCode
                );
            }, {
                ignoreUnauthorized: true,
                ignoreError: true,
                errorCodes: {
                    notAuthorized: notAuthorizedHandler,
                    badRequest: notAuthorizedHandler
                }
            }, () => {
                this.system.currentServerNotBusy = true;
                this.activeModal.close('success');
                options.classname = this.CONFIG.toast.success;
                const successMessage = this.system2faEnabled
                    ? this.LANG.dialogs.message.system2faEnabled()
                    : this.LANG.dialogs.message.system2faDisabled();
                this.toastService.show(successMessage, options);
            // });
            }, (err) => {
                if (!err.resultCode) {
                    this.system.currentServerNotBusy = true;
                    this.showError = true;
                }
            });
    }

    close(msg?: string) {
        this.activeModal.close(msg);
    }
}
