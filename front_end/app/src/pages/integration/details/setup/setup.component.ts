import { Component, OnInit, OnDestroy } from '@angular/core';
import { IntegrationService }           from '../../integration.service';
import { NxMenuService }                from '../../../../components/menu';
import { NxConfigService, IConfig }     from '../../../../services/nx-config';

@Component({
    selector    : 'setup-component',
    templateUrl : 'setup.component.html',
    styleUrls   : ['setup.component.scss']
})

export class NxSetupComponent implements OnInit, OnDestroy {
    plugin: any = {};

    CONFIG: IConfig;

    private setupDefaults() {
        this.plugin = this.integrationService.getIntegrationPlugin();
        this.menuService.setDetailsSection('how-to-setup');
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
