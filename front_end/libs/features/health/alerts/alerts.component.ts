import { Location } from '@angular/common';
import {
    AfterViewInit,
    Component,
    ElementRef,
    Inject,
    LOCALE_ID,
    OnDestroy,
    OnInit,
    ViewChild,
    ViewEncapsulation,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { isEqual, cloneDeep } from 'lodash-es';
import { of, SubscriptionLike } from 'rxjs';
import { delay, throttleTime } from 'rxjs/operators';

import { NxMenuService } from '@app/menu/menu.service';
import staticLang from '@common/language/language_i18n_static.json';
import type { SearchFilter } from '@components/search/search.component.types';
import { environment } from '@environments/environment';
import { icons } from '@lib/variables/static-variables';
import { NxPageService } from '@services/page.service';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { NxUriService } from '@services/uri.service';
import { GridBreakpoints } from '@styles/theme-variables-common';
import { alphabeticalSort, paramSortFunc } from '@utils/general';

import { NxHealthLayoutService } from '../health-layout.service';
import { NxHealthService } from '../health.service';

interface Params {
    [key: string]: any;
}

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-system-alerts-component',
    templateUrl: 'alerts.component.html',
    styleUrls: ['alerts.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class NxSystemAlertsComponent implements OnInit, AfterViewInit, OnDestroy {
    LANG = staticLang;
    filterModel: SearchFilter = { query: '', selects: [] };
    params: any = {};
    numFilters: number;
    metricId;

    layoutReadySubscription: SubscriptionLike;
    locationSubscription: SubscriptionLike;
    selectedSubscription: SubscriptionLike;
    activeEntitySubscription: SubscriptionLike;
    fixedLayoutClassSubscription: SubscriptionLike;
    elementReadySubscription: SubscriptionLike;

    reportView: boolean;
    layoutReady: boolean;
    fixedLayoutClass: string;
    smallDesktopMode: boolean;
    breakpoint: string;

    manifest;
    values;

    tableHeaders;
    alerts;

    activePanelParams;

    alertsCount: number;
    alertCards;
    alertCardCount: number;

    windowSizeSubscription;
    tableWrapper: number;
    icons = icons;

    @ViewChild('tiles', { static: false }) tilesElement: ElementRef;
    @ViewChild('search', { static: false }) searchElement: ElementRef;
    @ViewChild('area', { static: false }) areaElement: ElementRef;
    // @ViewChild('tableContainer', { static: false }) tableContainer: ElementRef;

    constructor(
        pageService: NxPageService,
        public healthLayoutService: NxHealthLayoutService,
        public healthService: NxHealthService,
        private route: ActivatedRoute,
        private router: Router,
        private location: Location,
        private menuService: NxMenuService,
        private uriService: NxUriService,
        private scrollMechanicsService: NxScrollMechanicsService,
        @Inject(LOCALE_ID) private locale: string,
    ) {
        pageService.pageTitle(this.LANG.pageTitles.information);
    }

    private sortAlertsFunc() {
        return elm => {
            const isError = elm._.alarm.icon === 'error';
            switch (elm.metric) {
                // We can adjust sorting here
                // currently errors are shown first then warnings
                // in a pattern "servers->cameras->storages->networks"
                case 'servers':
                    return isError ? 1 : 5;
                case 'cameras':
                    return isError ? 2 : 6;
                case 'storages':
                    return isError ? 3 : 7;
                case 'networkInterfaces':
                    return isError ? 4 : 8;

                default:
                    return 9;
            }
        };
    }

    ngOnInit(): void {
        this.numFilters = 4;

        this.params = this.route.snapshot.queryParams;
        this.menuService.section = 'alerts';

        const { url } = this.router;
        this.reportView = url.includes('/health-report/viewer');
        if (!this.healthService.alertsValues) {
            if (this.reportView) {
                this.router.navigate([`/health${environment.isLocal ? '' : '-report'}/viewer`]);
            }

            return;
        }

        this.addFilterServers();
        this.addFilterTypes();
        this.addFilterAlarms();

        this.manifest = this.healthService.manifest;
        this.values = this.healthService.values;

        this.initializeHeader();
        this.processAlerts();

        this.alerts = this.healthService.alertsSearch(
            this.healthService.alertsValues,
            this.filterModel,
        );
        this.alerts.sort(paramSortFunc(this.sortAlertsFunc()));
        this.countAlerts();

        if (this.params.id && this.params.metric) {
            const alarm = this.alerts.find(alert => {
                return alert.entity === this.params.id && alert.metric === this.params.metric;
            });
            this.setActiveEntity(alarm, false);
        }

        this.windowSizeSubscription = this.scrollMechanicsService.windowSizeSubject.subscribe(
            ({ width }) => {
                if (this.scrollMechanicsService.mediaQueryMax(GridBreakpoints.LG)) {
                    this.healthLayoutService.mobileDetailMode =
                        this.healthLayoutService.activeEntity !== undefined;
                } else {
                    this.healthLayoutService.mobileDetailMode = false;
                }

                this.smallDesktopMode =
                    this.scrollMechanicsService.mediaQueryMin(GridBreakpoints.LG) &&
                    this.scrollMechanicsService.mediaQueryMax(GridBreakpoints.XL);

                this.setLayout();
            },
        );

        this.locationSubscription = this.location.subscribe((event: PopStateEvent) => {
            // force view component update without URI update
            setTimeout(() => {
                const params = { ...this.route.snapshot.queryParams };

                if (params.id) {
                    const alarm = this.healthService.alertsValues.find(alert => {
                        return alert.metric === params.metric && alert.entity === params.id;
                    });

                    if (alarm) {
                        this.setActiveEntity(alarm, false);
                    }
                } else {
                    this.resetActiveEntity(false);
                }
            });
        });

        this.selectedSubscription = this.menuService.selectedSectionSubject
            .pipe(throttleTime(1000))
            .subscribe(selection => {
                // when user click same section in the menu - we need to reset table and entity
                if (this.metricId === selection) {
                    this.resetActiveEntity();
                    this.resetFilterModel();
                    this.alerts = this.healthService.alertsSearch(
                        this.healthService.alertsValues,
                        this.filterModel,
                    );
                } else {
                    // short circuit first subscription
                    this.metricId = 'alerts';
                }
            });
    }

    ngAfterViewInit(): void {
        this.healthLayoutService.dimensions = [];
        this.elementReadySubscription = of('')
            .pipe(delay(0))
            .subscribe(() => {
                this.healthLayoutService.tilesElement = this.tilesElement;
                this.healthLayoutService.searchElement = this.searchElement;
                this.healthLayoutService.searchTableArea = this.areaElement;
            });

        this.fixedLayoutClassSubscription = this.healthLayoutService.fixedLayoutClassSubject
            .pipe(delay(0))
            .subscribe(className => {
                this.fixedLayoutClass = className;
            });

        this.layoutReadySubscription = this.healthLayoutService.layoutReadySubject
            .pipe(delay(0))
            .subscribe((value: boolean) => {
                this.layoutReady = value;
            });

        this.activeEntitySubscription = this.healthLayoutService.activeEntitySubject
            .pipe(delay(0))
            .subscribe(() => {
                this.setLayout();
            });
    }

    trackItem(index, item) {
        return item ? item.entity : undefined;
    }

    ngOnDestroy(): void {
        this.healthLayoutService.resetActiveEntity();
    }

    modelChanged(model: SearchFilter): void {
        if (!isEqual(this.filterModel, model)) {
            // avoid unnecessary trips
            this.healthService.tableReady = false;
            this.filterModel = cloneDeep(model);
            this.alerts = this.healthService.alertsSearch(this.healthService.alertsValues, model);
            this.countAlerts();

            if (this.alerts.length) {
                this.healthLayoutService.setTableDimensions();
            }
        }
    }

    resetFilterModel(): void {
        if (this.filterModel.selects) {
            this.filterModel.selects.forEach(filter => {
                filter.selected = filter.items[0];
            });
        }

        this.filterModel = { ...this.filterModel };
        this.countAlerts();
    }

    addFilterAlarms(): void {
        const alertItems = [
            { value: '0', name: this.LANG.alertFilters.all },
            { value: 'warning', name: this.LANG.alertFilters.warning },
            { value: 'error', name: this.LANG.alertFilters.error },
        ];

        const selected = alertItems.filter(item => {
            return this.params.alertType === item.value;
        })[0];

        this.filterModel.selects.push({
            id: 'alertType',
            label: '',
            css: 'col-12 col-lg-3 mr-0 mr-lg-2 p-0',
            items: alertItems,
            selected: selected || alertItems[0],
        });
    }

    addFilterTypes(): void {
        const typesItems = [];
        let selected;

        for (const [key, value] of Object.entries(this.healthService.manifest)) {
            const val: any = value;
            if (val.resource !== '' && key in this.healthService.values) {
                const item = {
                    value: val.resource,
                    name: this.LANG.deviceTypes[val.id] || val.resource,
                };
                typesItems.push(item);

                if (this.params.deviceType === val.resource) {
                    selected = item;
                }
            }
        }

        typesItems.unshift({ value: '0', name: this.LANG.deviceTypes['All Device Types'] });

        this.filterModel.selects.push({
            id: 'deviceType',
            label: '',
            css: 'col-12 col-lg-3 mr-0 mr-lg-2 p-0',
            items: typesItems,
            selected: selected || typesItems[0],
        });
    }

    addFilterServers(): void {
        const serverItems = [];
        let selected;

        for (const [key, value] of Object.entries(this.healthService.values.servers)) {
            const val: any = value;
            const item = { value: key, name: val._.name.text };
            serverItems.push(item);

            if (this.params.server === key) {
                selected = item;
            }
        }

        serverItems.unshift({ value: '0', name: this.LANG['All Servers'] });

        this.filterModel.selects.push({
            id: 'server',
            label: '',
            css: 'col-12 col-lg-4 mr-0 mr-lg-2 p-0',
            items: serverItems,
            selected: selected || serverItems[0],
        });
    }

    isFilterEmpty() {
        let singleSelect = false;
        if (this.filterModel.selects) {
            this.filterModel.selects.forEach(select => {
                singleSelect = singleSelect || select.selected.value !== '0'; // 0 is default choice
            });
        }

        return !singleSelect;
    }

    countAlerts(): void {
        this.alertsCount = Object.values(this.alerts).length;
    }

    processAlerts(): void {
        /*
         * 1.Reduce converts array of alerts into object
         * [{metric: name, _ :{icon: alarmLevel}}] => { resourceType: {alarmLevel: count} }
         * 2. Map converts object into array of alerts sorted by resourceTypes
         * { resourceType: {alarmLevel: count} } => [{resourceType: name,  alarms : [{alarmLevel: count}]}]
         * Note: alarm levels are sorted alphabetically
         */
        const alarmTypes: any = Object.values(this.healthService.manifest)
            .filter((resource: any) => {
                return resource.id !== 'systems' && resource.id in this.healthService.values;
            })
            .reduce((obj: any, item: any) => {
                obj[item.id] = {
                    alarms: {
                        error: 0,
                        warning: 0,
                    },
                    name: item.name,
                };
                return obj;
            }, {});
        this.healthService.alertsValues
            .filter((value: any) => {
                return value.metric !== 'systems';
            })
            .forEach(item => {
                if (alarmTypes[item.metric]) {
                    alarmTypes[item.metric].alarms[item._.alarm.icon] += 1;
                }
            });
        this.alertCards = Object.values(alarmTypes).map((alarmType: any) => {
            return {
                alerts: Object.entries(alarmType.alarms)
                    .map(([level, count]) => {
                        // If level is error and type is server convert to offline. Otherwise, return level.
                        const name =
                            level === 'error' && alarmType.name === 'Servers'
                                ? this.LANG.alarmLevels.offline
                                : this.LANG.alarmLevels[level] || `${level}s`;

                        return { count, level, name };
                    })
                    .sort(alphabeticalSort(this.locale, a => a.level)),
                name: this.LANG.alarmTypes[alarmType.name] || alarmType.name,
            };
        });
        this.alertCardCount = Object.keys(this.alertCards).length;
    }

    initializeHeader(): void {
        this.tableHeaders = {
            id: 'alerts',
            values: [
                {
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
                            name: this.LANG.tableHeaders.type,
                            id: 'type',
                            formatClass: 'text',
                        },
                        {
                            display: 'table',
                            name: this.LANG.tableHeaders.server,
                            id: 'server',
                            formatClass: 'long-text',
                        },
                        {
                            display: 'table',
                            name: this.LANG.tableHeaders.alert,
                            id: 'message',
                        },
                    ],
                },
            ],
        };
    }

    setActiveEntity(alarm, updateURI = true): void {
        if (alarm?.entity) {
            this.layoutReady = !!this.healthLayoutService.activeEntity;
            this.healthLayoutService.activeEntity = this.values[alarm.metric][alarm.entity];
            this.healthLayoutService.metricsValuesCount =
                alarm.metric in this.healthService.values
                    ? Object.values(this.healthService.values[alarm.metric]).length
                    : 0;

            this.activePanelParams = this.healthService.panelParams[alarm.metric];

            if (updateURI) {
                const queryParams: Params = {};
                queryParams.id = alarm.entity;
                queryParams.metric = alarm.metric;

                this.uriService.updateURI(undefined, queryParams).catch(error => {
                    console.error(error);
                });
            }

            if (this.scrollMechanicsService.mediaQueryMax(GridBreakpoints.LG)) {
                this.healthLayoutService.mobileDetailMode = true;
            }

            this.layoutReady = Object.keys(this.healthLayoutService.activeEntity).length > 0;
        } else {
            this.resetActiveEntity();
        }
    }

    resetActiveEntity(updateURI = true): void {
        if (updateURI) {
            const queryParams: Params = {};
            queryParams.id = undefined;
            queryParams.metric = undefined;

            this.uriService.updateURI(undefined, queryParams).catch(error => {
                console.error(error);
            });
        }
        this.healthLayoutService.resetActiveEntity();
    }

    private setLayout(): void {
        this.healthLayoutService.setAlertLayout();
    }
}
