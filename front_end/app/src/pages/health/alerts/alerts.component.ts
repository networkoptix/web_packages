import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { NxAccountService }                    from '../../../services/account.service';
import { NxConfigService }                     from '../../../services/nx-config';
import { NxSystem, NxSystemService }           from '../../../services/system.service';
import { NxMenuService }                       from '../../../components/menu/menu.service';
import { combineLatest }                       from 'rxjs';
import { NxHealthService }                     from '../health.service';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';


@Component({
    selector   : 'nx-system-alerts-component',
    templateUrl: 'alerts.component.html',
    styleUrls  : ['alerts.component.scss']
})
export class NxSystemAlertsComponent implements OnInit {
    CONFIG: any;
    account: any;

    system: NxSystem;
    mobileDetailMode: boolean;
    breakpoint: string;

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

    alertsValues: any;
    alertsCount: number;

    constructor(private menuService: NxMenuService,
                private configService: NxConfigService,
                private route: ActivatedRoute,
                private healthService: NxHealthService,
                private breakpointObserver: BreakpointObserver,
    ) {
        this.CONFIG = this.configService.getConfig();
        this.breakpoint = '(max-width: 767px)';
    }

    ngOnInit(): void {
        this.menuService.setSection('alerts');

        this.manifest = this.healthService.manifestSubject.getValue();
        this.values = this.healthService.valuesSubject.getValue();
        this.alarms = {...this.healthService.alarmsSubject.getValue()};
        this.initializeAlarms();
        this.initializeHeader();
        this.countAlerts();

        this.breakpointObserver
            .observe([this.breakpoint])
            .subscribe((state: BreakpointState) => {
                this.mobileDetailMode = (state.matches && this.activePanelEntity);
            });
    }

    countAlerts() {
        this.alertsCount = 0;
        Object.values(this.alarms).forEach((group) => {
            this.alertsCount += Object.keys(group).length;
        });
    }

    initializeAlarms() {
        this.alertsValues = [];
        Object.entries(this.alarms).forEach(([metric, entities]) => {
            Object.entries(entities).forEach(([entity, groups]) => {
                Object.entries(groups).forEach(([group, params]) => {
                    Object.entries(params).forEach(([param, alarms]) => {
                        alarms.forEach(alarm => {
                            const alert: any = {_: {}};
                            let server = this.values[metric][entity].info.server.text;
                            if (!server && metric === 'servers') {
                                server = this.values.servers[entity]._.name.text;
                            }

                            if (server) {
                                alert._.server = {text: server};
                            }
                            alert._.type = {text: this.manifest[metric].resource};
                            alert._.text = {text: alarm.text};
                            alert._.alarm = {icon: alarm.level};
                            alert.resource = entity;
                            alert.metric = metric;
                            this.alertsValues.push(alert);
                        });
                    });
                });
            });
        });
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
            this.selectedPanelData = this.healthService.panelParams[alarm.metric];

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
        this.selectedPanelData = undefined;
        this.mobileDetailMode = false;
    }
}
