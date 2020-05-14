import { Component }               from '@angular/core';
import {
    NxPageService, NxLanguageProviderService,
    NxConfigService, IConfig
}                                  from '../../services';
import { LanguageI18NStaticTypes } from '../../../language_i18n_static_types';

@Component({
    selector   : 'nx-500',
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
        this.pageService.pageTitle = this.LANG.common.systemServerError;
        this.CONFIG = configService.getConfig();
    }
}
