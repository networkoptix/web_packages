import { Component, Input }          from '@angular/core';
import { NxConfigService }           from '../../services/nx-config';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NgModel }                   from '@angular/forms';

@Component({
    selector   : 'nx-password-input-validation',
    templateUrl: 'password-validation.component.html',
    styleUrls  : ['password-validation.component.scss'],
})
export class NxPasswordValidationComponent {

    @Input() forElement: NgModel;

    CONFIG: any = {};
    LANG: any = {};
    fairPassword: boolean;
    passwordToggle: boolean;

    constructor(private configService: NxConfigService,
                private languageService: NxLanguageProviderService,
    ) {
        this.CONFIG = this.configService.getConfig();
        this.LANG = this.languageService.getTranslations();
    }
}
