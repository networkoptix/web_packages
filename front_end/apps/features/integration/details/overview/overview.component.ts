import { Component, OnInit, OnDestroy } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { SubscriptionLike } from 'rxjs';

import { NxMenuService } from '@app/menu/menu.service';
import { Integration } from '@services/nx-cloud-api/nx-cloud-api.types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxPageService } from '@services/page.service';

import { IntegrationService } from '../../integration.service';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-overview-component',
    templateUrl: 'overview.component.html',
    styleUrls: ['overview.component.scss']
})

export class NxOverviewComponent implements OnInit, OnDestroy {
    plugin: Partial<Integration>;
    pluginSubscription: SubscriptionLike;

    CONFIG: IConfig;

    private setupDefaults(): void {
        this.menuService.detail = 'how-it-works';
    }

    constructor(
        configService: NxConfigService,
        private pageService: NxPageService,
        private integrationService: IntegrationService,
        private menuService: NxMenuService
    ) {
        this.CONFIG = configService.getConfig();

        this.setupDefaults();
    }

    ngOnInit(): void {
        this.pluginSubscription = this.integrationService.pluginSubject
            .subscribe(plugin => {
                this.plugin = plugin;
                this.pageService.pageDescription =
                    this.plugin.information?.shortDescription;
            });
    }

    ngOnDestroy(): void {
    }

    onSubmit(): void {
    }
}
