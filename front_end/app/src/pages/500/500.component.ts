import { Component } from '@angular/core';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxPageService } from '@services/page.service';

@Component({
    selector: 'nx-500',
    styleUrls: ['500.component.scss'],
    templateUrl: '500.component.html'
})
export class Nx500Component {
    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private pageService: NxPageService
    ) {
        this.LANG = languageService.translations;
        this.pageService.pageTitle = this.LANG.common.systemServerError?.();
        this.CONFIG = configService.getConfig();
    }
}
