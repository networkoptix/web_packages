import {
    Component, EventEmitter, Input, OnDestroy,
    OnInit, Output
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
export class NxAuthorizePasswordComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    @Input() passwordProcess: Process;
    @Input() authorizeEmail: string;
    @Output() sendPasswordToParent = new EventEmitter<string>();
    authorizePassword: string;
    sendPassword: any;

    constructor(
        language: NxLanguageProviderService,
        configService: NxConfigService
    ) {
        this.LANG = language.translations;
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        this.sendPassword = () => {
            this.sendPasswordToParent.emit(this.authorizePassword);
        };
    }

    ngOnDestroy(): void {}
}
