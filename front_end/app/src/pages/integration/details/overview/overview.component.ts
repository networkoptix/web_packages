import { Component, OnInit, OnDestroy } from '@angular/core';

import { IntegrationService }           from '../../integration.service';
import { NxMenuService }                from '../../../../menu';
import { NxConfigService, IConfig }     from '../../../../services/nx-config';
import { NxPageService }                from '../../../../services/page.service';

@Component({
    selector    : 'overview-component',
    templateUrl : 'overview.component.html',
    styleUrls   : ['overview.component.scss']
})

export class NxOverviewComponent implements OnInit, OnDestroy {
    plugin: any;

    CONFIG: IConfig;

    private setupDefaults() {
        this.plugin = this.integrationService.getIntegrationPlugin();
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
        this.pageService.pageDescription = this.plugin.information.shortDescription;
    }

    ngOnDestroy() {
    }

    onSubmit() {
    }
}
