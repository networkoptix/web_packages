import {
    Component, EventEmitter, Input, OnChanges, OnDestroy,
    OnInit, Output, SimpleChanges, ViewChild
}                                               from '@angular/core';
import { UntilDestroy }                         from '@ngneat/until-destroy';

import { NxConfigService, IConfig }             from '@services/nx-config';
import { NxLanguageProviderService }            from '@services/nx-language-provider';
import { Process }                              from '@services/process.service';
import { LanguageI18NStaticTypes }              from '../../../../language_i18n_static_types';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-authorize-create-account-component',
    templateUrl : 'create-account.component.html',
    styleUrls   : ['create-account.component.scss']
})
export class NxAuthorizeCreateAccountComponent implements OnInit, OnChanges, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    @Input() existingEmail: string;
    @Input() accountInfo: {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
    }

    @Output() accountInfoChange = new EventEmitter<{
        email: string;
        password: string;
        firstName: string;
        lastName: string;
    }>();

    createEmail: string;
    createFirstName: string;
    createLastName: string;
    createPassword: string;

    @Input() errorCode: [inputType: string, errorCode: string];
    hideErrors: boolean;
    weakPassword: boolean;

    @Input() createAccountProcess: Process;
    onCreateSubmit: any;

    @ViewChild('createAccountForm', { static: false }) createForm: HTMLFormElement;

    constructor(
        language: NxLanguageProviderService,
        configService: NxConfigService
    ) {
        this.LANG = language.translations;
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        this.onCreateSubmit = () => {
            this.accountInfoChange.emit({
                email     : this.existingEmail || this.createEmail,
                firstName : this.createFirstName,
                lastName  : this.createLastName,
                password  : this.createPassword
            });
        };
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.errorCode) {
            const eC = changes.errorCode.currentValue;
            this.createForm?.controls[eC[0]].setErrors({ [eC[1]]: true });
        }
    }

    ngOnDestroy(): void {}
}
