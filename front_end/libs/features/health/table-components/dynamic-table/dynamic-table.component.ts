import { Location } from '@angular/common';
import {
    Component,
    Input,
    Output,
    EventEmitter,
    OnChanges,
    OnInit,
    ViewEncapsulation,
    ViewChild,
    ElementRef,
    AfterViewInit,
    Inject

} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { isEqual } from 'lodash-es';
import { DeviceDetectorService } from 'ngx-device-detector';
import { SubscriptionLike } from 'rxjs';
import { debounceTime, delay } from 'rxjs/operators';

import { NxRibbonService } from '@components/ribbon/ribbon.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { NxUriService } from '@services/uri.service';
import { WINDOW } from '@services/window-provider';
import { paramSortFunc } from '@utils/general';
import { NgChanges } from '@utils/ng-changes';

import { NxHealthLayoutService } from '../../health-layout.service';
import { NxHealthService } from '../../health.service';

interface Params {
    [key: string]: any;
}

const ALARM_ORDER = {
    error: 2,
    warning: 1,
    '': 0
};

const TEXT_FORMATS = [
    'longText',
    'long-text',
    'shortText',
    'short-text',
    'text',
    'no-max-width'
];
const GROUP_ID = 0;
const PARAM_ID = 1;
const SORT_DIR = 2;

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-dynamic-table',
    templateUrl: './dynamic-table.component.html',
    styleUrls: ['./dynamic-table.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class NxDynamicTableComponent implements OnChanges, OnInit, AfterViewInit {
    @Input() tableHeader = '';
    @Input() headers: any = [];
    @Input() elements: any = [];
    @Input() showGroups = true;

    @Output() public onRowClick: EventEmitter<any> = new EventEmitter<any>();

    CONFIG: IConfig;

    _elements: any = [];
    params: any = {};
    pages: number;

    public selectedEntity;
    public selectedGroup;
    public selectedHeader;
    public showHeaders;

    sortOrderASC: boolean;
    offset: number;
    currentPage: number;
    pageSize: number;
    startIndex: number;
    pager: any = {};
    pagedItems: any[];
    pagerMaxSize: number;
    pagerEllipses: boolean;
    serviceParams;
    serviceHeaders;

    windowSize: any = {};
    clientHeight: number;
    offsetHeight: number;
    scrollHeight: number;
    showHorizontalTooltip: boolean;
    hideTooltip;
    mobileDetailMode: boolean;

    ribbonSubscription: SubscriptionLike;
    pageSubscription: SubscriptionLike;
    resizeSubscription: SubscriptionLike;
    locationSubscription: SubscriptionLike;
    queryParamSubscription: SubscriptionLike;

    @ViewChild('tableHead', { static: false }) tableHeadElement: ElementRef;
    @ViewChild('tableTitle', { static: false }) tableTitleElement: ElementRef;
    @ViewChild('nxTable', { static: false }) tableElement: ElementRef;
    @ViewChild('tooltip', { static: false }) tableTooltip: ElementRef;

    constructor(
        configService: NxConfigService,
        private ribbonService: NxRibbonService,
        private uri: NxUriService,
        private route: ActivatedRoute,
        private location: Location,
        private scrollMechanicsService: NxScrollMechanicsService,
        private deviceDetectorService: DeviceDetectorService,
        private healthLayoutService: NxHealthLayoutService,
        public healthService: NxHealthService,
        @Inject(WINDOW) private window: Window,
    ) {
        this.CONFIG = configService.getConfig();
        this.elements = this.elements || [];

        this.pagedItems = [];
        this.currentPage = 1;
        this.healthService.tableReady = false;
        this.showHorizontalTooltip = false;

        this.resizeSubscription = this.scrollMechanicsService.windowSizeSubject
            .subscribe(() => {
                this.mobileDetailMode = this.healthLayoutService.activeEntity &&
                this.scrollMechanicsService.mediaQueryMax(
                    NxScrollMechanicsService.MEDIA.lg
                );
                if (this.tableElement) {
                    this.healthLayoutService.tableWidth =
                        this.tableElement.nativeElement.offsetWidth;
                }

                this.setPagerSize();
            });

        this.locationSubscription = this.location
            .subscribe((event: PopStateEvent) => {
            // force view component update without URI update
                setTimeout(() => {
                    this.params = { ...this.route.snapshot.queryParams };

                    this.startIndex = this.params.index || 0;

                    if (this.params.sortBy) {
                        this.sortBy(this.params.sortBy);
                    } else {
                        this.sortOrderASC = true;
                        this.selectedGroup = undefined;
                        this.selectedHeader = undefined;
                    }

                    this.selectPage(undefined, this.startIndex);
                });
            });

        this.queryParamSubscription = this.uri
            .getParams()
            .pipe(debounceTime(this.CONFIG.search.debounceShortTime))
            .subscribe(params => {
                this.params = params;
                if (this.params.page) {
                    this.selectPage(parseInt(this.params.page));
                }
            });
    }

    ngOnInit(): void {
        this.params = { ...this.route.snapshot.queryParams };
        if (this.params.sortBy) {
            this.sortBy(this.params.sortBy);
        } else {
            this.sortOrderASC = true;
            this.selectedGroup = undefined;
            this.selectedHeader = undefined;
        }

        if (this.healthLayoutService.activeEntity) {
            this.setPagerSize();
            this.startIndex = this._elements.findIndex(elem => {
                return this.healthLayoutService.activeEntity === elem ||
                    this.healthLayoutService.activeEntity.id === elem.entity;
            });
            if (this.startIndex !== -1) {
                this.selectedEntity = this._elements[this.startIndex];
            }
        }
        if ([undefined, -1].includes(this.startIndex)) {
            this.startIndex = parseInt(this.params.index) || 0;
        }
        this.healthService.tableReady = true;

        this.ribbonSubscription = this.ribbonService
            .contextSubject
            .subscribe(() => {
                this.setTableDimensions();
            });
    }

    initLayoutService(): void {
        this.healthLayoutService.tableHeaderElement = this.tableHeadElement;
        this.healthLayoutService.tableTitleElement = this.tableTitleElement;
        this.healthLayoutService.tableElement = this.tableElement;

        this.pageSubscription = this.healthLayoutService
            .pageSizeSubject
            .pipe(delay(0))
            .subscribe(pageSize => {
                this.pageSize = pageSize;
                const params = { ...this.route.snapshot.queryParams };
                if (params.index) {
                    this.setPage(undefined, parseInt(params.index, 10));
                } else {
                    this.setPage(1);
                }
            });

        this.healthLayoutService.activeEntitySubject
            .subscribe((activeEntity: any) => {
                this.setActiveEntity(activeEntity);
            });
    }

    private setPagerSize(): void {
        if (
            this.scrollMechanicsService.mediaQueryMax(
                NxScrollMechanicsService.MEDIA.md
            ) || (
                this.scrollMechanicsService.mediaQueryMax(
                    NxScrollMechanicsService.MEDIA.xl
                ) && this.selectedEntity
            )
        ) {
            this.pagerMaxSize = this.CONFIG.ipvd.pagerMaxSizeMedium;
            this.pagerEllipses = false;
        } else {
            this.pagerMaxSize = this.CONFIG.ipvd.pagerMaxSize;
            this.pagerEllipses = true;
        }
    }

    private setActiveEntity(activeEntity): void {
        if (activeEntity) {
            this.selectedEntity = this._elements.find(elem => {
                return this.healthLayoutService.activeEntity === elem ||
                    this.healthLayoutService.activeEntity.id === elem.entity;
            });
        } else {
            this.selectedEntity = activeEntity;
        }

        if (
            this.scrollMechanicsService.mediaQueryMax(
                NxScrollMechanicsService.MEDIA.lg
            )
        ) {
            this.mobileDetailMode = !!this.selectedEntity;
        }

        if (!activeEntity && !this.healthService.tableReady) {
            this.setPage(undefined, this.startIndex || 0);
        }

        this.setPagerSize();
    }

    trackItem(index, item) {
        return item ? item.id : undefined;
    }

    ngOnChanges(changes: NgChanges<NxDynamicTableComponent>): void {
        let resetURI;

        if (changes.headers) {
            this.selectedHeader = undefined;

            if (changes.headers.previousValue !== undefined &&
                !isEqual(
                    changes.headers.previousValue,
                    changes.headers.currentValue
                )
            ) {
                resetURI = true;
            }
        }

        if (changes.elements) {
            this._elements = Object.values(changes.elements.currentValue);

            setTimeout(() => {
                const params = { ...this.route.snapshot.queryParams };
                if (changes.elements.firstChange && params.index) {
                    this.setPage(undefined, parseInt(params.index, 10));
                } else {
                    this.setPage(1);
                }

                if (this.tableElement) {
                    this.setTableDimensions();
                }
            });
        }

        if (resetURI) {
            setTimeout(() => {
                const queryParams: Params = {};
                queryParams.sortBy = undefined;
                queryParams.page = undefined;
                queryParams.index = undefined;

                this.uri
                    .updateURI(undefined, queryParams)
                    .then(() => {
                        this.sortOrderASC = true;
                        this.selectedHeader = undefined;
                    });
            });
        }
    }

    private setTableDimensions(): void {
        setTimeout(() => this.healthLayoutService.setTableDimensions());
    }

    ngAfterViewInit(): void {
        this.initLayoutService();
        if (this.healthLayoutService.dimensions) {
            this.setTableDimensions();
        }
    }

    ngOnDestroy(): void {
    }

    showTooltip(event): void {
        if (this.deviceDetectorService.browser.toLowerCase() !== 'ie') {
            this.showHorizontalTooltip = true;
            if (this.hideTooltip) {
                clearTimeout(this.hideTooltip);
            }
            this.hideTooltip = setTimeout(() => {
                this.showHorizontalTooltip = false;
                this.hideTooltip = undefined;
            }, 1000);
        }
    }

    sortBy(param): void {
        const sortBy = param.split(',');
        this.sortOrderASC = (sortBy[SORT_DIR] === 'ASC');
        this.selectedGroup = sortBy[GROUP_ID];
        this.selectedHeader = sortBy[PARAM_ID];

        this.toggleSort(
            sortBy[GROUP_ID],
            sortBy[PARAM_ID],
            false,
            undefined,
            true
        );
    }

    setClickedRow(element): void {
        this.onRowClick.emit(element);
        this.selectedEntity = element;
    }

    setPagedItems(startIndex): void {
        const page = Math.floor(this.startIndex / this.pageSize) + 1;
        startIndex = (page - 1) * this.pageSize;
        if (page !== this.currentPage) {
            this.currentPage = page;
        }

        const endIndex = startIndex + this.pageSize;
        this.pagedItems = this._elements.slice(startIndex, endIndex);

        // TODO: Remove if table dimensions timeout can be removed in CLOUD-4233
        if (this.healthService.tableReady) {
            this.startIndex = startIndex;
        }
    }

    selectPage(page: number, startIndex?): void {
        if (page) {
            this.currentPage = page;
            this.startIndex = (page - 1) * this.pageSize;
        } else {
            this.startIndex = startIndex || 0;
        }

        // preserve window offset
        this.uri.pageOffset = this.window.pageYOffset;
        setTimeout(() => this.setPagedItems(this.startIndex));
    }

    setPage(page: number, startIndex?, fromComponent = false): void {
        // TODO: possible optimization - we may not need snapshot params here
        if (
            this.mobileDetailMode ||
            startIndex === 0 && this.params.index === undefined
        ) {
            return;
        }

        this.pages = Math.ceil(this._elements.length / this.pageSize);
        this.selectPage(page, startIndex);

        this.params = { ...this.route.snapshot.queryParams };
        const index = (this.startIndex === 0) ? undefined : this.startIndex;
        const pageParam = this.params && parseInt(this.params.index, 10) || undefined;

        if (pageParam !== index) {
            const queryParams: Params = {};
            if (fromComponent) {
                queryParams.id = undefined;
                this.healthLayoutService.activeEntity = undefined;
            }
            queryParams.index = (this.currentPage === 1) ? undefined : this.startIndex;

            this.uri
                .updateURI(this.uri.getURL(), queryParams)
                .catch(error => {
                    console.error(error);
                });
        }
    }

    getCleanTitle(text: string): string {
        return text.replace(/\<br\>/g, ' ')
            .replace(/\<\/?span\>/g, '');
    }

    isBoolean(x: any): boolean {
        return !(typeof x === 'string' || typeof x === 'number');
    }

    toggleSort(groupId, paramId, updateURI?, format?, byParam = false) {
        if (this.selectedGroup !== groupId || this.selectedHeader !== paramId) {
            this.sortOrderASC = TEXT_FORMATS.includes(format);
        }
        this.selectedGroup = groupId;
        this.selectedHeader = paramId;

        function sortFunc() {
            switch (paramId) {
                case 'alarm':
                    return elm => {
                        return (
                            elm[groupId]?.[paramId] &&
                            ALARM_ORDER[elm[groupId][paramId].icon]
                        ) || '';
                    };
                case 'resolution':
                    return elm => {
                        if (elm[groupId]?.[paramId]?.value) {
                            const res = elm[groupId][paramId]
                                .value.toLowerCase().split('x');

                            if (res.length === 2) {
                                return res[0] * res[1];
                            } else {
                                return 0; // invalid format
                            }
                        } else {
                            return 0; // no data
                        }
                    };
                case 'displayAddress':
                    return elm => {
                        if (!(elm[groupId]?.[paramId])) {
                            return Number.NEGATIVE_INFINITY;
                            // metric does not exist - visual representation is "-"
                        }
                        const value = elm[groupId]?.[paramId]?.value;
                        return parseInt(value.replace(/\./g, '')) || 0;
                    };
                default:
                    return elm => {
                        if (!(elm[groupId]?.[paramId])) {
                            return Number.NEGATIVE_INFINITY;
                            // metric does not exist - visual representation is "-"
                        }

                        const format = elm[groupId]?.[paramId]?.formatClass || undefined;

                        if (TEXT_FORMATS.includes(format)) {
                            return elm[groupId]?.[paramId]?.text || '';
                        }

                        return elm[groupId]?.[paramId]?.value || 0;
                    };
            }
        }

        this.sortOrderASC = (byParam) ? this.sortOrderASC : !this.sortOrderASC;
        this._elements.sort(paramSortFunc(sortFunc(), this.sortOrderASC));

        if (updateURI || updateURI === undefined) {
            const queryParams: Params = {};

            queryParams.page = undefined;
            queryParams.sortBy = groupId + ',' + paramId;
            queryParams.sortBy += (this.sortOrderASC) ? ',ASC' : ',DESC';
            this.params.sortBy = queryParams.sortBy;

            this.uri
                .updateURI(undefined, queryParams)
                .catch(error => {
                    console.error(error);
                });

            setTimeout(() => this.setPage(1));
        }
    }

    getTitle(item, headerGroupId, headerId) {
        let title;
        if (item?.[headerGroupId]?.[headerId]) {
            title = item[headerGroupId][headerId].tooltip ||
                item[headerGroupId][headerId].text;
        }
        if (title === undefined) {
            title = '';
        }
        return title;
    }
}
