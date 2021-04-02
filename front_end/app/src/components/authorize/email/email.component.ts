import {
    Component, EventEmitter, Input, OnChanges, OnDestroy,
    OnInit, Output, SimpleChanges, ViewChild
}                       from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';

import { NxConfigService, IConfig }  from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { Process }                   from '@services/process.service';
import { LanguageI18NStaticTypes }   from '@app/language_i18n_static_types';

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
    @Input() viewType: string;
    @Input() loginEmail: string;
    @Output() loginEmailChange = new EventEmitter<string>();
    @Input() emailProcess: Process;
    @Input() errorCode: string;
    @Output() setCurrentState = new EventEmitter<string>();

    sendEmail: any;
    @ViewChild('emailForm', { static: false }) emailForm: HTMLFormElement;
    header: string;
    subHeader: string;
    templateText: {
        [clientType: string]: {
            header: string,
            subHeader?: string
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
        this.sendEmail = () => {
            this.loginEmailChange.emit(this.loginEmail);
        };
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.errorCode.currentValue) {
            this.emailForm?.controls.email.setErrors({ [changes.errorCode.currentValue]: true });
        }

        if (!changes.clientType?.firstChange) {
            this.setText();
        }
    }

    ngOnDestroy(): void {}

    setupNonCloudSystem() {
        // TODO: waiting for new setup wizard
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
        this.templateText = {
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
    }

    setText() {
        this.header = this.templateText[this.clientType]?.header;
        this.subHeader = this.templateText[this.clientType]?.subHeader;
    }
}
