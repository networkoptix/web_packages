import { Component, OnInit, OnDestroy } from '@angular/core';
import { IntegrationService }           from '../../integration.service';
import { NxMenuService }                from '../../../../components/menu/menu.service';

@Component({
    selector: 'setup-component',
    templateUrl: 'setup.component.html',
    styleUrls: ['setup.component.scss']
})

export class NxSetupComponent implements OnInit, OnDestroy {

    plugin: any = {};

    private setupDefaults() {
        this.plugin = this.integrationService.getIntegrationPlugin();
        this.menuService.setSection('how-to-setup');
    }

    constructor(private integrationService: IntegrationService,
                private menuService: NxMenuService) {

        this.setupDefaults();
    }

    ngOnInit(): void {
    }

    ngOnDestroy() {
    }

    onSubmit() {
    }
}

