import {
    Component, Input, Output, EventEmitter,
    OnChanges, SimpleChanges,
    OnInit, ViewEncapsulation
}                                 from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NxConfigService }        from '../../../../services/nx-config';
import { NxUtilsService }         from '../../../../services/utils.service';
import { NxUriService }           from '../../../../services/uri.service';
import deepEqual = require('deep-equal');
import { SubscriptionLike }       from 'rxjs';

interface Params {
    [key: string]: any;
}

const GROUP_ID = 0;
const PARAM_ID = 1;
const SORT_DIR = 2;

@Component({
    selector     : 'nx-dynamic-table',
    templateUrl  : './dynamic-table.component.html',
    styleUrls    : ['./dynamic-table.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class NxDynamicTableComponent implements OnChanges, OnInit {
    @Input('tableHeader') tableHeader = '';
    @Input('headers') _headers: any = [];
    @Input('elements') elements: any = [];
    @Input() activeEntity;

    @Output() public onRowClick: EventEmitter<any> = new EventEmitter<any>();

    CONFIG: any;

    _elements: any = [];
    headers: any = {};
    queryParams;
    params: any = {};

    public selectedEntity;
    public selectedHeader;
    public showHeaders;

    private sortOrderASC: boolean;

    offset: number;
    currentPage: number;
    pageSize: number;
    totalItems: number;
    pager: any = {};
    pagedItems: any[];
    pagerMaxSize: number;
    serviceParams;
    serviceHeaders;

    uriSubscription: SubscriptionLike;

    constructor(private configService: NxConfigService,
                private uri: NxUriService,
                private utilsService: NxUtilsService,
                private router: Router,
                private route: ActivatedRoute,
    ) {
        this.CONFIG = this.configService.getConfig();
        this.elements = this.elements || [];

        this.pagedItems = [];
        this.pagerMaxSize = this.CONFIG.ipvd.pagerMaxSize;
        this.currentPage = 1;
        this.pageSize = this.CONFIG.layout.tableLarge.rows;
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.activeEntity) {
            this.selectedEntity = changes.activeEntity.currentValue;
        }

        if (changes._headers) {
            this.headers = changes._headers.currentValue;
            this.selectedHeader = undefined;

            if (changes._headers.previousValue !== undefined &&
                    changes._headers.previousValue !== changes._headers.currentValue) {
                const queryParams: Params = {};
                queryParams.page = undefined;
                queryParams.sortBy = undefined;
                this.uri.updateURI(undefined, queryParams);
            }
        }

        if (changes.elements) {
            if (!deepEqual(changes.elements.currentValue, changes.elements.previousValue)) {
                this._elements = Object.values(changes.elements.currentValue);
                this.setPage(this.currentPage);
            }
        }
    }

    ngOnInit() {
        this.uriSubscription = this.uri
            .getURI()
            .subscribe(params => {
debugger;
                if (this.params.sortBy !== params.sortBy) {
                    if (params.sortBy) {
                        this.sortBy(params.sortBy);
                        this.setPagedItems();
                    } else {
                        this.sortOrderASC = true;
                        this.selectedHeader = undefined;
                    }
                }

                if (this.params.page !== params.page) {
                    this.currentPage = params.page || 1;
                }

                this.params = {...params};

            });
    }

    ngOnDestroy() {
        this.uriSubscription.unsubscribe();
    }

    sortBy(param) {
        const sortBy = param.split(',');
        this.sortOrderASC = (sortBy[SORT_DIR] === 'ASC');
        this.selectedHeader = sortBy[PARAM_ID];

        this.toggleSort(sortBy[GROUP_ID], sortBy[PARAM_ID], false);
    }

    setClickedRow(element) {
        this.onRowClick.emit(element);
        this.selectedEntity = element;
    }

    setPagedItems() {
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        this.pagedItems = this._elements.slice(startIndex, endIndex);
    }

    setPage(page: number) {
        if (this.params && this.params.id && this.selectedEntity) {
            const index = this._elements.findIndex((element) => {
                return element.id === this.params.id;
            });
            if (index !== -1) {
                this.currentPage = Math.floor(index / this.pageSize) + 1;
            }
            this.params.id = undefined;
        } else if (this.queryParams && this.queryParams.page) {
            this.currentPage = this.queryParams.page;
            this.queryParams.page = undefined;
        } else {
            this.currentPage = page;
        }

        const pageParam = (this.currentPage === 1) ? undefined : this.currentPage;
        // preserve window offset
        this.uri.pageOffset = window.pageYOffset;
        this.setPagedItems();

        if (this.params && this.params.page != pageParam) { // this.params.page is string - no strict comparison
            const queryParams: Params = {};
            queryParams.page = (this.currentPage === 1) ? undefined : this.currentPage;

            this.uri.updateURI(this.uri.getURL(), queryParams);
        }
    }

    getCleanTitle(text: string): string {
        return text.replace(/\<br\>/g, ' ')
                   .replace(/\<\/?span\>/g, '');
    }

    isBoolean(x: any): boolean {
        return !(typeof x === 'string' || typeof x === 'number');
    }

    toggleSort(groupId, paramId, updateURI?) {
        if (this.selectedHeader !== paramId) {
            this.sortOrderASC = true;
        }
        this.selectedHeader = paramId;

        if (updateURI || updateURI === undefined) {
            const queryParams: Params = {};

            queryParams.page = undefined;
            queryParams.sortBy = groupId + ',' + paramId;
            queryParams.sortBy += (this.sortOrderASC) ? ',ASC' : ',DESC';
            this.params.sortBy = queryParams.sortBy;
            this.uri.updateURI(undefined, queryParams);
        }

        const sortParam = (elm) => {
            try {
                return elm[groupId][paramId].text;
            } catch (e) {
            }
        };

        this._elements.sort(NxUtilsService.byParam(sortParam, this.sortOrderASC));
        this.sortOrderASC = !this.sortOrderASC;

        if (updateURI || updateURI === undefined) {
            setTimeout(() => this.setPage(1));
        }
    }
}
