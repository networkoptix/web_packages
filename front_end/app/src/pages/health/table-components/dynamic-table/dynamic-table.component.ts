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

    public selectedEntity;
    public selectedHeader;
    public showHeaders;

    private sortByColumn: any;
    private sortOrderASC: boolean;
    private debug: boolean;
    private beta: boolean;

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

    private setDebugAndBetaMode () {
        this.debug = (this.params.debug !== undefined);
        this.beta = (this.params.beta !== undefined);
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes._headers) {
            this.headers = changes._headers.currentValue;
            this.selectedHeader = undefined;

            if (changes._headers.previousValue !== undefined &&
                    changes._headers.previousValue !== changes._headers.currentValue) {
                this.uri.resetURI(this.uri.getURL());
            } else {
                this.uri
                    .getURI()
                    .subscribe((params) => {

                    });
            }
        }
        if (changes._elements) {
            this.elements = Object.values(changes._elements.currentValue);
            this.sortOrderASC = true;
            this.selectedHeader = undefined;
            this.setPage(1, true);
        }
        if (changes.activeEntity) {
            this.selectedEntity = changes.activeEntity.currentValue;
        }
    }

    ngOnInit() {
        this.setDebugAndBetaMode();

        const params = this.route.snapshot.queryParams;
        if (params.sortBy) {
            const sortBy = params.sortBy.split(',');
            this.sortOrderASC = (sortBy[SORT_DIR] === 'ASC');
            this.selectedHeader = sortBy[PARAM_ID];
            this.toggleSort(sortBy[GROUP_ID], sortBy[PARAM_ID], false);
        }
    }

    setClickedRow(element) {
        this.onRowClick.emit(element);
        this.selectedEntity = element;
    }

    setPage(page: number, keep?: boolean) {
        this.currentPage = page;

        const pageParam = (this.currentPage === 1) ? undefined : this.currentPage;
        // preserve window offset
        // this.uri.pageOffset = window.pageYOffset;

        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        this.pagedItems = this.elements.slice(startIndex, endIndex);

        if (this.params && this.params.page !== pageParam) { // this.params.page is string - no strict comparison
            const queryParams: Params = {};
            queryParams.page = (this.currentPage === 1) ? undefined : this.currentPage;

            // this.uri.updateURI('', queryParams);
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
