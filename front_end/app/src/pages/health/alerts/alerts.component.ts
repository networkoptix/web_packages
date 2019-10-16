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

    constructor(private menuService: NxMenuService,
                private configService: NxConfigService,
                private route: ActivatedRoute,
                private healthService: NxHealthService,
    ) {
        this.CONFIG = this.configService.getConfig();
    }

    ngOnInit(): void {
        this.menuService.setSection('alerts');

        combineLatest(
            this.healthService.manifestSubject, this.healthService.valuesSubject, this.healthService.alarmsSubject
        ).subscribe(
            ([manifest, values, alarms]) => {
                if (manifest && values && alarms) {
                    this.manifest = manifest;
                    this.values = values;
                    this.alarms = [...alarms];
                    this.initializeAlarms();
                    this.initializeHeader();
                }
            }
        );
    }

    initializeAlarms() {
        this.alarms.forEach((alarm, index) => {
            this.alarms[index] = {'': alarm};
            if (alarm.resource) {
                this.alarms[index][''].server = this.values[alarm.label][alarm.resource].info.server || alarm.resource;
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
}
