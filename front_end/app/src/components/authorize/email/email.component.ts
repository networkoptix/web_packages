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

    @Output() setCurrentState = new EventEmitter<AuthorizeState>();
    @Input() emailProcess: Process;
    @Input() errorCode: string;
    @Input() loginEmail: string;
    @Output() loginEmailChange = new EventEmitter<string>();

    sendEmail: any;
    @ViewChild('emailForm', { static: false }) emailForm: HTMLFormElement;

    constructor(
        language: NxLanguageProviderService,
        configService: NxConfigService
    ) {
        this.LANG = language.translations;
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
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

    createAccount() {
        this.setCurrentState.emit(AuthorizeState.create);
    }
}
