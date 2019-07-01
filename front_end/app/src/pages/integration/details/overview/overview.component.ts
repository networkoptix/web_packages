import { Component, OnInit, OnDestroy } from '@angular/core';
import { IntegrationService }           from '../../integration.service';
import { NxMenuService }                from '../../../../components/menu/menu.service';

@Component({
    selector: 'overview-component',
    templateUrl: 'overview.component.html',
    styleUrls: ['overview.component.scss']
})

export class NxOverviewComponent implements OnInit, OnDestroy {

    plugin: any = {};

    private setupDefaults() {
        this.plugin = this.integrationService.getIntegrationPlugin();
        this.menuService.setSection('how-it-works');
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

