import {
    Component,
    Input,
    ViewEncapsulation
} from '@angular/core';
import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';

import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';

@Component({
    selector: 'nx-password-input-tag-validation',
    templateUrl: 'password-tag-validation.component.html',
    styleUrls: ['password-tag-validation.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class NxPasswordTagValidationComponent {
    @Input() forElement;

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
        this.LANG = languageService.translations;
    }
}
