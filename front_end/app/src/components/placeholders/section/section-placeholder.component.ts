import { Component, Input, OnInit }    from '@angular/core';
import { NxLanguageProviderService }   from '../../../services/nx-language-provider';
import { NxConfigService, IConfig }             from '../../../services/nx-config';
import { LanguageI18NStaticTypes } from '../../../../language_i18n_static_types';

/* Usage
<nx-section-placeholder
    svgFileName='filename minus the .svg'
    height?='#' // desired height (in px's) of icon
    width?='#' // desired width (in px's) of icon
    translatedMessage?='{{ LANG.whateverYouWantFromHere }}'>
</nx-section-placeholder>
*/

@Component({
    selector: 'nx-section-placeholder',
    templateUrl: 'section-placeholder.component.html',
    styleUrls: ['section-placeholder.component.scss'],
})
export class NxSectionPlaceholderComponent implements OnInit {
    @Input() svgFileName: string;
    @Input() height: string;
    @Input() width: string;
    @Input() translatedMessage: string;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    constructor(
        private languageService: NxLanguageProviderService,
        private configService: NxConfigService,
    ) {
        this.LANG = this.languageService.getTranslations();
        this.CONFIG = this.configService.getConfig();
    }

    ngOnInit() {
        this.height = this.height || '64';
        this.svgFileName = this.svgFileName || 'system_settings_placeholder';
    }
}
