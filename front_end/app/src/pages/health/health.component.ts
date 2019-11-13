import { Component, Inject, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { NxAccountService }          from '../../services/account.service';
import { NxConfigService }           from '../../services/nx-config';
import { NxSystem, NxSystemService } from '../../services/system.service';
import { NxMenuService }                         from '../../components/menu/menu.service';
import { NxHealthService }                       from './health.service';
import { NxLanguageProviderService }             from '../../services/nx-language-provider';
import { NxUtilsService }                        from '../../services/utils.service';
import { FileSystemFileEntry, NgxFileDropEntry } from 'ngx-file-drop';
import { DOCUMENT }                              from '@angular/common';
import { NxRibbonService }                       from '../../components/ribbon/ribbon.service';

@Component({
    selector   : 'nx-system-health-component',
    templateUrl: 'health.component.html',
    styleUrls  : ['health.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class NxHealthComponent implements OnInit, OnDestroy {
    LANG: any;
    CONFIG: any;
    account: any;
    system: NxSystem;

    menu: any;
    systemReady: boolean;

    reportSnapshot: any;

    dragCount = 0;
    importShow: boolean;
    importedData: any = {};

    constructor(private accountService: NxAccountService,
                private configService: NxConfigService,
                private systemService: NxSystemService,
                private route: ActivatedRoute,
                private router: Router,
                private menuservice: NxMenuService,
                private healthService: NxHealthService,
                private languageService: NxLanguageProviderService,
                private utilsService: NxUtilsService,
                private ribbonService: NxRibbonService,
                @Inject(DOCUMENT) private document: any,
    ) {
        this.LANG = this.languageService.getTranslations();
        this.CONFIG = this.configService.getConfig();
    }

    ngOnInit(): void {
        this.document.addEventListener('dragenter', event => {
            if (++this.dragCount > 0 && event.dataTransfer.types[0] === 'Files') {
                this.importShow = true;
            }
        });
        this.document.addEventListener('dragleave', event => {
            if (--this.dragCount < 1 && event.dataTransfer.types[0] === 'Files') {
                this.importShow = false;
            }
        });

        this.healthService.ready = false;
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
                    this.systemReady = true;

                    this.system.mediaserver.getAggregateHealthReport()
                        .subscribe((result: any) => {
                            this.setupReport(result);
                        });
                });
            });
        });
    }

    ngOnDestroy(): void {
        this.ribbonService.hide();
    }

    setupReport(data) {
        this.healthService.ready = false;
        this.menu.level1 = [this.menu.level1[0]];

        // TODO: Handle server error
        this.healthService.manifest = data.reply['ec2/metrics/manifest'].reply;
        this.healthService.values = data.reply['ec2/metrics/values'].reply;
        this.healthService.alarms = data.reply['ec2/metrics/alarms'].reply;
        this.createSnapshot(data);
        this.createResourceList();
        this.initializeManifest();
        this.initializeHeaders();
        this.processValues();
        this.initializeAlarms();

        const menu = {...this.menu};
        Object.keys(this.healthService.manifest).forEach((asset) => {
            menu.level1.push({
                id: asset,
                label: this.healthService.manifest[asset].name,
                path: asset,
                svg: asset
            });
        });
        menu.level1[0].alerts = [
            {
                count: this.healthService.alertsCount.error,
                type: 'error'
            },
            {
                count: this.healthService.alertsCount.warning,
                type: 'warning'
            }
        ];
        this.menu = {...menu};
        // Allow time for change detection so child components can reinitialize
        setTimeout(() => {
            this.healthService.ready = true;
        }, 200);
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

    createResourceList() {
        this.healthService.resourceNames = {};
        Object.values(this.healthService.values).forEach(metric => {
            Object.entries(metric).forEach(([resourceId, entity]) => {
                Object.values(entity).some((group: any) => {
                    if (group.name) {
                        this.healthService.resourceNames[resourceId] = group.name;
                    }
                    return group.name;
                });
            });
        });
    }

    processValues() {
        Object.entries(this.healthService.values).forEach(([metric, entities]) => {
            Object.entries(entities).forEach(([entity, groups]) => {
                let alarmCount = 0;
                let highestAlarm;

                this.healthService.values[metric][entity].id = entity;
                this.healthService.values[metric][entity].searchTags = [];

                this.healthService.manifest[metric].values.forEach(group => {
                    if (this.healthService.values[metric][entity][group.id] !== undefined) {
                        group.values.forEach(header => {
                            if (this.healthService.values[metric][entity][group.id][header.id] !== undefined) {
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

                                const formattedVal: any = this.healthService.formatValue(
                                    header, this.healthService.values[metric][entity][group.id][header.id]
                                );

                                this.healthService.values[metric][entity][group.id][header.id] = {
                                    ...formattedVal,
                                    class: alarm ? alarm.level : '',
                                    tooltip: alarm ? alarm.text : '',
                                    icon: alarm ? alarm.level : '',
                                };

                                if (typeof formattedVal.text === 'string') { // Should numbers should be searchable?
                                    this.healthService.values[metric][entity].searchTags += formattedVal.text.replace(/-/g, '').toLowerCase() + ' ';
                                }
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

    initializeAlarms() {
        Object.keys(this.healthService.alertsCount).forEach(type => {
            this.healthService.alertsCount[type] = 0;
        });
        this.healthService.alertsValues = [];
        Object.entries(this.healthService.alarms).forEach(([metric, entities]) => {
            Object.entries(entities).forEach(([entity, groups]) => {
                Object.entries(groups).forEach(([group, params]) => {
                    Object.entries(params).forEach(([param, alarms]) => {
                        alarms.forEach(alarm => {
                            const alert: any = {_: {}};
                            const server = this.healthService.values[metric][entity].info.server;
                            if (!server && metric === 'servers') {
                                alert._.server = {text: this.healthService.values.servers[entity]._.name.text, id: entity};
                            } else if (server) {
                                alert._.server = {text: server.text, id: server.value};
                            } else {
                                alert._.server = {text: '', id: ''};
                            }
                            alert._.type = {text: this.healthService.manifest[metric].resource || this.healthService.manifest[metric].name};
                            alert._.message = {text: alarm.text};
                            alert._.alarm = {icon: alarm.level};
                            alert.resource = entity;
                            alert.metric = metric;
                            this.healthService.alertsValues.push(alert);
                            this.healthService.alertsCount[alarm.level]++;
                        });
                    });
                });
            });
        });
    }

    filterManifestHeaders(displayFilter: string) {
        const headers = {};
        Object.values(this.healthService.manifest).forEach((metricValue) => {
            const metric = JSON.parse(JSON.stringify(metricValue));
            headers[metric.id] = metric;
            headers[metric.id].values.forEach((headerGroup, index) => {
                headers[metric.id].values[index].values = headerGroup.values.filter(header => {
                    return header.display.includes(displayFilter);
                });
            });
        });
        return headers;
    }

    createSnapshot(data) {
        const systems: any = Object.values(this.healthService.values.systems);
        this.reportSnapshot = JSON.parse(JSON.stringify(data));
        this.reportSnapshot.time = new Date().toJSON();
        this.reportSnapshot.system = systems[0].info.name;
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

    fileDropped(files: NgxFileDropEntry[]) {
        this.dragCount = 0;
        this.importShow = false;
        const fileEntry = files[0].fileEntry as FileSystemFileEntry;
        const fileReader = new FileReader();
        fileReader.onload = _ => {
            const data = JSON.parse(fileReader.result as string);
            this.setupReport(data);
            this.router.navigate([this.menu.base + 'alerts']);
            let time = '-';
            if (data.time) {
                time = new Date(data.time).toUTCString();
            }
            this.importedData = {
                imported: true,
                system: data.system || '-',
                time
            };
            // String is here because it does not need to be translated and probably doesn't belong in CONFIG
            this.ribbonService.show('You are viewing an imported report, refresh the page to get a fresh report', '', '', 'alert');
        };

        fileEntry.file((file: File) => {
            fileReader.readAsText(file);
        });
    }

    fileLeave() {
        this.dragCount = 1;
    }
}
