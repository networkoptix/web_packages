import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { NxAccountService } from '../../../services/account.service';
import { NxConfigService } from '../../../services/nx-config';
import { NxSystem, NxSystemService } from '../../../services/system.service';
import { NxMenuService } from '../../../components/menu/menu.service';
import { combineLatest } from 'rxjs';
import { NxHealthService } from '../health.service';


@Component({
    selector   : 'nx-system-alerts-component',
    templateUrl: 'alerts.component.html',
    styleUrls  : ['alerts.component.scss']
})
export class NxSystemAlertsComponent implements OnInit {
    CONFIG: any;
    account: any;

    system: NxSystem;

    manifest: any;
    values: any;
    alarms: any;

    tableHeaders: any;
    // panelParams: any;
    //
    // selectedData: any;
    // selectedPanelData: any;
    selectedValues: any;

    activeTableEntity: any;
    activePanelEntity: any;
    selectedPanelData: any;

    constructor(private menuService: NxMenuService,
                private configService: NxConfigService,
                private route: ActivatedRoute,
                private healthService: NxHealthService,
    ) {
        this.CONFIG = this.configService.getConfig();
    }

    ngOnInit(): void {
        this.menuService.setSection('alerts');

        this.manifest = this.healthService.manifestSubject.getValue();
        this.values = this.healthService.valuesSubject.getValue();
        this.alarms = [...this.healthService.alarmsSubject.getValue()];
        this.initializeAlarms();
        this.initializeHeader();
    }

    initializeAlarms() {
        this.alarms.forEach((alarm, index) => {
            this.alarms[index] = {'': alarm};
            if (alarm.resource) {
                let server = this.values[alarm.label][alarm.resource].info.server;
                if (!server && alarm.labels === 'servers') {
                    server = alarm.resource;
                }

                if (server) {
                    this.alarms[index][''].server = this.values.servers[server]._.name;
                }
            }
            // Replace with actual name once api is updated
            this.alarms[index][''].type = alarm.label;
        });
    }

    initializeHeader() {
        this.tableHeaders = {
            '':
                [
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
        };
    }

    setActiveEntity(alarm) {
        const alarmValues = alarm[''];
        if (alarmValues.resource && alarmValues.resource) {
            this.activeTableEntity = alarm;
            this.activePanelEntity = this.values[alarmValues.label][alarmValues.resource];
            this.selectedPanelData = this.healthService.panelParams[alarmValues.label];
        } else {
            this.resetActiveEntity();
        }
    }

    resetActiveEntity() {
        this.activeTableEntity = undefined;
        this.activePanelEntity = undefined;
    }
}
