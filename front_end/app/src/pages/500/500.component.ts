import { Component } from '@angular/core';
import { NxPageService } from '../../services/page.service';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxConfigService } from '../../services/nx-config';

@Component({
    selector   : 'nx-500',
    styleUrls: ['500.component.scss'],
    templateUrl: '500.component.html'
})
export class Nx500Component {
    LANG: any;
    CONFIG: any;

    constructor(configService: NxConfigService,
                languageService: NxLanguageProviderService,
                private pageService: NxPageService,
    ) {
        this.LANG = languageService.getTranslations();
        this.pageService.setPageTitle(this.LANG.common.systemServerError);
        this.CONFIG = configService.getConfig();
    }
}
