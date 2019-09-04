import { Component } from '@angular/core';
import { NxPageService } from '../../services/page.service';
import { NxLanguageProviderService } from '../../services/nx-language-provider';

@Component({
    selector   : 'nx-404',
    templateUrl: '404.component.html'
})
export class Nx404Component {
    LANG: any;
    constructor(private languageService: NxLanguageProviderService,
                private pageService: NxPageService) {
        this.LANG = this.languageService.getTranslations();
        this.pageService.setPageTitle(this.LANG.pageTitles.pageNotFound);
    }
}
