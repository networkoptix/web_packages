import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { NxAccountService } from '../../services/account.service';
import { NxConfigService } from '../../services/nx-config';
import { NxSystem, NxSystemService } from '../../services/system.service';
import { NxMenuService } from '../../components/menu/menu.service';
import { map } from 'rxjs/operators';
import { combineLatest } from 'rxjs';
import { NxHealthService } from './health.service';


@Component({
    selector   : 'nx-system-health-component',
    templateUrl: 'health.component.html',
    styleUrls  : ['health.component.scss']
})
export class NxHealthComponent implements OnInit {
    CONFIG: any;
    account: any;
    system: NxSystem;

    menu: any;
    constructor(private accountService: NxAccountService,
                private configService: NxConfigService,
                private systemService: NxSystemService,
                private route: ActivatedRoute,
                private menuservice: NxMenuService,
                private healthService: NxHealthService
    ) {
        this.CONFIG = this.configService.getConfig();
    }

    ngOnInit(): void {
        this.menu = {
            selectedSection   : '',         // updated by selectedSectionSubject
            base              : `${this.CONFIG.systemMenu.baseUrl}${this.system && this.system.id || ''}${this.CONFIG.systemHealthMenu.baseUrl}`,
            level1            : [
                {
                    id: 'alerts',
                    label: 'Alerts',
                    path: 'alerts'
                }
            ]
        };

        this.menuservice.selectedSectionSubject.subscribe(selection => {
            this.menu.selectedSection = selection;
            this.menu = {...this.menu}; // trigger onChange
        });

        this.route.params.subscribe((params: any) => {
            const systemId = params.systemId;
            this.accountService.get().then((account) => {
                this.account = account;
                this.system = this.systemService.createSystem(systemId, account.email);
                this.menu.base = `${this.CONFIG.systemMenu.baseUrl}${this.system.id}${this.CONFIG.systemHealthMenu.baseUrl}`;

                this.system.getInfo().then(() => {
                    const manifest$ = this.system.mediaserver.getHealthManifest();
                    const values$ = this.system.mediaserver.getHealthValues();
                    const alarms$ = this.system.mediaserver.getHealthAlarms();
                    combineLatest(manifest$, values$, alarms$)
                        .pipe(map(([manifestRequest, valuesRequest, alarmsRequest]) => {
                            return {manifestRequest, valuesRequest, alarmsRequest};
                        }))
                        .subscribe((result: any) => {
                            this.healthService.manifest = result.manifestRequest.reply;
                            this.healthService.values = result.valuesRequest.reply;
                            this.healthService.alarms = result.alarmsRequest.reply;
                            this.processValues();
                            this.initializeManifest();
                            this.initializeHeaders();

                            const menu = {...this.menu};
                            Object.keys(this.healthService.manifest).forEach((asset) => {
                                menu.level1.push({
                                    id: asset,
                                    label: this.toCapitalizedWords(asset),
                                    path: asset
                                });
                            });
                            this.menu = {...menu};
                            this.healthService.ready = true;
                        });
                });
            });
        });
    }

    initializeManifest() {
        const manifest = {};
        this.healthService.manifest.forEach(metric => {
            manifest[metric.id] = metric;
        });
        this.healthService.manifest = manifest;
    }

    initializeHeaders() {
        this.healthService.tableHeaders = this.filterManifestHeaders('table');
        this.healthService.panelParams = this.filterManifestHeaders('panel');
        this.addAlarmToTableHeaders();
    }

    addAlarmToTableHeaders() {
        Object.keys(this.healthService.tableHeaders).forEach(metric => {
            if (!this.healthService.tableHeaders[metric].values._) {
                this.healthService.tableHeaders[metric].values._ = {
                    id: '_',
                    values: {}
                };
            }
            this.healthService.tableHeaders[metric].values.unshift({
                id: '_',
                name: '',
                values: [
                    {
                        display: 'table',
                        id: 'alarm',
                        name: ''
                    }
                ]
            });
        });
    }

    highestAlarm(alarms) {
        // Return first error alarm, otherwise return first alarm found;
        for (const alarm of alarms) {
            if (alarm.level === 'error') {
                return alarm;
            }
        }
        return alarms[0];
    }

    processValues() {
        Object.entries(this.healthService.values).forEach(([metric, entities]) => {
            Object.entries(entities).forEach(([entity, groups]) => {
                let alarmCount = 0;
                let highestAlarm;
                Object.entries(groups).forEach(([group, params]) => {
                    Object.entries(params).forEach(([param, value]) => {
                        const alarms = this.healthService.alarms[metric] && this.healthService.alarms[metric][entity]
                            && this.healthService.alarms[metric][entity][group]
                            && this.healthService.alarms[metric][entity][group][param];
                        let alarm;
                        if (alarms) {
                            alarm = this.highestAlarm(alarms);
                            if (!highestAlarm || alarm.level === 'error' && highestAlarm.level === 'warning') {
                                highestAlarm = alarm;
                            }
                            alarmCount++;
                        }
                        this.healthService.values[metric][entity][group][param] = {
                            text: value,
                            class: alarm ? alarm.level : '',
                            tooltip: alarm ? alarm.text : '',
                            icon: alarm ? `${alarm.level}_icon` : '',
                        };
                    });
                });

                if (!this.healthService.values[metric][entity]._) {
                    this.healthService.values[metric][entity]._ = {};
                }
                this.healthService.values[metric][entity]._.alarm = {
                    text: ' '
                };

                if (highestAlarm) {
                    this.healthService.values[metric][entity]._.alarm.icon = `${highestAlarm.level}_icon`;
                    if (this.healthService.values[metric][entity]._.name) {
                        this.healthService.values[metric][entity]._.name.class = highestAlarm.level;
                    }
                    if (alarmCount > 1) {
                        const tooltip = `${alarmCount} alerts`;
                        if (this.healthService.values[metric][entity]._.name) {
                            this.healthService.values[metric][entity]._.name.tooltip = tooltip;
                        }
                        this.healthService.values[metric][entity]._.alarm.toolip = tooltip;
                    } else {
                        if (this.healthService.values[metric][entity]._.name) {
                            this.healthService.values[metric][entity]._.name.tooltip = highestAlarm.text;
                        }
                        this.healthService.values[metric][entity]._.alarm.tooltip = highestAlarm.text;
                    }
                }
            });
        });
    }

    filterManifestHeaders(displayFilter: string) {
        const headers = {};
        Object.keys(this.healthService.manifest).forEach((metricId) => {
            const metric = this.healthService.manifest[metricId];
            headers[metric.id] = metric;
            headers[metric.id].values.forEach((headerGroup, index) => {
                const group = headerGroup.values.filter((header) => {
                    return header.display.includes(displayFilter);
                });
                if (group.length) {
                    headers[metric.id].values[index].values = group;
                }
            });
        });
        return headers;
    }

    // Temporary camelCase converter
    toCapitalizedWords(name) {
        const words = name.match(/[A-Za-z][a-z]*/g) || [];
        return words.map(this.capitalize).join(' ');
    }

    capitalize(word) {
        return word.charAt(0).toUpperCase() + word.substring(1);
}
}
