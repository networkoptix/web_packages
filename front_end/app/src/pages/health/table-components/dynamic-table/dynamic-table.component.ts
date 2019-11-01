import {
    Component, Input, Output, EventEmitter,
    OnChanges, SimpleChanges,
    OnInit, ViewEncapsulation, Inject, PLATFORM_ID
}                                                         from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NxConfigService }                                from '../../../../services/nx-config';
import { NxUtilsService }                                 from '../../../../services/utils.service';
import { NxUriService }                                   from '../../../../services/uri.service';

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
    @Input('elements') _elements: any = [];
    @Input() params: any = {};
    @Input() activeEntity;

    @Output() public onRowClick: EventEmitter<any> = new EventEmitter<any>();

    CONFIG: any;

    elements: any = [];
    headers: any = {};
    queryParams;

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

    constructor(private configService: NxConfigService,
                private uri: NxUriService,
                private utilsService: NxUtilsService,
                private router: Router,
                private route: ActivatedRoute,
    ) {
        this.CONFIG = this.configService.getConfig();
        this._elements = this._elements || [];

        this.pagedItems = [];
        this.pagerMaxSize = this.CONFIG.ipvd.pagerMaxSize;
        this.currentPage = 1;
        this.pageSize = this.CONFIG.layout.tableLarge.rows;
    }

    ngOnChanges(changes: SimpleChanges) {
        let setPageNeeded = false;
        if (changes.activeEntity) {
            this.selectedEntity = changes.activeEntity.currentValue;
        }

        if (changes._headers) {
            console.log(changes._headers);
            this.headers = changes._headers.currentValue;
            this.selectedHeader = undefined;

            if (changes._headers.previousValue !== undefined &&
                    changes._headers.previousValue !== changes._headers.currentValue) {
                const queryParams: Params = {};
                queryParams.page = undefined;
                queryParams.sortBy = undefined;
                this.uri.updateURI(this.uri.getURL(), queryParams);
            }
        }
        if (changes._elements) {
            if (changes._elements.previousValue) {
                setPageNeeded = true;
            }
            this.elements = Object.values(changes._elements.currentValue);
      // For testing pagination
      // Array.from({length: 5}).forEach(_ => {
      //   this.elements.forEach(e => this.elements.push(e));
      // });
      // console.log(this.elements);
            this.sortOrderASC = true;
            this.selectedHeader = undefined;
            if (setPageNeeded) {
                this.setPage(1);
            }
        }
    }

    ngOnInit() {
        this.queryParams = this.route.snapshot.queryParams;
        if (this.queryParams.sortBy) {
            const sortBy = this.queryParams.sortBy.split(',');
            this.sortOrderASC = (sortBy[SORT_DIR] === 'ASC');
            this.selectedHeader = sortBy[PARAM_ID];

            this.toggleSort(sortBy[GROUP_ID], sortBy[PARAM_ID], false);
        } else {
            this.setPage(1);
        }
    }

    setClickedRow(element) {
        this.onRowClick.emit(element);
        this.selectedEntity = element;
    }

    setPage(page: number, keep?: boolean, entity?) {
        if (this.params && this.params.id && this.selectedEntity) {
            const index = this.elements.findIndex((element) => {
                return element.id === this.params.id;
            });
            if (index !== -1) {
                this.currentPage = Math.floor(index / this.pageSize) + 1;
            }
        } else if (this.queryParams && this.queryParams.page) { // this.params.page is string - no strict comparison
            this.currentPage = this.queryParams.page;
        } else {
            this.currentPage = page;
        }

        // preserve window offset
        // this.uri.pageOffset = window.pageYOffset;

        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        this.pagedItems = this.elements.slice(startIndex, endIndex);

        const paramPage = (this.currentPage === 1) ? undefined : this.currentPage;
        if (paramPage && !this.params.id) {
            const queryParams: Params = {};
            queryParams.page = (this.currentPage === 1) ? undefined : this.currentPage;
            this.uri.updateURI(this.uri.getURL(), queryParams);
        } else if (this.params.id) {
            this.params.id = undefined;
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

            this.uri.updateURI(this.uri.getURL(), queryParams);
        }

        const sortParam = (elm) => {
            return elm[groupId][paramId].text;
        };

        this.elements.sort(NxUtilsService.byParam(sortParam, this.sortOrderASC));
        this.sortOrderASC = !this.sortOrderASC;

        this.setPage(1);
    }
}
