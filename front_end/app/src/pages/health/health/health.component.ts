import {
    Component,
    Inject,
    OnInit,
    OnDestroy,
    ViewEncapsulation
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { cloneDeep } from 'lodash-es';
import { FileSystemFileEntry, NgxFileDropEntry } from 'ngx-file-drop';
import { of, Subscription, throwError } from 'rxjs';
import { flatMap } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxRibbonService } from '@components/ribbon/ribbon.service';
import { environment } from '@environments/environment';
import { NxAccountService, Account } from '@services/account.service';
import { NxAppSourceService } from '@services/nx-app-source.service';
import { NxAppStateService } from '@services/nx-app-state.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { NxSystemAPI, NxSystemAPIService } from '@services/system-api.service';
import { NxSystemService } from '@services/system.service/system.service';
import type { NxSystem } from '@services/system.service/system/system';
import { NxUriService } from '@services/uri.service';
import { NxUtilsService } from '@services/utils.service/utils.service';
import { WINDOW } from '@services/window-provider';
import { NxMenuService } from '@src/menu/menu.service';
import type { Content } from '@src/menu/menu.types';

import { NxHealthService } from '../health.service';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-system-health-component',
    templateUrl: 'health.component.html',
    styleUrls: ['health.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class NxHealthComponent implements OnInit, OnDestroy {
    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;
    account: Account;
    system: NxSystem | any;
    server: NxSystemAPI;

    menu: Content;

    reportSnapshot;

    importShow: boolean;
    importedData: any = {};
    headerHeight: number;

    hasServerError = false;
    outdatedVersion = false;

    mediaLayoutClass: string;
    selectedSubscription: Subscription;

    private resizeSubscription: Subscription;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private accountService: NxAccountService,
        private appStateService: NxAppStateService,
        private systemService: NxSystemService,
        private serverApi: NxSystemAPIService,
        private route: ActivatedRoute,
        private router: Router,
        private uriService: NxUriService,
        private menuService: NxMenuService,
        private utilsService: NxUtilsService,
        private ribbonService: NxRibbonService,
        private scrollMechanicsService: NxScrollMechanicsService,
        private sourceService: NxAppSourceService,
        public healthService: NxHealthService,
        @Inject(WINDOW) private window: Window
    ) {
        this.LANG = languageService.translations;
        this.CONFIG = configService.getConfig();
    }

    private cleanUp() {
        this.stopSystemPoll();
        this.ribbonService.hide();
    }

    private stopSystemPoll() {
        if (this.system && this.system.stopPoll !== undefined) {
            this.system.stopPoll();
            this.healthService.system = undefined;
        }
    }

    ngOnInit(): void {
        this.window.addEventListener('dragenter', event => {
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
            selectedSection: '', // updated by selectedSectionSubject
            base: '', // `${this.CONFIG.menus.systemSettings.baseUrl}${this.system && this.system.id || ''}${this.CONFIG.menus.systemHealth.baseUrl}`,
            level1: [
                {
                    id: 'alerts',
                    label: 'Alerts',
                    path: 'alerts',
                    svg: 'alerts'
                }
            ]
        };

        this.selectedSubscription = this.menuService.selectedSectionSubject
            .subscribe(selection => {
                if (this.menu.selectedSection !== selection) {
                    this.menu.selectedSection = selection;
                    this.menu = { ...this.menu }; // trigger onChang
                }
            });

        const [currentRoute] = this.router.url.split('?');
        if (currentRoute.endsWith('health')) {
            this.uriService
                .updateURI(`${currentRoute}/alerts`.replace('//', '/'), {}, true)
                .catch(error => {
                    console.error(error);
                });
        }

        this.route.params.subscribe((params: any) => {
            this.cleanUp();
            this.importedData = {};
            const systemId = params.systemId;
            // Promise holder so that if hm is in standalone mode its skips a systems getInfo call.
            let infoPromise = Promise.resolve();
            this.accountService.get().then(account => {
                this.healthService.ready = false;
                this.hasServerError = false;
                this.outdatedVersion = false;
                if (account && typeof account !== 'undefined') {
                    this.account = account;
                    if (environment.isLocal) {
                        this.system = this.systemService.createLocalSystem(
                            this.accountService.mediaServerApi, account.id, account.email
                        );
                    } else {
                        this.system = this.systemService.createSystem(account.email, systemId);
                    }
                    this.menu.base = this.sourceService.getMenuBase(this.system);
                    infoPromise = this.system.getInfo();
                } else {
                    // Create a mock system. All we need is the mediaserver.
                    this.system = {
                        id: '',
                        info: {
                            capabilities: {
                                vms_metrics: true
                            }
                        },
                        isOnline: true,
                        mediaserver: undefined
                    };
                    this.system.mediaserver = this.serverApi.createConnection(
                        undefined, undefined,
                        undefined, () => {}
                    );
                    this.menu.base = '/health';
                }
                this.healthService.system = this.system;
                infoPromise.then(() => {
                    if (this.system.isOnline) {
                        this.outdatedVersion = !this.system.info.capabilities.vms_metrics;
                    }
                    if (!this.outdatedVersion) {
                        this.updateValues();
                    }
                });
            });
        });

        // We listen to window resize and measure header height to know how much to offset the fixed menu by
        this.resizeSubscription = this.scrollMechanicsService.windowSizeSubject.subscribe(({ width }) => {
            if (width >= 768 && this.appStateService.headerVisibleSubject.getValue()) {
                this.setHeaderHeight();
            }

            if (
                this.scrollMechanicsService.mediaQueryMax(
                    NxScrollMechanicsService.MEDIA.lg
                )
            ) {
                this.mediaLayoutClass = 'mobileLayout';
            } else if (
                this.scrollMechanicsService.mediaQueryMin(
                    NxScrollMechanicsService.MEDIA.xl
                )
            ) {
                this.mediaLayoutClass = 'wideLayout';
            } else {
                this.mediaLayoutClass = '';
            }
        });
    }

    setHeaderHeight() {
        this.headerHeight =
            document.getElementsByClassName('headerContainer')[0].scrollHeight;
    }

    ngOnDestroy(): void {
        this.cleanUp();
    }

    setupReport(_data) {
        const data = cloneDeep(_data);
        // Handle server not responding for "ec2/metrics/manifest"
        if (!data.reply) {
            return throwError('Error getting manifest');
        }

        this.healthService.ready = false;
        this.menu.level1 = [this.menu.level1[0]];

        this.healthService.manifest = data.reply['ec2/metrics/manifest'].reply;
        this.healthService.values = data.reply['ec2/metrics/values'].reply;
        this.healthService.alarms = data.reply['ec2/metrics/alarms'].reply;
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
                const svgName = asset === 'cameras'
                    ? 'camera'
                    : asset === 'systems' ? 'system' : asset;
                menu.level1.push({
                    id: asset,
                    label: this.healthService.manifest[asset].name,
                    path: asset,
                    svg: svgName
                });
            }
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
        this.menu = { ...menu };
        // Allow time for change detection so child components can reinitialize
        setTimeout(() => {
            this.healthService.ready = true;
        }, 200);
        return of(true);
    }

    colorHeaderGroups(metric) {
        let counter = 0;
        metric.values = metric.values.map(group => {
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
        this.healthService.tableHeaders = this.processManifestHeaders('table');
        this.healthService.panelParams = this.processManifestHeaders('panel');
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
                const alarmCount = {
                    warning: 0,
                    error: 0
                };
                let highestAlarm;

                this.healthService.values[metric][entity].id = entity;
                this.healthService.values[metric][entity].searchTags = [];

                this.healthService.manifest[metric].values.forEach(group => {
                    if (this.healthService.values[metric][entity][group.id] !== undefined) {
                        group.values.forEach(header => {
                            if (this.healthService.values[metric][entity][group.id][header.id] !== undefined) {
                                const alarms = this.healthService.alarms[metric] && this.healthService.alarms[metric][entity] &&
                                    this.healthService.alarms[metric][entity][group.id] &&
                                    this.healthService.alarms[metric][entity][group.id][header.id];
                                let alarm;
                                if (alarms) {
                                    alarm = this.highestAlarm(alarms);
                                    if (!highestAlarm || alarm.level === 'error' && highestAlarm.level === 'warning') {
                                        highestAlarm = alarm;
                                    }
                                    alarmCount[alarm.level]++;
                                }

                                const formattedVal: any = this.healthService.formatValue(
                                    header, this.healthService.values[metric][entity][group.id][header.id]
                                );

                                this.healthService.values[metric][entity][group.id][header.id] = {
                                    ...formattedVal,
                                    class: alarm ? alarm.level : '',
                                    tooltip: alarm ? this.getAlertText(metric, entity, alarm.text) : '',
                                    icon: alarm ? alarm.level : ''
                                };

                                if (header.display) { // Search by displayed fields
                                    this.healthService.values[metric][entity].searchTags += (formattedVal.text + ' ').toLowerCase();
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
                    const level = highestAlarm.level;
                    const count = alarmCount[level];

                    if (count > 1) {
                        let name = this.healthService.findEntityName(this.healthService.values[metric][entity]);
                        name = name ? `${name} ` : '';
                        const resourceName = this.healthService.manifest[metric].resource;
                        const tooltip = `${resourceName} ${name}has ${count} different ${level}s`;

                        if (this.healthService.values[metric][entity]._.name) {
                            this.healthService.values[metric][entity]._.name.tooltip = tooltip;
                        }
                        this.healthService.values[metric][entity]._.alarm.tooltip = tooltip;
                    } else {
                        if (this.healthService.values[metric][entity]._.name) {
                            this.healthService.values[metric][entity]._.name.tooltip = this.getAlertText(metric, entity, highestAlarm.text);
                        }
                        this.healthService.values[metric][entity]._.alarm.tooltip = this.getAlertText(metric, entity, highestAlarm.text);
                    }
                }
            });
        });
    }

    getAlertText(metric, entity, message) {
        const resourceName = this.healthService.manifest[metric].resource;
        const entityName = this.healthService.findEntityName(this.healthService.values[metric][entity]);
        if (resourceName && entityName !== '−') {
            return `${resourceName} ${entityName} ${message}`;
        } else {
            return message;
        }
    }

    initializeAlarms() {
        Object.keys(this.healthService.alertsCount).forEach(type => {
            this.healthService.alertsCount[type] = 0;
        });
        this.healthService.alertsValues = [];
        const unset = this.CONFIG.healthMonitoring.classFormats.unset;
        Object.entries(this.healthService.alarms).forEach(([metric, entities]) => {
            Object.entries(entities).forEach(([entity, groups]) => {
                Object.entries(groups).forEach(([group, params]) => {
                    Object.entries(params).forEach(([param, alarms]) => {
                        alarms.forEach(alarm => {
                            const alert: any = { _: {} };
                            const server = this.healthService.values[metric][entity].info.server;
                            if (!server && metric === 'servers') {
                                alert._.server = { text: this.healthService.values.servers[entity]._.name.text, id: entity };
                            } else if (server) {
                                alert._.server = { text: server.text, id: server.value };
                            } else {
                                alert._.server = { text: '', id: '' };
                            }
                            alert._.server.formatClass = 'long-text';
                            alert._.type = {
                                text: this.healthService.manifest[metric].resource || this.healthService.manifest[metric].name,
                                formatClass: 'text'
                            };
                            alert._.message = { text: alarm.text, formatClass: unset };
                            alert._.alarm = { icon: alarm.level };

                            alert.metric = metric;
                            alert.entity = entity;

                            const resourceName = this.healthService.manifest[metric].resource;
                            const entityName = this.healthService.findEntityName(this.healthService.values[metric][entity]);
                            if (resourceName && entityName !== '−') {
                                alert._.message.text = this.getAlertText(metric, entity, alert._.message.text);
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
                    header.formatClass = this.CONFIG.healthMonitoring.classFormats[header.format] || 'no-format';
                    return header.display.includes(displayFilter);
                });
            });
        });
        return headers;
    }

    createSnapshot(data) {
        const systems: any = Object.values(this.healthService.values.systems);
        this.reportSnapshot = cloneDeep(data);
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

        this.utilsService.saveAs(this.reportSnapshot, filename, 'text/json');
    }

    fileDropped(files: NgxFileDropEntry[]) {
        this.importShow = false;
        this.healthService.importedData = true;
        const fileEntry = files[0].fileEntry as FileSystemFileEntry;
        const fileReader = new FileReader();
        fileReader.onload = _ => {
            const data = JSON.parse(fileReader.result as string);
            this.setupReport(data);

            this.router
                .navigate([this.menu.base + 'alerts'])
                .catch(error => {
                    console.error(error);
                });

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
            this.ribbonService.show(
                'You are viewing an imported report, refresh the page to get a fresh report',
                [],
                'alert'
            );
            setTimeout(() => {
                this.setHeaderHeight();
            });
        };

        fileEntry.file((file: File) => {
            fileReader.readAsText(file);
        });
    }

    fileLeave() {
        this.importShow = false;
    }

    updateValues(forceUpdate = false) {
        this.healthService.ready = false;
        this.system.mediaserver.getAggregateHealthReport(forceUpdate).pipe(
            flatMap((result: any) => this.setupReport(result))
        ).subscribe(() => {}, () => {
            if (!this.system.id) {
                !this.window.parent
                    ? this.window.location.reload()
                    : this.window.parent.location.reload();
            }
            this.hasServerError = this.system.isOnline;
        });
    }

    canShowOffline() {
        return !this.healthService.ready &&
            !this.hasServerError &&
            !this.outdatedVersion;
    }
}
