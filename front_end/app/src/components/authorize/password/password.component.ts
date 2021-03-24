import {
    Component, EventEmitter, Input, OnDestroy,
    OnInit, Output, SimpleChanges, OnChanges, ViewChild
}                       from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';

import { NxConfigService, IConfig }  from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { Process }                   from '@services/process.service';
import { LanguageI18NStaticTypes }   from '@app/language_i18n_static_types';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-authorize-password-component',
    templateUrl : 'password.component.html',
    styleUrls   : ['password.component.scss']
})
export class NxAuthorizePasswordComponent implements OnInit, OnChanges, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    @Input() viewType: string;
    @Input() clientType: string;
    @Input() smallView: boolean;
    @Input() loginEmail: string;
    @Input() loginPassword: string;
    @Output() loginPasswordChange = new EventEmitter<string>();
    @Input() passwordProcess: Process;
    @Input() errorCode: string;
    @Output() setCurrentState = new EventEmitter<string>();
    @Output() isStayingLoggedIn = new EventEmitter<boolean>();

    sendPassword: any;
    @ViewChild('passwordForm', { static: false }) passwordForm: HTMLFormElement;
    stayLoggedIn = false;
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
            this.isStayingLoggedIn.emit(this.stayLoggedIn);
        };
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.errorCode) {
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
            header    : auth.connectHeader(),
            subHeader : auth.toAccountSubheader()
        };
        const renew = {
            header    : auth.expiredHeader(),
            subHeader : auth.expiredAccountSubheader()
        };
        const subHeader = auth.asAccountSubheader();
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
