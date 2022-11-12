import {
    Component,
    Input,
    ViewEncapsulation
} from '@angular/core';

import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { NxLanguageProviderService } from '@services/nx-language-provider';

@Component({
    selector: 'nx-password-input-tag-validation',
    templateUrl: 'password-tag-validation.component.html',
    styleUrls: ['password-tag-validation.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class NxPasswordTagValidationComponent {
    @Input() forElement;

    LANG: LanguageI18NStaticTypes;
    fairPassword: boolean;
    passwordToggle: boolean;

    weak: boolean;

    constructor(
        languageService: NxLanguageProviderService
    ) {
        this.LANG = languageService.translations;
    }
}
