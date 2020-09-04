import { Component, Input, Output, EventEmitter } from '@angular/core';
import { UntilDestroy }     from '@ngneat/until-destroy';
import { AboutNode } from '../about.component';
import { IConfig, NxConfigService } from '../../../../services/nx-config';
import { LanguageI18NStaticTypes } from '../../../../../language_i18n_static_types';
import { NxLanguageProviderService } from '../../../../services/nx-language-provider';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-support',
    templateUrl : 'support.component.html',
    styleUrls   : ['support.component.scss']
})
export class NxSupportComponent {
    @Input() supportNode: AboutNode;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    constructor(configService: NxConfigService, languageService: NxLanguageProviderService) {
        this.CONFIG = configService.config;
        this.LANG = languageService.translations;
    }
};
