import { Component, Input, HostListener, OnInit, Output, EventEmitter } from '@angular/core';
import { UntilDestroy }                           from '@ngneat/until-destroy';

import { NxConfigService, IConfig }  from '../../../../services/nx-config';
import { NxLanguageProviderService } from '../../../../services/nx-language-provider';
import { LanguageI18NStaticTypes }   from '../../../../../language_i18n_static_types';
import { AboutNode } from '../about.component';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-integrations',
    templateUrl : 'integrations.component.html',
    styleUrls   : ['integrations.component.scss']
})
export class NxIntegrationsComponent implements OnInit {
    @Input() integrationsNode: AboutNode;

    currentWindowWidth: number;

    @HostListener('window:resize') onResize() {
        this.currentWindowWidth = window.innerWidth;
    }

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    constructor(configService: NxConfigService, languageService: NxLanguageProviderService) {
        this.CONFIG = configService.config;
        this.LANG = languageService.translations;
    }

    ngOnInit() {
        this.currentWindowWidth = window.innerWidth;
    }
};
