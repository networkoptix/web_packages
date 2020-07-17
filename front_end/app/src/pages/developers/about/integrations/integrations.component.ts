import { Component, Input, HostListener, OnInit } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { NxConfigService, IConfig } from '../../../../services/nx-config';
import { LanguageI18NStaticTypes } from '../../../../../language_i18n_static_types';
import { NxLanguageProviderService } from '../../../../services/nx-language-provider';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-integrations',
    templateUrl : 'integrations.component.html',
    styleUrls   : ['integrations.component.scss']
})
export class NxIntegrationsComponent implements OnInit {
    @Input() integrationsLink: string = '/developers/';
    @Input() integrationsHeading: string = 'Integration Store';
    @Input() integrationInfoHeading: string = 'What is it?';
    @Input() integrationInfoBody: string = '"The moment you think of buying a Web Hosting Plan, you know one thing – So many choices, which one to choose? Whether you would want to choose Shared Linux Packages or a Unix which one to choose?';
    @Input() integrationInfoLink: string = '/developers/about/';
    @Input() integrationInfoLinkText: string = 'Get Access';
    @Input() integrationBlocksIntro: string = 'Examples of Plugins';
    @Input() integrationStoreLink: string = '/developers/';
    @Input() integrationStoreText: string = 'Go to Store'
    @Input() moreIntegrations = 136;

    @Input() integrations: Integration[] = mockIntegrations;

    currentWindowWidth: number;

    @HostListener('window:resize') onResize() {
        this.currentWindowWidth = window.innerWidth
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

class Integration {
    constructor(
        public name: string,
        public link: string,
        public icon: string
    ) {}
}

const mockIntegrations = [
    new Integration('Plugin BTO', '/developers/','users.svg'),
    new Integration('Plugin BTO', '/developers/','systems.svg'),
    new Integration('Plugin BTO', '/developers/','storages.svg'),
    new Integration('Plugin BTO', '/developers/','cameras.svg'),
    new Integration('Plugin BTO', '/developers/','interface.svg')
]