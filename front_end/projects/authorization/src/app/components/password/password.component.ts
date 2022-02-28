import {
    Component, EventEmitter, Input, OnDestroy,
    OnInit, Output, SimpleChanges, OnChanges, ViewChild
} from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { environment } from '@environments/environment';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { Process } from '@services/process.service';

import { AuthorizeStateType } from '../authorize.component';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-authorize-password-component',
    templateUrl: 'password.component.html',
    styleUrls: ['password.component.scss']
})
export class NxAuthorizePasswordComponent implements OnInit, OnChanges, OnDestroy {
    CONFIG: IConfig;
    readonly environment = environment;
    LANG: LanguageI18NStaticTypes;

    @Input() viewType: string;
    @Input() clientType: string;
    @Input() smallView: boolean;
    @Input() loginEmail: string;
    @Input() emailLocked: boolean;
    @Input() loginPassword: string;
    @Output() loginPasswordChange = new EventEmitter<string>();
    @Input() passwordProcess: Process;
    @Input() errorCode: string;
    @Output() setCurrentState = new EventEmitter<AuthorizeStateType>();

    sendPassword: any;
    @ViewChild('passwordForm', { static: false }) passwordForm: HTMLFormElement;
    passwordToggle = true;
    header: string;
    subHeader: string;
    subHeaderSuffix: string;
    templateText: {
        [clientType: string]: {
            header: string,
            subHeader: string,
            subHeaderSuffix?: string
        }
    };

    constructor(
        language: NxLanguageProviderService,
        configService: NxConfigService
    ) {
        this.LANG = language.translations;
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        this.setupText();
        this.setText();
        this.sendPassword = () => {
            this.loginPasswordChange.emit(this.loginPassword);
        };
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.errorCode?.currentValue) {
            this.passwordForm?.controls.password.setErrors({ [changes.errorCode.currentValue]: true });
        }

        if (!changes.clientType?.firstChange) {
            this.setText();
        }
    }

    logout() {
        // clear out local storage of email/user information
    }

    setupText() {
        const auth = this.LANG.authorize;
        const connect = {
            header: auth.connectHeader(),
            subHeader: auth.toAccountSubheader()
        };
        const renew = {
            header: auth.expiredHeader(),
            subHeader: auth.expiredAccountSubheader()
        };
        const subHeader = auth.asAccountSubheader();
        const login = {
            header: auth.loginCloudHeader(),
            subHeader
        };
        this.templateText = {
            loginToCloud: login,
            loginToWebadmin: login,
            confirmPasswordDisconnect: {
                header: auth.loginCloudHeader(),
                subHeader,
                subHeaderSuffix: auth.passwordDisconnect()
            },
            confirmPasswordMerge: {
                header: auth.loginCloudHeader(),
                subHeader,
                subHeaderSuffix: auth.passwordMerge()
            },
            confirmPasswordCreateBackup: {
                header: auth.loginCloudHeader(),
                subHeader,
                subHeaderSuffix: auth.passwordBackup()
            },
            confirmPasswordRestoreBackup: {
                header: auth.loginCloudHeader(),
                subHeader,
                subHeaderSuffix: auth.passwordRestore()
            },
            confirmPasswordResetServer: {
                header: auth.loginCloudHeader(),
                subHeader,
                subHeaderSuffix: auth.passwordReset()
            },
            confirmPasswordRestartServer: {
                header: auth.loginCloudHeader(),
                subHeader,
                subHeaderSuffix: auth.passwordRestart()
            },
            confirmPasswordDetachServer: {
                header: auth.loginCloudHeader(),
                subHeader,
                subHeaderSuffix: auth.passwordDetach()
            },
            connectSystemToCloud: connect,
            setupWizard: connect,
            renewSessionDesktop: renew,
            renewSessionWeb: renew
        };
    }

    setText() {
        this.header = this.templateText[this.clientType]?.header;
        this.subHeader = this.templateText[this.clientType]?.subHeader;
        if (this.clientType.includes('Password')) {
            this.subHeaderSuffix = this.templateText[this.clientType]?.subHeaderSuffix;
        }
    }

    ngOnDestroy(): void {}
}
