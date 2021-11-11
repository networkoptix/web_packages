import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { IConfig, NxConfigService } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import { NxSystem } from '@services/system.service';

@Component({
    selector: 'nx-update-webadmin-session',
    templateUrl: 'update-webadmin-session.component.html'
})
export class UpdateWebadminSessionComponent implements OnInit {
    @Input('process') externalProcess: Process;
    @Input() system: NxSystem;

    @ViewChild('loginForm', { static: true }) loginForm: HTMLFormElement;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    login: Process;

    auth = {
        login: '',
        password: ''
    };

    flags = {
        accountBlocked: false,
        hideErrors: false,
        wrongCredentials: false
    };

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        public activeModal: NgbActiveModal,
        private processService: NxProcessService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
    }

    ngOnInit() {
        this.system.mediaserver.getCurrentUser()
            .then((account) => {
                console.log(account);
                this.auth.login = account.name;
            });
        const showWrongCredentialsError = () => {
            this.flags.wrongCredentials = true;
            this.loginForm.controls.login_email.setErrors({ nx_wrong_credentials: true });
            this.loginForm.controls.login_password.setErrors({ nx_wrong_credentials: true });
        };
        const settings = {
            ignoreUnauthorized: true,
            errorCodes: {
                'Wrong password.': showWrongCredentialsError,
                notAuthorized: showWrongCredentialsError,
                accountBlocked: () => {
                    this.loginForm.controls.login_password.markAsPristine();
                    this.loginForm.controls.login_password.markAsUntouched();

                    this.flags.accountBlocked = true;
                    this.loginForm.controls.login_password.setErrors({ nx_account_blocked: true });
                }
            }
        };
        const successHandler = () => {
            this.externalProcess.run();
        };
        const errorHandler = () => {};
        this.login = this.processService.createProcess(() => {
            return this.system.mediaserver.loginToken(this.auth.login, this.auth.password, true).toPromise();
        }, settings, successHandler, errorHandler);
    }

    resetForm() {}

    setLogin(login) {
        this.auth.login = login;
    }

    close = () => {
        this.activeModal.dismiss();
    }
}
