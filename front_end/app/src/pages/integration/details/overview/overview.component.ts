import { Component, OnInit, OnDestroy } from '@angular/core';
import { IntegrationService }           from '../../integration.service';
import { NxMenuService }                from '../../../../components/menu/menu.service';
import { NxConfigService }              from '../../../../services/nx-config/nx-config.service';
import { IConfig } from '../../../../services/nx-config/config-types';

@Component({
    selector: 'overview-component',
    templateUrl: 'overview.component.html',
    styleUrls: ['overview.component.scss']
})

export class NxOverviewComponent implements OnInit, OnDestroy {

    plugin: any = {};

    CONFIG: IConfig;

    private setupDefaults() {
        this.plugin = this.integrationService.getIntegrationPlugin();
        this.menuService.setDetailsSection('how-it-works');
        this.CONFIG = this.configService.getConfig();
    }

    constructor(private integrationService: IntegrationService,
                private menuService: NxMenuService,
                private configService: NxConfigService) {

        this.setupDefaults();
    }

    ngOnInit(): void {
    }

    ngOnDestroy() {
    }

    onSubmit() {
    }
}

