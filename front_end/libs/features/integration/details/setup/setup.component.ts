import { Component, OnInit, OnDestroy } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { SubscriptionLike } from 'rxjs';

import { NxMenuService } from '@app/menu/menu.service';
import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { Integration } from '@services/nx-cloud-api/nx-cloud-api.types';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxPageService } from '@services/page.service';

import { IntegrationService } from '../../integration.service';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-setup-component',
    templateUrl: 'setup.component.html',
    styleUrls: ['setup.component.scss']
})

export class NxSetupComponent implements OnInit, OnDestroy {
    LANG: LanguageI18NStaticTypes;

    plugin: Partial<Integration> = {};
    pluginSubscription: SubscriptionLike;

    private setupDefaults(): void {
        this.menuService.detail = 'how-to-setup';
    }

    constructor(
        language: NxLanguageProviderService,
        private pageService: NxPageService,
        private integrationService: IntegrationService,
        private menuService: NxMenuService
    ) {
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
