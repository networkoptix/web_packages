import {
    Component, EventEmitter, Input, OnChanges, OnDestroy,
    OnInit, Output, SimpleChanges, ViewChild
}                       from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';

import { NxConfigService, IConfig }  from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { Process }                   from '@services/process.service';
import { LanguageI18NStaticTypes }   from '../../../../language_i18n_static_types';
import { AuthorizeState } from '../authorize.component';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-authorize-email-component',
    templateUrl : 'email.component.html',
    styleUrls   : ['email.component.scss']
})
export class NxAuthorizeEmailComponent implements OnInit, OnDestroy, OnChanges {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    @Input() clientType: string;
    @Input() loginEmail: string;
    @Output() loginEmailChange = new EventEmitter<string>();
    @Input() emailProcess: Process;
    @Input() errorCode: string;
    @Output() setCurrentState = new EventEmitter<AuthorizeState>();

    sendEmail: any;
    @ViewChild('emailForm', { static: false }) emailForm: HTMLFormElement;
    header: string;
    subHeader: string;

    constructor(
        language: NxLanguageProviderService,
        configService: NxConfigService
    ) {
        this.LANG = language.translations;
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        this.setupText();
        this.sendEmail = () => {
            this.loginEmailChange.emit(this.loginEmail);
        };
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.errorCode) {
            this.emailForm?.controls.email.setErrors({ [changes.errorCode.currentValue]: true });
        }
    }

    ngOnDestroy(): void {}

    setupNonCloudSystem() {
        // TODO: waiting for new setup wizard
    }

    createAccount() {
        this.setCurrentState.emit(AuthorizeState.create);
    }

    setupText() {
        const auth = this.LANG.authorize;
        const connect = {
            header    : auth.connectHeader(),
            subHeader : auth.connectSubheader()
        };
        const renew = {
            header    : auth.expiredHeader(),
            subHeader : auth.expiredSubheader()
        };
        const text = {
            loginToCloud: {
                header: auth.loginCloudHeader()
            },
            loginToSystem: {
                header: NxLanguageProviderService.translate(
                    auth.loginSystemHeader,
                    { systemName: '' }),
                subHeader: auth.loginSystemSubheader()
            },
            connectSystemToCloud : connect,
            setupWizard          : connect,
            renewSessionDesktop  : renew,
            renewSessionWeb      : renew
        };

        this.header = text[this.clientType].header;
        this.subHeader = text[this.clientType].subHeader;
    }
}
