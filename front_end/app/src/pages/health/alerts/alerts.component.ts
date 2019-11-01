import { Component, OnInit } from '@angular/core';
import { NxConfigService }                     from '../../../services/nx-config';
import { NxSystem }           from '../../../services/system.service';
import { NxMenuService }                       from '../../../components/menu/menu.service';
import { NxHealthService }                     from '../health.service';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';


@Component({
    selector   : 'nx-system-alerts-component',
    templateUrl: 'alerts.component.html',
    styleUrls  : ['alerts.component.scss']
})
export class NxSystemAlertsComponent implements OnInit {
    CONFIG: any;

    mobileDetailMode: boolean;
    breakpoint: string;

    manifest: any;
    values: any;

    tableHeaders: any;

    activeTableEntity: any;
    activePanelEntity: any;
    activePanelParams: any;

    alertsCount: number;

    constructor(private menuService: NxMenuService,
                private configService: NxConfigService,
                private healthService: NxHealthService,
                private breakpointObserver: BreakpointObserver,
    ) {
        this.CONFIG = this.configService.getConfig();
        this.breakpoint = '(max-width: 767px)';
    }

    ngOnInit(): void {
        this.menuService.setSection('alerts');

        this.manifest = this.healthService.manifest;
        this.values = this.healthService.values;
        this.initializeHeader();
        this.countAlerts();

        this.breakpointObserver
            .observe([this.breakpoint])
            .subscribe((state: BreakpointState) => {
                this.mobileDetailMode = (state.matches && this.activePanelEntity);
            });
    }

    countAlerts() {
        this.alertsCount = Object.values(this.healthService.alertsCount).reduce((a, b) => a + b);
    }

    initializeHeader() {
        this.tableHeaders = {
            id: 'alerts',
            values: [{
                id: '_',
                name: '',
                values: [
                    {
                        display: 'table',
                        name: '',
                        id: 'alarm',
                    },
                    {
                        display: 'table',
                        name: 'Type',
                        id: 'type'
                    },
                    {
                        display: 'table',
                        name: 'Server',
                        id: 'server'
                    },
                    {
                        display: 'table',
                        name: 'Alert',
                        id: 'text'
                    }
                ]
            }]
        };
    }

    setActiveEntity(alarm) {
        if (alarm.resource) {
            this.activeTableEntity = alarm;
            this.activePanelEntity = this.values[alarm.metric][alarm.resource];
            this.activePanelParams = this.healthService.panelParams[alarm.metric];

            if (this.breakpointObserver.isMatched(this.breakpoint)) {
                this.mobileDetailMode = true;
            }
        } else {
            this.resetActiveEntity();
        }
    }

    resetActiveEntity() {
        this.activeTableEntity = undefined;
        this.activePanelEntity = undefined;
        this.activePanelParams = undefined;
        this.mobileDetailMode = false;
    }
}
