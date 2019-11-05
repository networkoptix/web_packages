import { Component, OnInit }                   from '@angular/core';
import { NxConfigService }                     from '../../../services/nx-config';
import { NxSystem }                            from '../../../services/system.service';
import { NxMenuService }                       from '../../../components/menu/menu.service';
import { NxHealthService }                     from '../health.service';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { Observable, of }                      from 'rxjs';


@Component({
    selector   : 'nx-system-alerts-component',
    templateUrl: 'alerts.component.html',
    styleUrls  : ['alerts.component.scss']
})
export class NxSystemAlertsComponent implements OnInit {

    CONFIG: any;

    filterModel: any;

    mobileDetailMode: boolean;
    breakpoint: string;

    manifest: any;
    values: any;

    tableHeaders: any;
    alerts: any;

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
        this.filterModel = {
            selects : []
        };
    }

    ngOnInit(): void {
        this.menuService.setSection('alerts');

        this.addFilterServers();
        this.addFilterTypes();
        this.addFilterAlarms();

        this.manifest = this.healthService.manifest;
        this.values = this.healthService.values;

        this.initializeHeader();
        this.countAlerts();

        this.alerts = this.healthService.alertsValues;

        this.breakpointObserver
            .observe([this.breakpoint])
            .subscribe((state: BreakpointState) => {
                this.mobileDetailMode = (state.matches && this.activePanelEntity);
            });
    }

    modelChanged(model) {
        this.healthService
            .alertsSearch(this.healthService.alertsValues, this.filterModel)
            .subscribe((alerts) => {
                this.alerts = alerts;
            });
    }

    resetFilterModel() {
        if (this.filterModel.selects) {
            this.filterModel.selects.forEach((filter) => {
                filter.selected = filter.items[0];
            });
        }

        this.filterModel = { ...this.filterModel };
    }

    addFilterAlarms() {
        const alertItems = [
            { value: '0', name: 'All Alerts' },
            { value: 'warning', name: 'Only Warnings' },
            { value: 'error', name: 'Only Errors' }
        ];

        this.filterModel.selects.push(
                {
                    id      : 'alertType',
                    label   : '',
                    items   : alertItems,
                    selected: alertItems[0]
                });
    }

    addFilterTypes() {
        const typesItems = [];

        for (const [key, value] of Object.entries(this.healthService.manifest)) {
            const val: any = value;
            if (val.resource !== '') {
                typesItems.push({ value: val.resource, name: val.resource });
            }
        }

        typesItems.unshift({ value: '0', name: 'All Device Types'});

        this.filterModel.selects.push(
                {
                    id      : 'deviceType',
                    label   : '',
                    items   : typesItems,
                    selected: typesItems[0]
                });
    }

    addFilterServers() {
        const serverItems = [];

        for (const [key, value] of Object.entries(this.healthService.values.servers)) {
            const val: any = value;
            serverItems.push({ value: key, name: val._.name.text });
        }

        serverItems.unshift({ value: '0', name: 'All Servers' });

        this.filterModel.selects.push(
                {
                    id      : 'serverInstance',
                    label   : '',
                    items   : serverItems,
                    selected: serverItems[0]
                });
    }

    isFilterEmpty() {
        let singleselect = false;
        if (this.filterModel.selects) {
            this.filterModel.selects.forEach(select => {
                singleselect = singleselect || (select.selected.value > 0) || (select.selected.value !== '0'); // 0 is default choice
            });
        }

        return !singleselect;
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
