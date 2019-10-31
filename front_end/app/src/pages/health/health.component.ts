import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { NxAccountService }          from '../../services/account.service';
import { NxConfigService }           from '../../services/nx-config';
import { NxSystem, NxSystemService } from '../../services/system.service';
import { NxMenuService }             from '../../components/menu/menu.service';
import { map }                       from 'rxjs/operators';
import { combineLatest }             from 'rxjs';
import { NxHealthService }           from './health.service';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxUtilsService }            from '../../services/utils.service';


@Component({
    selector   : 'nx-system-health-component',
    templateUrl: 'health.component.html',
    styleUrls  : ['health.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class NxHealthComponent implements OnInit {
    LANG: any;
    CONFIG: any;
    account: any;
    system: NxSystem;

    menu: any;
    systemReady: boolean;

    reportSnapshot: any;

    constructor(private accountService: NxAccountService,
                private configService: NxConfigService,
                private systemService: NxSystemService,
                private route: ActivatedRoute,
                private menuservice: NxMenuService,
                private healthService: NxHealthService,
                private languageService: NxLanguageProviderService,
                private utilsService: NxUtilsService,
    ) {
        this.LANG = this.languageService.getTranslations();
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
                    path: 'alerts',
                    svg: 'alerts'
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
                this.healthService.system = this.system;
                this.menu.base = `${this.CONFIG.systemMenu.baseUrl}${this.system.id}${this.CONFIG.systemHealthMenu.baseUrl}`;

                this.system.getInfo().then(() => {
                    const manifest$ = this.system.mediaserver.getHealthManifest();
                    const values$ = this.system.mediaserver.getHealthValues();
                    const alarms$ = this.system.mediaserver.getHealthAlarms();

                    this.systemReady = true;

                    combineLatest(manifest$, values$, alarms$)
                        .pipe(map(([manifestRequest, valuesRequest, alarmsRequest]) => {
                            return {manifestRequest, valuesRequest, alarmsRequest};
                        }))
                        .subscribe((result: any) => {
                            this.healthService.manifest = result.manifestRequest.reply;
                            this.healthService.values = result.valuesRequest.reply;
                            this.healthService.alarms = result.alarmsRequest.reply;
                            this.createSnapshot();
                            this.initializeManifest();
                            this.initializeHeaders();
                            this.processValues();

                            const menu = {...this.menu};
                            Object.keys(this.healthService.manifest).forEach((asset) => {
                                menu.level1.push({
                                    id: asset,
                                    label: this.healthService.manifest[asset].name,
                                    path: asset,
                                    svg: asset
                                });
                            });
                            this.menu = {...menu};
                            this.healthService.ready = true;
                        });
                });
            });
        });
    }

    colorHeaderGroups(metric) {
        let counter = 0;
        metric.values = metric.values.map((group) => {
            if (group.id !== '_') {
                group.colorClass = `group-${counter++ % 6 + 1}`;
            }
            return group;
        });
    }

    initializeManifest() {
        const manifest = {};
        this.healthService.manifest.forEach(metric => {
            this.colorHeaderGroups(metric);
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
                this.healthService.values[metric][entity].id = entity;
                this.healthService.manifest[metric].values.forEach(group => {
                    if (this.healthService.values[metric][entity][group.id]) {
                        group.values.forEach(header => {
                            if (this.healthService.values[metric][entity][group.id][header.id]) {
                                const alarms = this.healthService.alarms[metric] && this.healthService.alarms[metric][entity]
                                    && this.healthService.alarms[metric][entity][group.id]
                                    && this.healthService.alarms[metric][entity][group.id][header.id];
                                let alarm;
                                if (alarms) {
                                    alarm = this.highestAlarm(alarms);
                                    if (!highestAlarm || alarm.level === 'error' && highestAlarm.level === 'warning') {
                                        highestAlarm = alarm;
                                    }
                                    alarmCount++;
                                }
                                this.healthService.values[metric][entity][group.id][header.id] = {
                                    text: this.healthService.formatValue(header, this.healthService.values[metric][entity][group.id][header.id]),
                                    class: alarm ? alarm.level : '',
                                    tooltip: alarm ? alarm.text : '',
                                    icon: alarm ? alarm.level : '',
                                };
                            }
                        });
                    }
                });

                if (!this.healthService.values[metric][entity]._) {
                    this.healthService.values[metric][entity]._ = {};
                }
                this.healthService.values[metric][entity]._.alarm = {
                    text: ' '
                };

                if (highestAlarm) {
                    this.healthService.values[metric][entity]._.alarm.icon = highestAlarm.level;
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
        Object.values(this.healthService.manifest).forEach((metricValue) => {
            const metric = JSON.parse(JSON.stringify(metricValue));
            headers[metric.id] = metric;
            headers[metric.id].values.forEach((headerGroup, index) => {
                const group = headerGroup.values.filter((header) => {
                    return header.display.includes(displayFilter);
                });
                headers[metric.id].values[index].values = group;
            });
        });
        return headers;
    }

    createSnapshot() {
        const systems: any = Object.values(this.healthService.values.systems);
        this.reportSnapshot = {
            reply: {
                '/ec2/metrics/alarms': JSON.parse(JSON.stringify(this.healthService.alarms)),
                '/ec2/metrics/manifest': JSON.parse(JSON.stringify(this.healthService.manifest)),
                '/ec2/metrics/values': JSON.parse(JSON.stringify(this.healthService.values))
            },
            time: new Date().toJSON(),
            system: systems[0].info.name
        };
    }

    exportReport() {
        let filename;
        if (this.reportSnapshot.system) {
            filename = `report-${this.reportSnapshot.system}-${this.reportSnapshot.time}.json`;
        } else {
            filename = `report-${this.reportSnapshot.time}.json`;
        }
        this.utilsService.saveAsBlob(JSON.stringify(this.reportSnapshot), filename, 'application/json');
    }
}
