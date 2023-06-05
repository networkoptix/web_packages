import { Component, OnInit } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TranslateService } from '@ngx-translate/core';
import { SubscriptionLike } from 'rxjs';

import { NxMenuService } from '@app/menu/menu.service';
import staticLang from '@common/language/language_i18n_static.json';
import { Integration } from '@services/nx-cloud-api/nx-cloud-api.types';
import { NxPageService } from '@services/page.service';

import { IntegrationService } from '../../integration.service';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-setup-component',
    templateUrl: 'setup.component.html',
    styleUrls: ['setup.component.scss'],
})
export class NxSetupComponent implements OnInit {
    LANG = staticLang;

    plugin: Partial<Integration> = {};
    pluginSubscription: SubscriptionLike;

    private setupDefaults(): void {
        this.menuService.detail = 'how-to-setup';
    }

    constructor(
        private translateService: TranslateService,
        private pageService: NxPageService,
        private integrationService: IntegrationService,
        private menuService: NxMenuService,
    ) {
        this.setupDefaults();
    }

    ngOnInit(): void {
        this.pluginSubscription = this.integrationService.pluginSubject.subscribe(plugin => {
            this.plugin = plugin;
            this.pageService.pageDescription = this.translateService.instant(
                this.LANG.pageDescriptions.integrationSetup,
                {
                    PLUGIN_NAME: this.plugin.information?.name,
                    PLUGIN_SHORT_DESCRIPTION: this.plugin.information?.shortDescription,
                },
            );
        });
    }

    onSubmit(): void {}
}
