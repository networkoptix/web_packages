import { Component } from '@angular/core';
import { NxPageService } from '../../services/page.service';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxConfigService, IConfig } from '../../services/nx-config';
import { LanguageI18NStaticTypes } from '../../../language_i18n_static_types';

@Component({
    selector   : 'nx-503',
    styleUrls : ['503.component.scss'],
    templateUrl: '503.component.html'
})
export class Nx503Component {
    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    constructor(configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private pageService: NxPageService
    ) {
        this.LANG = languageService.getTranslations();
        this.pageService.setPageTitle(this.LANG.common.maintenanceInProgress);
        this.CONFIG = configService.getConfig();
    }
}
