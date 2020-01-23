import { Component, Input, OnInit }    from '@angular/core';
import { NxLanguageProviderService }   from '../../../services/nx-language-provider';
import { NxConfigService }             from '../../../services/nx-config';

/* Usage
<nx-section-placeholder
    svgFileName='filename minus the .svg'
    width?='#' // desired width (in px's) of icon
    height?='#' // desired height (in px's) of icon
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
    @Input() width: string;
    @Input() height: string;
    @Input() translatedMessage: string;

    LANG: any;
    CONFIG: any;

    constructor(
        private languageService: NxLanguageProviderService,
        private configService: NxConfigService,
    ) {
        this.LANG = this.languageService.getTranslations();
        this.CONFIG = this.configService.getConfig();
    }

    ngOnInit() {
        this.width = this.width || '64';
        this.svgFileName = this.svgFileName || 'system_settings_placeholder';
    }
}
