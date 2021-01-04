import { Component, OnInit, OnDestroy } from '@angular/core';
import { IntegrationService }           from '../../integration.service';
import { NxMenuService }                from '../../../../components/menu/menu.service';
import { NxConfigService, IConfig }     from '../../../../services/nx-config';
import { NxPageService }                from '../../../../services/page.service';
import { LanguageI18NStaticTypes }      from '../../../../../language_i18n_static_types';
import { NxLanguageProviderService }    from '../../../../services/nx-language-provider';

@Component({
    selector: 'setup-component',
    templateUrl: 'setup.component.html',
    styleUrls: ['setup.component.scss']
})

export class NxSetupComponent implements OnInit, OnDestroy {
    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    plugin: any = {};

    private setupDefaults() {
        this.plugin = this.integrationService.getIntegrationPlugin();
        this.menuService.setDetailsSection('how-to-setup');
    }

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private pageService: NxPageService,
        private integrationService: IntegrationService,
        private menuService: NxMenuService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;

        this.setupDefaults();
    }

    ngOnInit(): void {
        // this is still 20.1 ... double braces will break translation service in 20.2
        // TODO: when merge into 20.2 mod the param notification
        this.pageService.pageDescription = this.LANG.pageDescriptions.integrationSetup
            .replace('{{pluginName}}', this.plugin.information.name)
            .replace('{{pluginShortDecr}}', this.plugin.information.shortDescription);
    }

    ngOnDestroy() {
    }

    onSubmit() {
    }
}
