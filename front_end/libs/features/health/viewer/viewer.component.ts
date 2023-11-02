import { DOCUMENT } from '@angular/common';
import {
    Component,
    Inject,
    OnInit,
    ViewEncapsulation,
    ViewChild,
    ElementRef,
    effect,
} from '@angular/core';
import { Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateService } from '@ngx-translate/core';
import { cloneDeep } from 'lodash-es';
import { FileSystemFileEntry, NgxFileDropEntry } from 'ngx-file-drop';
import { of, throwError } from 'rxjs';

import staticLang from '@language_static';
import { NxMenuService } from '@menu/menu.service';
import type { Content } from '@menu/menu.types';
import { Account } from '@services/account.service/account';
import { NxAppStateService } from '@services/nx-app-state.service';
import { NxHeaderService } from '@services/nx-header.service';
import { NxPageService } from '@services/page.service';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import type { HealthReport } from '@services/system-api.aggregated-types';
import { NxSystemAPI } from '@services/system-legacy-api.service';
import type { NxSystem } from '@services/system.service/system';
import { NxUriService } from '@services/uri.service';
import { icons, healthMonitoring } from '@static-variables';
import { GridBreakpoints } from '@styles/theme-variables-common';

import { NxHealthService } from '../health.service';

@UntilDestroy()
@Component({
    selector: 'nx-health-viewer-component',
    templateUrl: 'viewer.component.html',
    styleUrls: ['viewer.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class NxReportViewerComponent implements OnInit {
    LANG = staticLang;
    account: Account;
    system: NxSystem;
    server: NxSystemAPI;

    menu: Content;

    reportSnapshot;

    importShow: boolean;
    importedData: any = {};
    headerHeight: number;

    hasServerError = false;
    outdatedVersion = false;

    mediaLayoutClass: string;

    icons = icons;

    @ViewChild('loadReport') loadReport: ElementRef;
    @ViewChild('loadReportMain') loadReportMain;

    constructor(
        pageService: NxPageService,
        private translateService: TranslateService,
        private appStateService: NxAppStateService,
        private router: Router,
        private uriService: NxUriService,
        private menuService: NxMenuService,
        private scrollMechanicsService: NxScrollMechanicsService,
        private headerService: NxHeaderService,
        public healthService: NxHealthService,
        @Inject(DOCUMENT) private document: Document,
    ) {
        pageService.pageTitle(this.LANG.pageTitles.information);

        effect(() => {
            const selection = this.menuService.selectedSection();
            if (this.menu && this.menu.selectedSection !== selection) {
                this.menu.selectedSection = selection;
                this.menu = { ...this.menu }; // trigger onChang
            }
        });
    }

    ngOnInit(): void {
        window.addEventListener('dragenter', event => {
            let types = event.dataTransfer.types;
            // IE returns a DOMStringList instead of an array
            if (types instanceof DOMStringList) {
                types = Array.from(types);
            }
            if (types.includes('Files')) {
                this.importShow = true;
            }
        });

        this.healthService.ready = false;
        this.healthService.importedData = false;
        this.menu = {
            base: '/health-report/viewer',
            selectedSection: '', // updated by selectedSectionSubject
            level1: [
                {
                    id: 'alerts',
                    label: 'Alerts',
                    path: 'alerts',
                    svg: 'alerts',
                },
            ],
        };

        const currentRoute = this.router.url;
        if (currentRoute.endsWith('health')) {
            this.uriService.updateURI(`${currentRoute}/alerts`, {}, true).catch(error => {
                console.error(error);
            });
        }

        // We listen to window resize and measure header height to know how much to offset the fixed menu by
        this.scrollMechanicsService.windowSizeSubject
            .pipe(untilDestroyed(this))
            .subscribe(({ width }) => {
                if (
                    width >= GridBreakpoints.MD &&
                    this.appStateService.headerVisibleSubject.getValue()
                ) {
                    this.setHeaderHeight();
                }

                if (this.scrollMechanicsService.mediaQueryMax(GridBreakpoints.LG)) {
                    this.mediaLayoutClass = 'mobileLayout';
                } else if (this.scrollMechanicsService.mediaQueryMin(GridBreakpoints.XL)) {
                    this.mediaLayoutClass = 'wideLayout';
                } else {
                    this.mediaLayoutClass = '';
                }
            });
    }

    setHeaderHeight(): void {
        this.headerHeight = this.document.getElementsByClassName('headerContainer')[0].scrollHeight;
    }

    setupReport(_data: HealthReport) {
        const data = cloneDeep(_data);
        // Handle server not responding for "ec2/metrics/manifest"
        if (!data.reply) {
            return throwError('Error getting manifest');
        }

        this.healthService.ready = false;
        this.menu.level1 = [this.menu.level1[0]];

        // Endpoint url has been updated in the API services, but users might still try viewing
        // old reports using the old url without leading
        const manifest = (data.reply['/ec2/metrics/manifest'] || data.reply['ec2/metrics/manifest'])
            .reply;
        const values = (data.reply['/ec2/metrics/values'] || data.reply['ec2/metrics/values'])
            .reply;
        const alarms = (data.reply['/ec2/metrics/alarms'] || data.reply['ec2/metrics/alarms'])
            .reply;

        this.healthService.manifest = manifest;
        this.healthService.values = values;
        this.healthService.alarms = alarms;
        this.createSnapshot(data);
        this.createResourceList();
        this.initializeManifest();
        this.initializeHeaders();
        this.processValues();
        this.initializeAlarms();

        const menu = { ...this.menu };
        Object.keys(this.healthService.manifest).forEach(asset => {
            // Do not show menu item if no values -- @tagir will update spec for 20.1
            if (
                this.healthService.values[asset] &&
                Object.keys(this.healthService.values[asset]).length
            ) {
                const svgName =
                    asset === 'cameras' ? 'camera' : asset === 'systems' ? 'system' : asset;

                menu.level1.push({
                    id: asset,
                    label: this.healthService.manifest[asset].name,
                    path: asset,
                    svg: svgName,
                });
            }
        });
        menu.level1[0].alerts = [
            {
                count: this.healthService.alertsCount.error,
                type: 'error',
            },
            {
                count: this.healthService.alertsCount.warning,
                type: 'warning',
            },
        ];
        this.menu = { ...menu };
        // Allow time for change detection so child components can reinitialize
        setTimeout(() => {
            this.healthService.ready = true;
        }, 0);
        return of(true);
    }

    colorHeaderGroups(metric): void {
        let counter = 0;
        metric.values = metric.values.map(group => {
            if (group.id !== '_') {
                group.colorClass = `group-${(counter++ % 6) + 1}`;
            }
            return group;
        });
    }

    initializeManifest(): void {
        const manifest = {};
        this.healthService.manifest.forEach(metric => {
            this.colorHeaderGroups(metric);
            manifest[metric.id] = metric;
        });
        this.healthService.manifest = manifest;
    }

    initializeHeaders(): void {
        this.healthService.tableHeaders = this.processManifestHeaders('table');
        this.healthService.panelParams = this.processManifestHeaders('panel');
        this.addAlarmToTableHeaders();
    }

    addAlarmToTableHeaders(): void {
        Object.keys(this.healthService.tableHeaders).forEach(metric => {
            if (!this.healthService.tableHeaders[metric].values._) {
                this.healthService.tableHeaders[metric].values._ = {
                    id: '_',
                    values: {},
                };
            }
            this.healthService.tableHeaders[metric].values.unshift({
                id: '_',
                name: '',
                values: [
                    {
                        display: 'table',
                        id: 'alarm',
                        name: '',
                    },
                ],
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

    createResourceList(): void {
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

    processValues(): void {
        Object.entries(this.healthService.values).forEach(([metric, entities]) => {
            Object.entries(entities).forEach(([entity, groups]) => {
                const alarmCount = {
                    warning: 0,
                    error: 0,
                };
                let highestAlarm;

                this.healthService.values[metric][entity].id = entity;
                this.healthService.values[metric][entity].searchTags = [];

                this.healthService.manifest[metric].values.forEach(group => {
                    if (this.healthService.values[metric][entity][group.id] !== undefined) {
                        group.values.forEach(header => {
                            if (
                                this.healthService.values[metric][entity][group.id][header.id] !==
                                undefined
                            ) {
                                const alarms =
                                    this.healthService.alarms[metric] &&
                                    this.healthService.alarms[metric][entity] &&
                                    this.healthService.alarms[metric][entity][group.id] &&
                                    this.healthService.alarms[metric][entity][group.id][header.id];
                                let alarm;
                                if (alarms) {
                                    alarm = this.highestAlarm(alarms);
                                    if (
                                        !highestAlarm ||
                                        (alarm.level === 'error' &&
                                            highestAlarm.level === 'warning')
                                    ) {
                                        highestAlarm = alarm;
                                    }
                                    alarmCount[alarm.level]++;
                                }

                                const formattedVal: any = this.healthService.formatValue(
                                    header,
                                    this.healthService.values[metric][entity][group.id][header.id],
                                );

                                this.healthService.values[metric][entity][group.id][header.id] = {
                                    ...formattedVal,
                                    class: alarm ? alarm.level : '',
                                    tooltip: alarm
                                        ? this.getAlertText(metric, entity, alarm.text)
                                        : '',
                                    icon: alarm ? alarm.level : '',
                                };

                                if (header.display) {
                                    // Search by displayed fields
                                    this.healthService.values[metric][entity].searchTags += (
                                        formattedVal.text + ' '
                                    ).toLowerCase();
                                }
                            }
                        });
                    }
                });

                if (!this.healthService.values[metric][entity]._) {
                    this.healthService.values[metric][entity]._ = {};
                }
                this.healthService.values[metric][entity]._.alarm = {
                    text: ' ',
                };

                if (highestAlarm) {
                    this.healthService.values[metric][entity]._.alarm.icon = highestAlarm.level;
                    if (this.healthService.values[metric][entity]._.name) {
                        this.healthService.values[metric][entity]._.name.class = highestAlarm.level;
                    }
                    const level = highestAlarm.level;
                    const count = alarmCount[level];

                    if (count > 1) {
                        let name = this.healthService.findEntityName(
                            this.healthService.values[metric][entity],
                        );
                        name = name ? `${name} ` : '';
                        const resourceName = this.healthService.manifest[metric].resource;
                        const tooltip = `${resourceName} ${name}has ${count} different ${level}s`;

                        if (this.healthService.values[metric][entity]._.name) {
                            this.healthService.values[metric][entity]._.name.tooltip = tooltip;
                        }
                        this.healthService.values[metric][entity]._.alarm.tooltip = tooltip;
                    } else {
                        if (this.healthService.values[metric][entity]._.name) {
                            this.healthService.values[metric][entity]._.name.tooltip =
                                this.getAlertText(metric, entity, highestAlarm.text);
                        }
                        this.healthService.values[metric][entity]._.alarm.tooltip =
                            this.getAlertText(metric, entity, highestAlarm.text);
                    }
                }
            });
        });
    }

    getAlertText(metric, entity, message) {
        const resourceName = this.healthService.manifest[metric].resource;
        const entityName = this.healthService.findEntityName(
            this.healthService.values[metric][entity],
        );
        if (resourceName && entityName !== '−') {
            return `${resourceName} ${entityName} ${message}`;
        } else {
            return message;
        }
    }

    initializeAlarms(): void {
        Object.keys(this.healthService.alertsCount).forEach(type => {
            this.healthService.alertsCount[type] = 0;
        });
        this.healthService.alertsValues = [];
        const unset = healthMonitoring.classFormats.unset;
        Object.entries(this.healthService.alarms).forEach(([metric, entities]) => {
            Object.entries(entities).forEach(([entity, groups]) => {
                Object.entries(groups).forEach(([group, params]) => {
                    Object.entries(params).forEach(([param, alarms]) => {
                        alarms.forEach(alarm => {
                            const alert: any = { _: {} };
                            const server = this.healthService.values[metric][entity].info.server;
                            if (!server && metric === 'servers') {
                                alert._.server = {
                                    text: this.healthService.values.servers[entity]._.name.text,
                                    id: entity,
                                };
                            } else if (server) {
                                alert._.server = { text: server.text, id: server.value };
                            } else {
                                alert._.server = { text: '', id: '' };
                            }
                            alert._.server.formatClass = 'long-text';
                            alert._.type = {
                                text:
                                    this.healthService.manifest[metric].resource ||
                                    this.healthService.manifest[metric].name,
                                formatClass: 'text',
                            };
                            alert._.message = { text: alarm.text, formatClass: unset };
                            alert._.alarm = { icon: alarm.level };

                            alert.metric = metric;
                            alert.entity = entity;

                            const resourceName = this.healthService.manifest[metric].resource;
                            const entityName = this.healthService.findEntityName(
                                this.healthService.values[metric][entity],
                            );
                            if (resourceName && entityName !== '−') {
                                alert._.message.text = this.getAlertText(
                                    metric,
                                    entity,
                                    alert._.message.text,
                                );
                            }
                            this.healthService.alertsValues.push(alert);
                            this.healthService.alertsCount[alarm.level]++;
                        });
                    });
                });
            });
        });
        this.healthService.alertsValues.sort((alarmA: any, alarmB: any) => {
            return alarmA._type > alarmB._type ? 1 : -1;
        });
    }

    processManifestHeaders(displayFilter: string) {
        const headers = {};
        Object.values(this.healthService.manifest).forEach(metricValue => {
            const metric: any = cloneDeep(metricValue);
            headers[metric.id] = metric;
            headers[metric.id].values.forEach((headerGroup, index) => {
                headers[metric.id].values[index].values = headerGroup.values.filter(header => {
                    header.formatClass =
                        healthMonitoring.classFormats[header.format] || 'no-format';
                    return header.display.includes(displayFilter);
                });
            });
        });
        return headers;
    }

    createSnapshot(data): void {
        const systems: any = Object.values(this.healthService.values.systems);
        this.reportSnapshot = cloneDeep(data);
        this.reportSnapshot.time = new Date().toJSON();
        this.reportSnapshot.system = systems[0].info.systemName;
    }

    uploadFile(): void {
        this.fileDropped(this.loadReport.nativeElement.files[0]);
    }

    uploadFileMain(): void {
        this.fileDropped(this.loadReportMain.nativeElement.files[0]);
    }

    openFile(): void {
        this.loadReport.nativeElement.click();
    }

    openFileMain(): void {
        this.loadReportMain.nativeElement.click();
    }

    fileLeave(): void {
        this.importShow = false;
    }

    fileDropped(files: NgxFileDropEntry[] | File): void {
        let file;
        this.healthService.importedData = true;

        // move away so page|data will be reloaded w/ .navigate([this.menu.base + '/alerts'])
        this.router.navigate([this.menu.base]).catch(error => {
            console.error(error);
        });

        if (files[0]?.fileEntry) {
            file = files[0].fileEntry as FileSystemFileEntry;
        } else {
            file = files;
        }

        if (file.name.match(/\.(json)$/i)) {
            const fileReader = new FileReader();
            fileReader.onload = _ => {
                const data = JSON.parse(fileReader.result as string);
                this.setupReport(data);

                this.router.navigate([this.menu.base + '/alerts']).catch(error => {
                    console.error(error);
                });

                const systemName = this.translateService.instant(
                    this.LANG.headerLabels.healthReportForSystem,
                    {
                        systemName: data.system || '',
                    },
                );
                this.headerService.currentLocation = {
                    isSystem: false,
                    parentNode: {
                        authentication: 'Both',
                        display_name: 'Services',
                        icon: 'services.svg',
                        name: 'Services',
                        new_window: false,
                        nodes: [
                            {
                                authentication: 'Both',
                                display_name: systemName,
                                icon: '',
                                name: 'ReportViewer',
                                new_window: false,
                                nodes: undefined,
                                order: 0,
                                url: 'health-report/viewer',
                            },
                        ],
                    },
                    order: 1,
                    url: '',
                    path: 'health-report/viewer',
                };

                let time = '-';
                if (data.time) {
                    time = new Date(data.time).toUTCString();
                }
                this.importedData = {
                    imported: true,
                    system: data.system || '-',
                    time,
                };
            };
            if (typeof file.file === 'function') {
                file.file((file: File) => {
                    fileReader.readAsText(file);
                });
            } else {
                fileReader.readAsText(file);
            }
        } else {
            alert('File not supported, JSON files only');
        }
    }
}
