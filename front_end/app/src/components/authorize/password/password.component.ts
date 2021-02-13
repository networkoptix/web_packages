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

    @Input() passwordProcess: Process;
    @Input() loginEmail: string;
    @Input() loginPassword: string;
    @Output() loginPasswordChange = new EventEmitter<string>();
    @Input() errorCode: string;
    sendPassword: any;
    @ViewChild('passwordForm', { static: false }) passwordForm: HTMLFormElement;

    constructor(
        language: NxLanguageProviderService,
        configService: NxConfigService
    ) {
        this.LANG = language.translations;
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        this.sendPassword = () => {
            this.loginPasswordChange.emit(this.loginPassword);
        };
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.errorCode) {
            this.passwordForm?.controls.password.setErrors({ [changes.errorCode.currentValue]: true });
        }
    }

    ngOnDestroy(): void {}
}
