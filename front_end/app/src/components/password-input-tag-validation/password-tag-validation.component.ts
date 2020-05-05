import {
    Component, Input,
    OnChanges, SimpleChanges,
    ViewEncapsulation
}                                    from '@angular/core';
import {
    NxConfigService, IConfig, NxLanguageProviderService
}                                    from '../../services';
import { LanguageI18NStaticTypes }   from '../../../language_i18n_static_types';

@Component({
    selector     : 'nx-password-input-tag-validation',
    templateUrl  : 'password-tag-validation.component.html',
    styleUrls    : ['password-tag-validation.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class NxPasswordTagValidationComponent implements OnChanges {
    @Input() forElement: any;
    @Input() value: any;

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
            this.forElement.weak = false;
            if (this.forElement.errors && !this.forElement.errors.pattern) {
                const { weak, common, minlength, required } = this.forElement.errors;
                this.weak = (weak && !common && !minlength) || (common && !minlength && !required) || minlength;
            }
        }
    }
}
