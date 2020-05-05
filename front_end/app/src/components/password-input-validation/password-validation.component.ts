import { Component, Input, OnChanges, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { IConfig, NxConfigService, NxLanguageProviderService }           from '../../services';
import { LanguageI18NStaticTypes }                                       from '../../../language_i18n_static_types';

@Component({
    selector   : 'nx-password-input-validation',
    templateUrl: 'password-validation.component.html',
    styleUrls  : ['password-validation.component.scss']
})
export class NxPasswordValidationComponent implements OnChanges {
    @Input() forElement: any;
    @Input() value: any;
    @Input() customClass: any;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    fairPassword: boolean;
    passwordToggle: boolean;

    weak: boolean;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.getTranslations();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.value) {
            this.weak = (this.forElement.errors && this.forElement.errors.minlength && !this.forElement.errors.pattern); // weak
        }
    }
}
