import { Component, Input }          from '@angular/core';
import { IConfig, NxConfigService }  from '../../../../../services/nx-config';
import { LanguageI18NStaticTypes }   from '../../../../../../language_i18n_static_types';
import { NxLanguageProviderService } from '../../../../../services/nx-language-provider';

@Component({
    selector    : 'nx-license-summary-component',
    templateUrl : 'summary.component.html',
    styleUrls   : ['summary.component.scss']
})

export class NxLicenseSummaryComponent {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    @Input() licenses: any = [];

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.getTranslations();
    }
}
