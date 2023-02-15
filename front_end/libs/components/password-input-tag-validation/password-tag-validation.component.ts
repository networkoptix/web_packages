import { Component, Input, ViewEncapsulation } from '@angular/core';

import staticLang from '@common/language/language_i18n_static.json';

@Component({
    selector: 'nx-password-input-tag-validation',
    templateUrl: 'password-tag-validation.component.html',
    styleUrls: ['password-tag-validation.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class NxPasswordTagValidationComponent {
    @Input() forElement;

    LANG = staticLang;
    fairPassword: boolean;
    passwordToggle: boolean;

    weak: boolean;
}
