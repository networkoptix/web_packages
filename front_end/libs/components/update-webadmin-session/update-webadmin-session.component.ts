import {
    Component,
    EventEmitter,
    Inject,
    Input,
    OnInit,
    Output,
    ViewChild
} from '@angular/core';
import type { NgForm } from '@angular/forms';

import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { DialogRef } from '@dialogs/dialog-ref';
import { NxToastService } from '@dialogs/toast.service';
import { environment } from '@environments/environment';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import type { NxSystem } from '@services/system.service/system';
import { WINDOW } from '@services/window-provider';

@Component({
    selector: 'nx-update-webadmin-session',
    templateUrl: 'update-webadmin-session.component.html'
})
export class UpdateWebadminSessionComponent implements OnInit {
    @Input() noConnectionMsg: string;
    @Input() system: NxSystem;
    @Input() processAction: string;

    @Input() dialogRef: DialogRef;
    @Output() loginSuccess = new EventEmitter<any>();

    @ViewChild('loginForm', { static: true }) loginForm: NgForm;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    login: Process;

    isCloud: boolean;

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
        private processService: NxProcessService,
        private toastService: NxToastService,
        @Inject(WINDOW) private window: Window,
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
    }

    ngOnInit(): void {
        Promise.all([
            this.system.mediaserver.getCurrentUser(),
            this.system.mediaserver.getModuleInfo().toPromise()
        ]).then(([account, serverInfo]: any) => {
            const moduleInfo = serverInfo?.reply;
            this.auth.login = account.name;
            this.isCloud = this.system.mediaserver.isSessionOauth;
            if (this.isCloud && !(this.window.navigator.onLine || moduleInfo?.serverFlags.includes('SF_HasPublicIP'))) {
                this.close();
                this.toastService.notify(
                    `${this.noConnectionMsg} ${this.LANG.toastMessage.noConnection()}`,
                    this.CONFIG.toast.danger,
                );
            }
        }).catch(() => {
            this.isCloud = !environment.isLocal;
        });

        const showWrongCredentialsError = () => {
            this.flags.wrongCredentials = true;
            this.loginForm.controls.login_email.setErrors({ nx_wrong_credentials: true });
            this.loginForm.controls.login_password.setErrors({ nx_wrong_credentials: true });
        };
        const settings = {
            ignoreUnauthorized: true,
            errorCodes: {
                invalidParameter: showWrongCredentialsError,
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
            this.loginSuccess.emit();
        };
        const errorHandler = () => { };
        this.login = this.processService.createProcess(() => {
            return this.system.mediaserver.loginToken(this.auth.login, this.auth.password, true).toPromise();
        }, settings, successHandler, errorHandler);
    }

    resetForm(): void { }

    setLogin(login): void {
        this.auth.login = login;
    }

    close = (): void => {
        this.dialogRef.close();
    };
}
