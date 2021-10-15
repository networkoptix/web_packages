import { Component, OnInit, OnDestroy } from '@angular/core';

import { IntegrationService }           from '../../integration.service';
import { NxMenuService }                from '@src/menu';
import { NxConfigService, IConfig }     from '@services/nx-config';
import { NxPageService }                from '@services/page.service';
import { SubscriptionLike } from 'rxjs';
import { UntilDestroy } from '@ngneat/until-destroy';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'overview-component',
    templateUrl: 'overview.component.html',
    styleUrls: ['overview.component.scss']
})

export class NxOverviewComponent implements OnInit, OnDestroy {
    plugin: any;
    pluginSubscription: SubscriptionLike;

    CONFIG: IConfig;

    private setupDefaults() {
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
        this.pluginSubscription = this.integrationService.pluginSubject.subscribe(plugin => {
            this.plugin = plugin;
            this.pageService.pageDescription = this.plugin.information?.shortDescription;
        });
    }

    ngOnDestroy() {
    }

    onSubmit() {
    }
}
