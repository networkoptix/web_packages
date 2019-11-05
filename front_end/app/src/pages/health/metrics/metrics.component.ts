import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute }                       from '@angular/router';

import { NxAccountService }          from '../../../services/account.service';
import { NxConfigService }                     from '../../../services/nx-config';
import { NxSystem, NxSystemService }           from '../../../services/system.service';
import { NxMenuService }                       from '../../../components/menu/menu.service';
import { combineLatest }                       from 'rxjs';
import { map, concatMap }                      from 'rxjs/operators';
import { NxHealthService }                     from '../health.service';
import { NxUriService }                        from '../../../services/uri.service';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { NxLanguageProviderService }           from '../../../services/nx-language-provider';

interface Params {
    [key: string]: any;
}

@Component({
    selector   : 'nx-system-metrics-component',
    templateUrl: 'metrics.component.html',
    styleUrls  : ['metrics.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class NxSystemMetricsComponent implements OnInit {
    CONFIG: any;
    LANG: any;
    account: any;

    filterModel: any;
    system: NxSystem;
    metricId: any;
    params: any  = {};
    mobileDetailMode: boolean;
    breakpoint: string;

    manifest: any;
    values: any;
    alarms: any;

    selectedData: any;
    selectedPanelData: any;
    selectedValues: any;

    menu: any;
    activeEntity: any;

    multiEntity = true;
    objectKeys = Object.keys;
    objectValues = Object.values;

    constructor(private accountService: NxAccountService,
                private configService: NxConfigService,
                private languageService: NxLanguageProviderService,
                private systemService: NxSystemService,
                private route: ActivatedRoute,
                private menuService: NxMenuService,
                private healthService: NxHealthService,
                private uri: NxUriService,
                private breakpointObserver: BreakpointObserver,
    ) {
        this.CONFIG = this.configService.getConfig();
        this.LANG  = this.languageService.getTranslations();
        this.breakpoint = '(max-width: 767px)';

        this.filterModel = {
            query: ''
        };
    }

    ngOnInit(): void {
        let idParam = this.route.snapshot.queryParamMap.get('id');
        const searchParam = this.route.snapshot.queryParamMap.get('search');

        this.route
            .params
            .subscribe((params: any) => {
                this.multiEntity = true;
                this.metricId = params.metric;
                this.menuService.setSection(this.metricId);
                this.selectedData = this.healthService.tableHeaders[this.metricId];
                this.selectedPanelData = this.healthService.panelParams[this.metricId];
                this.resetActiveEntity(false);

                if (!searchParam || !searchParam.length) {
                    this.selectedValues = this.healthService.values[this.metricId];
                    if (Object.keys(this.selectedValues).length === 1) {
                        this.multiEntity = false;
                    }
                }

                if (idParam) {
                    this.setActiveEntity(idParam);
                    this.params.id = idParam;
                    idParam = undefined;
                } else {
                    this.params.id = undefined;
                }
            });

        this.breakpointObserver
            .observe([this.breakpoint])
            .subscribe((state: BreakpointState) => {
                this.mobileDetailMode = (state.matches && this.activeEntity);
            });
    }

    modelChanged(model) {
        if (model.query !== this.filterModel.query) {
            this.filterModel.query = model.query;
            this.healthService
                .itemsSearch(this.healthService.values[this.metricId], this.filterModel)
                .subscribe((items) => {
                    this.selectedValues = items;
                    if (Object.keys(this.selectedValues).length === 1) {
                        this.multiEntity = false;
                    }
                });
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
    }

    resetActiveEntity(updateURI = true) {
        this.activeEntity = undefined;
        if (updateURI) {
            const queryParams: Params = {};
            queryParams.id = undefined;
            this.uri.updateURI(undefined, queryParams);
        }
        this.mobileDetailMode = false;
    }
}
