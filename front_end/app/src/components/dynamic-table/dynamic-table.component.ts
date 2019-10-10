import {
    Component, Input, Output, EventEmitter,
    OnChanges, SimpleChanges,
    OnInit, ViewEncapsulation, Inject, PLATFORM_ID
} from '@angular/core';
import { Router }                    from '@angular/router';
import { NxConfigService } from '../../services/nx-config';
import { NxUtilsService } from '../../services/utils.service';

interface Params {
    [key: string]: any;
}

@Component({
    selector     : 'nx-dynamic-table',
    templateUrl  : './dynamic-table.component.html',
    styleUrls    : ['./dynamic-table.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class NxDynamicTableComponent implements OnChanges, OnInit {
    @Input('headers') _headers: any[any];
    @Input('elements') _elements: any[any];
    @Input() params: any = {};

    @Output() public onRowClick: EventEmitter<any> = new EventEmitter<any>();

    CONFIG: any;

    elements: any = [];
    headers: any = {};

    elementOrder: any[];

    public selectedHeader;
    public showHeaders;

    private selectedCamera;
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
                private router: Router) {

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
        if (this._headers) {
            this.headers = {};
            // Only include headers that have 'table' in display
            this._headers.forEach((headerGroup) => {
                this.headers[headerGroup.id] = headerGroup.values.filter((header) => {
                    return header.display.includes('table');
                });
            });
        }
        if (this._elements) {
            this.elements = [];
            // const elements = Object.values({...this._elements});
            // Array.from({length: 5}).forEach(_ => {
            //     elements.forEach(e => elements.push(e));
            // });

            this.elements = Object.values({...this._elements}).map((entity: any) => {
                let element = [];
                Object.keys(this.headers).forEach((headerGroup) => {
                    element = element.concat(
                        this.headers[headerGroup].map((header) => {
                            return entity[headerGroup][header.id];
                        })
                    );
                });
                return element;
            });
            console.log(`Number of cameras: ${this.elements.length}`);
            this.setPage(1, true);
        }
    }

    public keepOriginalOrder = (a, b) => a.key;

    ngOnInit() {
        this.setDebugAndBetaMode();
    }

    setClickedRow(element) {
        // console.log(element);
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

    toggleHeaderSort(param) {
        const column = this.headers.findIndex((header) => header.id === param.id);
        const getElement = element => element[column];
        this.elements.sort(NxUtilsService.byParam(getElement, true));
        // this.elements.sort((a, b) => {
        //     return a[column] < b[column] ? -1 : 1;
        // });
        this.setPage(1);
    }
}
