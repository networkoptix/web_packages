import { Component, OnInit } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import { NxMonitoringService } from '@pages/monitoring/monitoring.service';
import { NxSystem } from '@services/system.service';
import { NxMenuService } from '@src/menu/menu.service';

@UntilDestroy()
@Component({
    selector: 'logs',
    templateUrl: 'logs.component.html',
    styleUrls: ['logs.component.scss']
})
export class LogsComponent implements OnInit {
    system: NxSystem;
    selectedServerId: string;

    constructor(
        private monitoringService: NxMonitoringService,
        private menuService: NxMenuService,
    ) {}

    ngOnInit(): void {
        this.menuService.section = 'logs';
        this.menuService.detail = '';

        this.monitoringService.systemSubject
            .pipe(untilDestroyed(this))
            .subscribe(system => {
                this.system = system;
                this.selectedServerId = this.monitoringService.selectedServerId;
            });

        this.monitoringService.selectedServerIdSubject
            .pipe(untilDestroyed(this))
            .subscribe(serverId => {
                this.selectedServerId = serverId;
            });
    }
}
