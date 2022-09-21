import { Component } from '@angular/core';

import { NxLanguageProviderService } from '@services/nx-language-provider';
import { LanguageI18NStaticTypes } from '@src/language_i18n_static_types';

@Component({
    selector: 'nx-grid-layout',
    styleUrls: ['layout.component.scss'],
    templateUrl: 'layout.component.html'
})
export class NxGridLayoutComponent {
    LANG: LanguageI18NStaticTypes;

    constructor(
        languageService: NxLanguageProviderService
    ) {
        this.LANG = languageService.translations;
    }
}
