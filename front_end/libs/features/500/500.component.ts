import { Component } from '@angular/core';

import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';

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
    ) {
        this.LANG = languageService.translations;
        this.CONFIG = configService.getConfig();
    }
}
