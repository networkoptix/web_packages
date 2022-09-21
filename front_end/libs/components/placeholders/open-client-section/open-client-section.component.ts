import { Component, Input, OnInit } from '@angular/core';

import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxSystem } from '@services/system.service/system';

/* Usage
 <nx-section-placeholder
     svgFileName='filename minus the .svg'
     height?='#' // desired height (in px's) of icon
     width?='#' // desired width (in px's) of icon
     translatedMessage?='{{ LANG.whateverYouWantFromHere }}'>
 </nx-section-placeholder>
 */

@Component({
    selector: 'nx-open-client-section-placeholder',
    templateUrl: './open-client-section.component.html',
    styleUrls: ['../section/section-placeholder.component.scss']
})
export class NxOpenClientSectionPlaceholderComponent implements OnInit {
    @Input() svgFileName: string;
    @Input() wrapperHeight: number = 203;
    @Input() height: string;
    @Input() width: string;
    @Input() system: NxSystem;
    @Input() translatedMessage: string;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    constructor(
        languageService: NxLanguageProviderService,
        configService: NxConfigService
    ) {
        this.LANG = languageService.translations;
        this.CONFIG = configService.getConfig();
    }

    ngOnInit(): void {
        this.height = this.height || '64';
        this.width = this.width || '64';
        this.svgFileName = this.svgFileName || 'system_settings_placeholder';
    }
}
