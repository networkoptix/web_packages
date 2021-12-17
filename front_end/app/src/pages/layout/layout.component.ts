import { Component } from '@angular/core';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxLanguageProviderService } from '@services/nx-language-provider';

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
