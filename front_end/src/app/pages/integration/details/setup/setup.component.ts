import { Component, OnInit, OnDestroy } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { SubscriptionLike } from 'rxjs';

import { NxMenuService } from '@app/menu/menu.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxPageService } from '@services/page.service';
import { LanguageI18NStaticTypes } from '@src/language_i18n_static_types';

import { IntegrationService } from '../../integration.service';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'setup-component',
    templateUrl: 'setup.component.html',
    styleUrls: ['setup.component.scss']
})

export class NxSetupComponent implements OnInit, OnDestroy {
    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    plugin: any = {};
    pluginSubscription: SubscriptionLike;

    private setupDefaults(): void {
        this.menuService.detail = 'how-to-setup';
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
        this.pluginSubscription = this.integrationService.pluginSubject
            .subscribe(plugin => {
                this.plugin = plugin;
                this.pageService.pageDescription = this.LANG.pageDescriptions
                    .integrationSetup({
                        PLUGIN_NAME: this.plugin.information?.name,
                        PLUGIN_SHORT_DESCRIPTION:
                            this.plugin.information?.shortDescription
                    });
            });
    }

    ngOnDestroy(): void {
    }

    onSubmit(): void {
    }
}
