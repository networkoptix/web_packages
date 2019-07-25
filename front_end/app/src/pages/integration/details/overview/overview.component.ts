import { Component, OnInit, OnDestroy } from '@angular/core';
import { IntegrationService }           from '../../integration.service';
import { NxMenuService }                from '../../../../components/menu/menu.service';
import { NxConfigService }              from '../../../../services/nx-config';

@Component({
    selector: 'overview-component',
    templateUrl: 'overview.component.html',
    styleUrls: ['overview.component.scss']
})

export class NxOverviewComponent implements OnInit, OnDestroy {

    plugin: any = {};

    CONFIG: any;

    private setupDefaults() {
        this.plugin = this.integrationService.getIntegrationPlugin();
        this.menuService.setSection('how-it-works');
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

