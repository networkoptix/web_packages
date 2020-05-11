import { Component }                 from '@angular/core';
import { NxPageService }             from '../../services/page.service';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { LanguageI18NStaticTypes }   from '../../../language_i18n_static_types';

@Component({
    selector   : 'nx-404',
    styleUrls  : ['404.component.scss'],
    templateUrl: '404.component.html'
})
export class Nx404Component {
    LANG: LanguageI18NStaticTypes;

    constructor(
        languageService: NxLanguageProviderService,
        pageService: NxPageService
    ) {
        this.LANG = languageService.translations;
        pageService.setPageTitle(this.LANG.pageTitles.pageNotFound);
    }
}
