import { Location } from '@angular/common';
import {
    AfterViewInit,
    Component,
    ElementRef,
    OnInit,
    ViewChild,
    ViewEncapsulation
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { of, SubscriptionLike } from 'rxjs';
import { delay, throttleTime } from 'rxjs/operators';

import { NxMenuService } from '@app/menu/menu.service';
import type { SearchFilter } from '@components/search/search.component.types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import type { NxSystem } from '@services/system.service/system';
import { NxUriService } from '@services/uri.service';
import { LanguageI18NStaticTypes } from '@src/language_i18n_static_types';

import { NxHealthLayoutService } from '../health-layout.service';
import { NxHealthService } from '../health.service';

interface Params {
    [key: string]: string;
}

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-system-metrics-component',
    templateUrl: 'metrics.component.html',
    styleUrls: ['metrics.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class NxSystemMetricsComponent implements OnInit, AfterViewInit {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    account;

    filterModel: SearchFilter = { query: '' };
    system: NxSystem;
    metricId;
    initialId;

    fromBrowserNav: boolean;
    layoutReady: boolean;
    fixedLayoutClass: string;
    breakpoint: string;

    manifest;
    values;
    alarms;

    selectedData;
    selectedPanelData;
    selectedValues;

    menu;
    metricName: string;

    objectValues = Object.values;

    selectedSubscription: SubscriptionLike;
    routeSubscription: SubscriptionLike;
    queryParamSubscription: SubscriptionLike;
    breakpointSubscription: SubscriptionLike;
    windowSizeSubscription: SubscriptionLike;
    locationSubscription: SubscriptionLike;
    locationReadySubscription: SubscriptionLike;
    layoutReadySubscription: SubscriptionLike;
    fixedLayoutClassSubscription: SubscriptionLike;
    activeEntitySubscription: SubscriptionLike;
    elementReadySubscription: SubscriptionLike;

    @ViewChild('search', { static: false }) searchElement: ElementRef;
    @ViewChild('area', { static: false }) areaElement: ElementRef;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        public healthService: NxHealthService,
        public healthLayoutService: NxHealthLayoutService,
        private route: ActivatedRoute,
        private router: Router,
        private location: Location,
        private menuService: NxMenuService,
        private uri: NxUriService,
        private scrollMechanicsService: NxScrollMechanicsService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
    }

    ngOnInit(): void {
        if (this.healthService.values === undefined) {
            const { url } = this.router;
            if (url.includes('/health-report/viewer')) {
                this.router.navigate(['/health-report/viewer']);
            }

            return;
        }

        this.initialId = this.route.snapshot.queryParamMap.get('id');
        let searchParam = this.route.snapshot.queryParamMap.get('search');

        this.locationSubscription = this.location.subscribe((event: PopStateEvent) => {
            // force view component update without URI update
            this.locationReadySubscription = of('').pipe(delay(0)).subscribe(() => {
                const params = { ...this.route.snapshot.queryParams };
                if (params.id) {
                    this.fromBrowserNav = true;
                    // Avoid selecting and entity from non updated selectItems
                    this.elementReadySubscription = of('').pipe(delay(0)).subscribe(() => {
                        this.setActiveEntity(params.id);
                    });
                } else {
                    this.resetActiveEntity(false);
                }
            });
        });

        this.selectedSubscription = this.menuService
            .selectedSectionSubject
            .pipe(throttleTime(1000))
            .subscribe(selection => {
            // when user click same section in the menu - we need to reset table and entity
                if (this.metricId === selection) {
                    this.filterModel.query = '';
                    this.resetActiveEntity();
                    this.search();
                }
            });

        this.routeSubscription = this.route
            .params.pipe(delay(0))
            .subscribe((params: any) => {
                this.metricId = params.metric;
                this.metricName = this.healthService.manifest[this.metricId].name;
                this.menuService.section = this.metricId;
                this.selectedData = this.healthService.tableHeaders[this.metricId];
                this.selectedPanelData = this.healthService.panelParams[this.metricId];
                this.healthLayoutService.metricsValuesCount =
                    this.metricId in this.healthService.values
                        ? Object.values(this.healthService.values[this.metricId]).length
                        : 0;

                if (!this.fromBrowserNav) {
                    this.resetActiveEntity(false);
                } else {
                    this.fromBrowserNav = false;
                }

                if (!searchParam || !searchParam.length) {
                    this.filterModel.query = '';
                    this.selectedValues = this.healthService.values[this.metricId] || {};

                    // server returns IPv6 address with appended interface name (IPv6%IName)
                    // ... but we need only the address
                    if (this.metricId === 'networkInterfaces') {
                        for (const adapter in this.selectedValues) {
                            if (this.selectedValues[adapter].info.otherAddresses) {
                                this.selectedValues[adapter].info.otherAddresses.text =
                                        this.selectedValues[adapter].info.otherAddresses.text?.split('%')[0] || '_';
                            }
                        }
                    }

                    this.handleInitialId();
                } else {
                    this.filterModel.query = searchParam;
                    searchParam = undefined;
                    this.search();
                }

                this.setLayout();
            });

        this.windowSizeSubscription =
            this.scrollMechanicsService.windowSizeSubject
                .subscribe(({ width }) => {
                    if (
                        this.scrollMechanicsService.mediaQueryMax(
                            NxScrollMechanicsService.MEDIA.lg
                        )
                    ) {
                        this.healthLayoutService.mobileDetailMode =
                            this.healthLayoutService.activeEntity !== undefined;
                    } else {
                        this.healthLayoutService.mobileDetailMode = false;
                    }
                    this.setLayout();
                });
    }

    ngAfterViewInit(): void {
        this.healthLayoutService.dimensions = [];

        this.elementReadySubscription = of('').pipe(delay(0)).subscribe(() => {
            this.healthLayoutService.searchTableArea = this.areaElement;
            this.healthLayoutService.searchElement = this.searchElement;
        });

        this.fixedLayoutClassSubscription =
            this.healthLayoutService.fixedLayoutClassSubject
                .pipe(delay(0))
                .subscribe((className: string) => {
                    this.fixedLayoutClass = className;
                });

        this.layoutReadySubscription =
            this.healthLayoutService.layoutReadySubject
                .pipe(delay(0))
                .subscribe((value: boolean) => {
                    this.layoutReady = value;
                });

        this.activeEntitySubscription =
        this.healthLayoutService.activeEntitySubject
            .pipe(delay(0))
            .subscribe(() => {
                this.setLayout();
            });
    }

    ngOnDestroy(): void {
        this.healthLayoutService.resetActiveEntity();
    }

    handleInitialId(): void {
        if (this.initialId) {
            this.setActiveEntity(this.initialId);
            this.initialId = undefined;
        }
    }

    modelChanged(model: SearchFilter): void {
        if (this.filterModel.query !== model.query) {
            this.filterModel.query = model.query;
            this.search();
        }
    }

    search(): void {
        this.selectedValues = this.healthService.itemsSearch(
            this.healthService.values[this.metricId],
            this.filterModel
        );

        this.handleInitialId();
        if (
            this.healthLayoutService.activeEntity &&
            !this.selectedValues[this.healthLayoutService.activeEntity.id]
        ) {
            this.resetActiveEntity();
        }
    }

    setActiveEntity(entity, forceURIUpdate = true): void {
        const queryParams: Params = {};
        this.layoutReady = !!this.healthLayoutService.activeEntity;

        if (entity) {
            // Happens when we get the entity from the url.
            if (typeof entity === 'string') {
                this.healthLayoutService.activeEntity = this.selectedValues[entity];
                if (!this.healthLayoutService.activeEntity) {
                    queryParams.id = undefined;
                } else if (forceURIUpdate) {
                    queryParams.id = entity;
                }

                this.uri
                    .updateURI(undefined, queryParams)
                    .catch(error => {
                        console.error(error);
                    });
            } else {
                this.healthLayoutService.activeEntity = entity;
                queryParams.id = entity.id;

                this.uri
                    .updateURI(undefined, queryParams)
                    .catch(error => {
                        console.error(error);
                    });
            }
            if (
                this.scrollMechanicsService.mediaQueryMax(
                    NxScrollMechanicsService.MEDIA.lg
                )
            ) {
                this.healthLayoutService.mobileDetailMode = true;
            }
        } else {
            this.resetActiveEntity();
        }
    }

    resetActiveEntity(updateURI = true): void {
        if (!this.healthLayoutService.activeEntity) {
            return;
        }
        if (updateURI) {
            const queryParams: Params = {};
            queryParams.id = undefined;

            this.uri
                .updateURI(undefined, queryParams)
                .catch(error => {
                    console.error(error);
                });
        }
        this.healthLayoutService.resetActiveEntity();
    }

    private setLayout(): void {
        this.healthLayoutService.setMetricsLayout();
    }
}
