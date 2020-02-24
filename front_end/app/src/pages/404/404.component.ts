import { Component } from '@angular/core';
import { NxPageService } from '../../services/page.service';
import { NxLanguageProviderService } from '../../services/nx-language-provider';

@Component({
    selector   : 'nx-404',
    styleUrls: ['404.component.scss'],
    templateUrl: '404.component.html'
})
export class Nx404Component {
    LANG: any;
    constructor(languageService: NxLanguageProviderService,
                pageService: NxPageService,
    ) {
        this.LANG = languageService.getTranslations();
        pageService.setPageTitle(this.LANG.pageTitles.pageNotFound);
    }
}
