import {
    Component, EventEmitter, Input, OnDestroy,
    OnInit, Output, SimpleChanges, OnChanges, ViewChild
}                       from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';

import { NxConfigService, IConfig }  from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { Process }                   from '@services/process.service';
import { LanguageI18NStaticTypes }   from '../../../../language_i18n_static_types';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-authorize-password-component',
    templateUrl : 'password.component.html',
    styleUrls   : ['password.component.scss']
})
export class NxAuthorizePasswordComponent implements OnInit, OnChanges, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    @Input() clientType: string;
    @Input() loginEmail: string;
    @Input() loginPassword: string;
    @Output() loginPasswordChange = new EventEmitter<string>();
    @Input() passwordProcess: Process;
    @Input() errorCode: string;

    sendPassword: any;
    @ViewChild('passwordForm', { static: false }) passwordForm: HTMLFormElement;
    header: string;
    subHeader: string;
    templateText: {
        [clientType: string]: {
            header: string,
            subHeader: string
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
        if (changes.errorCode) {
            this.passwordForm?.controls.password.setErrors({ [changes.errorCode.currentValue]: true });
        }

        if (!changes.clientType.firstChange) {
            this.setText();
        }
    }

    logout() {
        // clear out local storage of email/user information
    }

    setupText() {
        const auth = this.LANG.authorize;
        const connect = {
            header    : auth.connectHeader(),
            subHeader : NxLanguageProviderService.translate(
                auth.toAccountSubheader,
                { accountEmail: this.loginEmail })
        };
        const renew = {
            header    : auth.expiredHeader(),
            subHeader : NxLanguageProviderService.translate(
                auth.expiredAccountSubheader,
                { accountEmail: this.loginEmail })
        };
        const subHeader = NxLanguageProviderService.translate(
            auth.asAccountSubheader,
            { accountEmail: this.loginEmail });
        this.templateText = {
            loginToCloud: {
                header: auth.loginCloudHeader(),
                subHeader
            },
            loginToSystem: {
                header: NxLanguageProviderService.translate(
                    auth.loginSystemHeader,
                    { systemName: '' }),
                subHeader
            },
            connectSystemToCloud : connect,
            setupWizard          : connect,
            renewSessionDesktop  : renew,
            renewSessionWeb      : renew
        };
    }
    
    setText() {
        this.header = this.templateText[this.clientType]?.header;
        this.subHeader = this.templateText[this.clientType]?.subHeader;
    }

    ngOnDestroy(): void {}
}
