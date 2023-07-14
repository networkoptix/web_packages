import { Component, OnInit } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { SubscriptionLike } from 'rxjs';

import { NxMenuService } from '@menu/menu.service';
import { Integration } from '@services/nx-cloud-api/nx-cloud-api.types';
import { NxPageService } from '@services/page.service';

import { IntegrationService } from '../../integration.service';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-overview-component',
    templateUrl: 'overview.component.html',
    styleUrls: ['overview.component.scss'],
})
export class NxOverviewComponent implements OnInit {
    plugin: Partial<Integration>;
    pluginSubscription: SubscriptionLike;

    private setupDefaults(): void {
        this.menuService.detail = 'how-it-works';
    }

    constructor(
        private pageService: NxPageService,
        private integrationService: IntegrationService,
        private menuService: NxMenuService,
    ) {
        this.setupDefaults();
    }

    ngOnInit(): void {
        this.pluginSubscription = this.integrationService.pluginSubject.subscribe(plugin => {
            this.plugin = plugin;
            this.pageService.pageDescription = this.plugin.information?.shortDescription;
        });
    }

    onSubmit(): void {}
}
