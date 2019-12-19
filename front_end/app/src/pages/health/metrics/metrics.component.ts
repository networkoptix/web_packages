import {
    AfterViewInit,
    Component,
    ContentChild,
    ElementRef,
    OnInit,
    ViewChild,
    ViewEncapsulation
} from '@angular/core';
import { ActivatedRoute }                                                             from '@angular/router';

import { NxAccountService }                    from '../../../services/account.service';
import { NxConfigService }                     from '../../../services/nx-config';
import { NxSystem, NxSystemService }           from '../../../services/system.service';
import { NxMenuService }                       from '../../../components/menu/menu.service';
import { NxHealthService }                     from '../health.service';
import { NxUriService }                        from '../../../services/uri.service';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { NxLanguageProviderService }           from '../../../services/nx-language-provider';
import { SubscriptionLike }                    from 'rxjs';
import { AutoUnsubscribe } from 'ngx-auto-unsubscribe';
import { NxScrollMechanicsService } from "../../../services/scroll-mechanics.service";

interface Params {
    [key: string]: any;
}

@AutoUnsubscribe()
@Component({
    selector   : 'nx-system-metrics-component',
    templateUrl: 'metrics.component.html',
    styleUrls  : ['metrics.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class NxSystemMetricsComponent implements OnInit, AfterViewInit {
    CONFIG: any;
    LANG: any;
    account: any;

    filterModel: any;
    system: NxSystem;
    metricId: any;
    initialId: any;

    mobileDetailMode: boolean;
    breakpoint: string;

    manifest: any;
    values: any;
    alarms: any;

    metricValuesLen: number;

    selectedData: any;
    selectedPanelData: any;
    selectedValues: any;

    menu: any;
    activeEntity: any;
    metricName: string;

    objectValues = Object.values;

    routeSubscription: SubscriptionLike;
    breakpointSubscription: SubscriptionLike;

    elementTilesHeight: number;
    elementSearchHeight: number;
    elementTableHeight: number;
    containerDimensions: any = [];

    tableWidthSubscription: SubscriptionLike;
    windowSizeSubscription: SubscriptionLike;

    fixedLayoutClass: string;

    @ViewChild('search', { static: false }) elementSearch: ElementRef;
    @ViewChild('viewContainer', { static: false }) viewContainer: ElementRef;
    @ViewChild('tableContainer', { static: false }) tableContainer: ElementRef;

    constructor(private accountService: NxAccountService,
                private configService: NxConfigService,
                private languageService: NxLanguageProviderService,
                private systemService: NxSystemService,
                private route: ActivatedRoute,
                private menuService: NxMenuService,
                private healthService: NxHealthService,
                private uri: NxUriService,
                private breakpointObserver: BreakpointObserver,
                private scrollMechanicsService: NxScrollMechanicsService,
    ) {
        this.CONFIG = this.configService.getConfig();
        this.LANG  = this.languageService.getTranslations();
        this.breakpoint = '(max-width: 767px)';
        this.containerDimensions = [];

        this.filterModel = {
            query: ''
        };

        // Breadcrumbs for making search bar same width as dynamic table
        // this.tableWidthSubscription = this.scrollMechanicsService
        //         .elementTableWidthSubject
        //         .subscribe(() => {
        //             setTimeout(() => {
        //                 this.elementSearch.nativeElement.style.width = this.scrollMechanicsService.elementTableWidthSubject.getValue() + 'px';
        //             });
        //         });
        // ***************************************************************
    }

    ngOnInit(): void {
        this.initialId = this.route.snapshot.queryParamMap.get('id');
        let searchParam = this.route.snapshot.queryParamMap.get('search');

        this.routeSubscription = this.route
            .params
            .subscribe((params: any) => {
                this.metricId = params.metric;
                this.metricName = this.healthService.manifest[this.metricId].name;
                this.menuService.setSection(this.metricId);
                this.selectedData = this.healthService.tableHeaders[this.metricId];
                this.selectedPanelData = this.healthService.panelParams[this.metricId];
                this.metricValuesLen = this.metricId in this.healthService.values ? Object.values(this.healthService.values[this.metricId]).length : 0;
                this.resetActiveEntity(false);

                if (!searchParam || !searchParam.length) {
                    this.filterModel.query = '';
                    this.selectedValues = this.healthService.values[this.metricId] || {};
                    this.handleInitialId();
                } else {
                    this.filterModel.query = searchParam;
                    searchParam = undefined;
                    this.search();
                }
            });

        this.windowSizeSubscription = this.scrollMechanicsService.windowSizeSubject.subscribe(({ width }) => {
            this.setLayout();
        });

        this.breakpointSubscription = this.breakpointObserver
            .observe([this.breakpoint])
            .subscribe((state: BreakpointState) => {
                this.mobileDetailMode = (state.matches && this.activeEntity);
            });
    }

    ngAfterViewInit() {
        this.setLayout();
        if (this.elementSearch) {
            this.elementSearchHeight = this.elementSearch.nativeElement.offsetHeight;

            setTimeout(() => this.containerDimensions = [this.elementSearchHeight + 16]);
        }
    }

    ngOnDestroy() {}

    handleInitialId() {
        if (this.initialId) {
            this.setActiveEntity(this.initialId);
            this.initialId = undefined;
        }
    }

    modelChanged(model) {
        this.filterModel.query = model.query;
        this.search();
    }

    search() {
        this.selectedValues = this.healthService
                                  .itemsSearch(this.healthService.values[this.metricId], this.filterModel) || {};

        this.handleInitialId();
        if (this.activeEntity && !this.selectedValues[this.activeEntity.id]) {
            this.resetActiveEntity();
        }
    }

    setActiveEntity(entity) {
        const queryParams: Params = {};
        if (typeof entity === 'string') {
            this.activeEntity = this.selectedValues[entity];
            if (!this.activeEntity) {
                queryParams.id = undefined;
                this.uri.updateURI(undefined, queryParams);
            }
        } else {
            this.activeEntity = entity;
            queryParams.id = entity.id;
            this.uri.updateURI(undefined, queryParams);

            if (this.breakpointObserver.isMatched(this.breakpoint)) {
                this.mobileDetailMode = true;
            }
        }

        this.setLayout();

        // setTimeout(() => {
        //     this.scrollMechanicsService.setElementViewWidth(this.viewContainer.nativeElement.clientWidth);
        //     this.scrollMechanicsService.setElementTableWidth(this.tableContainer.nativeElement.clientWidth - 8/* -gutter */);
        // });
    }

    resetActiveEntity(updateURI = true) {
        this.activeEntity = undefined;
        if (updateURI) {
            const queryParams: Params = {};
            queryParams.id = undefined;
            this.uri.updateURI(undefined, queryParams);
        }
        this.mobileDetailMode = false;
        setTimeout(() => this.setLayout());
    }

    private setLayout() {
        if (this.metricValuesLen === 1) {
            this.fixedLayoutClass = 'fixedLayout--no-panel';
        } else {
            if (this.tableContainer) {
                // measure table (not wrapper) width
                const tableWidth = this.tableContainer.nativeElement.querySelectorAll('table')[0].offsetWidth;
                let windowWidth = this.scrollMechanicsService.windowSizeSubject.getValue().width;
                // Table occupy 50% of the screen (20% menu and 30% right panel)
                windowWidth /= 2;
                windowWidth += 4 * 16; // four gutters for both grids

                const isTableFit = (windowWidth > tableWidth);
                if (this.activeEntity) {
                    this.fixedLayoutClass = (isTableFit) ? '' : 'fixedLayout--with-panel';
                } else {
                    this.fixedLayoutClass = (isTableFit) ? '' : 'fixedLayout--no-panel';
                }
            }
        }
    }
}
