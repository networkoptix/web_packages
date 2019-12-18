import deepEqual = require('deep-equal');
import {
    Component, Input, Output,
    EventEmitter, OnChanges, SimpleChanges,
    OnInit, ViewEncapsulation,
    ViewChild, ElementRef, AfterViewInit, HostListener, Renderer2,
} from '@angular/core';
import { ActivatedRoute, Router }   from '@angular/router';
import { NxConfigService }          from '../../../../services/nx-config';
import { NxUtilsService }           from '../../../../services/utils.service';
import { NxUriService }             from '../../../../services/uri.service';
import { NxHealthService }          from '../../health.service';
import { NxScrollMechanicsService } from '../../../../services/scroll-mechanics.service';

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
export class NxDynamicTableComponent implements OnChanges, OnInit, AfterViewInit {
    @Input() tableHeader = '';
    @Input() headers: any = [];
    @Input() elements: any = [];
    @Input() dimensions;
    @Input() activeEntity;
    @Input() showGroups = true;

    @Output() public onRowClick: EventEmitter<any> = new EventEmitter<any>();

    CONFIG: any;

    _elements: any = [];
    _headers: any = {};
    params: any = {};

    public selectedEntity;
    public selectedGroup;
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

    windowSize: any = {};
    windowScroll: any;
    clientHeight: number;
    offsetHeight: number;
    scrollHeight: number;
    tableScrollFixed: boolean;
    elementWidth: any;
    revert: any;

    @ViewChild('thead', { static: false }) thead: ElementRef;
    @ViewChild('tableHeaderElement', { static: false }) tableHeaderElement: ElementRef;
    @ViewChild('nxTable', { static: false }) camerasTable: ElementRef;
    @ViewChild('nxScrollWrapper', { static: false }) scrollWrapper: ElementRef;
    // CSS does not use CONFIG so this is here to avoid confusion if changing the value
    private static ROW_HEIGHT = 26;

    constructor(private configService: NxConfigService,
                private uri: NxUriService,
                private utilsService: NxUtilsService,
                private router: Router,
                private route: ActivatedRoute,
                private healthService: NxHealthService,
                private scrollMechanicsService: NxScrollMechanicsService,
                private renderer: Renderer2,
    ) {
        this.CONFIG = this.configService.getConfig();
        this.elements = this.elements || [];

        this.pagedItems = [];
        this.pagerMaxSize = this.CONFIG.ipvd.pagerMaxSize;
        this.currentPage = 1;
        this.pageSize = this.CONFIG.layout.tableLarge.rows;
    }

    trackItem(index, item) {
        if (!item) {
            return undefined;
        }
        return item.id;
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.dimensions && !changes.dimensions.firstChange && changes.dimensions.currentValue.length) {
            this.setTableDimensions();
        }

        if (changes.activeEntity) {
            this.selectedEntity = changes.activeEntity.currentValue;
            if (!this.selectedEntity) {
                this.scrollMechanicsService.setElementTableWidth(0);
            }
        }

        if (changes.headers) {
            this._headers = changes.headers.currentValue;
            this.selectedHeader = undefined;

            if (changes.headers.previousValue !== undefined &&
                    changes.headers.previousValue !== changes.headers.currentValue) {
                const queryParams: Params = {};
                queryParams.page = undefined;
                queryParams.sortBy = undefined;
                this.uri.updateURI(undefined, queryParams);
            }
        }

        if (changes.elements) {
            if (!deepEqual(changes.elements.currentValue, changes.elements.previousValue)) {
                this._elements = Object.values(changes.elements.currentValue);
                this.setPage(1);

                setTimeout(() => {
                    const queryParams: Params = {};
                    queryParams.sortBy = undefined;
                    queryParams.page = undefined;
                    this.uri
                        .updateURI(undefined, queryParams)
                        .then(() => {
                            this.sortOrderASC = true;
                            this.selectedHeader = undefined;
                        });
                });
            }
        }
    }

    private setTableDimensions() {
        debugger;

        this.windowSize = this.scrollMechanicsService.windowSizeSubject.getValue();

        const table = this.camerasTable.nativeElement;
        const ELEMENTS_HEIGHT = this.dimensions.reduce((prev, curr) => prev + curr, 0);
        const THEAD_HEIGHT = this.thead.nativeElement.offsetHeight;
        const PADDING = 16;
        const PAGINATION_HEIGHT = 64;
        let availSpace = this.windowSize.height - PAGINATION_HEIGHT - ELEMENTS_HEIGHT - 4 * PADDING - THEAD_HEIGHT - 48;

        if (this.tableHeader) {
            availSpace -= this.tableHeaderElement.nativeElement.offsetHeight;
        }

        this.pageSize = Math.ceil(availSpace / NxDynamicTableComponent.ROW_HEIGHT);
        if (this.pageSize < 5) {
            this.pageSize = 5;
        }

        this.setPagedItems();
    }

    ngOnInit() {
        this.params = {...this.route.snapshot.queryParams};
        if (this.params.sortBy) {
            this.sortBy(this.params.sortBy);
        } else {
            this.sortOrderASC = true;
            this.selectedGroup = undefined;
            this.selectedHeader = undefined;
        }

        this.setPage(this.params.page || 1);
    }

    ngAfterViewInit(): void {
        // if (this.dimensions.length) {
            this.setTableDimensions();
        // }

        // this.calcElementScrollMechanics();

        // this.scrollMechanicsService
        //         .windowScrollSubject
        //         .subscribe(() => {
        //             this.calcElementScrollMechanics();
        //         });

        // this.scrollMechanicsService
        //         .elementTableWidthSubject
        //         .subscribe(() => {
        //             const width = this.scrollMechanicsService.elementTableWidthSubject.getValue();
        //             this.elementWidth = (width > 0) ? width + 'px' : 'auto';
        //             if (this.activeEntity && width > 0) {
        //                 this.elementWidth = width + 8 /*gutter*/ + 'px';
        //             }
        //         });

        // this.scrollMechanicsService
        //         .offsetSubject
        //         .subscribe(() => {
        //             setTimeout(() => this.scrollHeight = this.scrollMechanicsService.getElementOffset(this.camerasTable.nativeElement));
        //         });
    }

    // calcElementScrollMechanics() {
    //     this.windowSize = this.scrollMechanicsService.windowSizeSubject.getValue();
    //     this.windowScroll = this.scrollMechanicsService.windowScrollSubject.getValue();
    //
    //     this.clientHeight = this.camerasTable.nativeElement.clientHeight;
    //
    //     if (this.clientHeight < this.windowSize.height && this.windowScroll >= this.scrollHeight - NxScrollMechanicsService.SCROLL_OFFSET) {
    //         this.tableScrollFixed = true;
    //     } else {
    //         this.tableScrollFixed = false;
    //     }
    // }

    ngOnDestroy() {
    }

    sortBy(param) {
        const sortBy = param.split(',');
        this.sortOrderASC = (sortBy[SORT_DIR] === 'ASC');
        this.selectedGroup = sortBy[GROUP_ID];
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
        // TODO: possible optimization - we may not need snapshot params here
        this.params = { ...this.route.snapshot.queryParams };
        this.currentPage = page;

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
        if (this.selectedGroup !== groupId || this.selectedHeader !== paramId) {
            this.sortOrderASC = true;
        }
        this.selectedGroup = groupId;
        this.selectedHeader = paramId;

        if (updateURI || updateURI === undefined) {
            const queryParams: Params = {};

            queryParams.page = undefined;
            queryParams.sortBy = groupId + ',' + paramId;
            queryParams.sortBy += (this.sortOrderASC) ? ',ASC' : ',DESC';
            this.params.sortBy = queryParams.sortBy;
            this.uri.updateURI(undefined, queryParams);
        }

        function sortFunc() {
            if (paramId === 'alarm') {
                return (elm) => {
                    return elm[groupId] && elm[groupId][paramId] && elm[groupId][paramId].icon || '';
                };
            } else {
                return (elm) => {
                    return elm[groupId] && elm[groupId][paramId] && elm[groupId][paramId].text || '';
                };
            }
        }

        this._elements.sort(NxUtilsService.byParam(sortFunc(), this.sortOrderASC));
        this.sortOrderASC = !this.sortOrderASC;

        if (updateURI || updateURI === undefined) {
            setTimeout(() => this.setPage(1));
        }
    }

    // Element with position 'fixed' is loosing the focus when page bottom is reached and cursor is moved (not 'mousewheel')
    // this ensures scroll wrapper will get the event... but content is not clickable during scroll. -- TT
    @HostListener("mousewheel", ["$event"])
    onMouseWheel(event) {
        if (this.tableScrollFixed) {
            this.renderer.setStyle(this.scrollWrapper.nativeElement, 'z-index', '-1');
            clearTimeout(this.revert);
            this.revert = setTimeout(() => {
                this.renderer.setStyle(this.scrollWrapper.nativeElement, 'z-index', '1');
                clearTimeout(this.revert);
            }, 100);
        }
    }
}
