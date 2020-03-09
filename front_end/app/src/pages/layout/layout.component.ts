import { Component } from '@angular/core';
import { NxPageService } from '../../services/page.service';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { LanguageI18NStaticTypes } from '../../../language_i18n_static_types';

@Component({
    selector   : 'nx-grid-layout',
    styleUrls: ['layout.component.scss'],
    templateUrl: 'layout.component.html'
})
export class NxGridLayoutComponent {
    LANG: LanguageI18NStaticTypes;
    constructor(private languageService: NxLanguageProviderService,
                private pageService: NxPageService,
    ) {
        this.LANG = this.languageService.getTranslations();
    }
}
