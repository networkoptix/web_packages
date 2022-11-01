import {
    Component, ViewEncapsulation
} from '@angular/core';

import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { NxLanguageProviderService } from '@services/nx-language-provider';

@Component({
    selector: 'nx-no-systems',
    templateUrl: 'no-systems.component.html',
    styleUrls: ['no-systems.component.scss'],
    encapsulation: ViewEncapsulation.None
})

export class NxNoSystemsComponent {
    LANG: LanguageI18NStaticTypes;

    constructor(
        languageService: NxLanguageProviderService,
    ) {
        this.LANG = languageService.translations;
    }
}
