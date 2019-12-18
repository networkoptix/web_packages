import { Component } from '@angular/core';
import { NxPageService } from '../../services/page.service';
import { NxLanguageProviderService } from '../../services/nx-language-provider';

@Component({
    selector   : 'nx-layout',
    styleUrls: ['layout.component.scss'],
    templateUrl: 'layout.component.html'
})
export class NxLayoutComponent {
    LANG: any;
    constructor(private languageService: NxLanguageProviderService,
                private pageService: NxPageService,
    ) {
        this.LANG = this.languageService.getTranslations();
    }
}
