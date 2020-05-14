import {
    Component, Input, Output, EventEmitter,
    OnChanges, SimpleChanges,
    OnInit, ViewEncapsulation, Inject,
    PLATFORM_ID, OnDestroy, AfterViewInit,
    ElementRef, ViewChild, HostListener, Renderer2
}                                         from '@angular/core';
import { Router }                         from '@angular/router';
import {
    NxConfigService, IConfig,
    NxUriService, NxUtilsService,
    NxLanguageProviderService,
    NxScrollMechanicsService
}                                         from '../../../../services';
import { LanguageI18NStaticTypes }        from '../../../../../language_i18n_static_types';
import { Subscription, SubscriptionLike } from 'rxjs';
import { delay }                          from 'rxjs/operators';
import { AutoUnsubscribe }                from 'ngx-auto-unsubscribe';

interface Params {
    [key: string]: any;
}

@AutoUnsubscribe()
@Component({
    selector : 'nx-cam-table',
    templateUrl : './cam-table.component.html',
    styleUrls : ['./cam-table.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class CamTableComponent implements OnChanges, OnDestroy, OnInit, AfterViewInit {
    @Input() elements: any[];
    @Input() allowedParameters: string[];
    @Input() activeCamera;
    @Input() params: any = {};

    @Output() public onRowClick: EventEmitter<any> = new EventEmitter<any>();
    @Output() public onFeedbackClick: EventEmitter<any> = new EventEmitter<any>()

    public selectedHeader;
    public showHeaders;

    private _elements: any[];
    private selectedCamera;
    private sortOrderASC: boolean;
    private results;
    private cameraHeaders;
    private paramsShown;
    private debug: boolean;
    private beta: boolean;

    offset: number;
    currentPage: number;
    pageSize: number;
    totalItems: number;
    pager: any = {};
    pagedItems: any[];
    pagerMaxSize: number;
    pagerEllipses: boolean;
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    showAnalytics: boolean;
    serviceParams;
    serviceHeaders;

    windowSize: any = {};
    windowScroll;
    clientHeight: number;
    searchHeight: number;
    offsetHeight: number;
    scrollHeight: number;
    tableScrollFixed: boolean;
    elementWidth;
    revert;
    timesElementSet = 0;

    uriSubscription: SubscriptionLike;
    searchViewHeightSubscription: SubscriptionLike;
    windowScrollSubscription: SubscriptionLike;
    elementTableWidthSubscription: SubscriptionLike;
    resizeSubscription: SubscriptionLike;

    // Options for the Excel export
    public csvFilename;
    public csvCameraData: any[];
    public csvOptions = {
        fieldSeparator  : ',',
        quoteStrings    : '"',
        decimalseparator: '.',
        showLabels      : true,
        headers         : ['Vendor', 'Model', 'Type', 'Max Resolution', 'Max FPS', 'Codec', 'Audio', '2-Way Audio', 'PTZ', 'Advanced PTZ', 'Fisheye', 'Motion', 'I/O'],
        showTitle       : true,
        title           : 'Camera List',
        useBom          : false,
        removeNewLines  : true
    };

    @ViewChild('nxScrollWrapper', { static: false }) scrollWrapper: ElementRef;
    @ViewChild('nxTable', { static: false }) camerasTable: ElementRef;

    constructor(configService: NxConfigService,
        language: NxLanguageProviderService,
                private router: Router,
                private uri: NxUriService,
                private scrollMechanicsService: NxScrollMechanicsService,
                private renderer: Renderer2,
                @Inject(PLATFORM_ID) private platformId: object) {
        this.LANG = language.translations;
        this.CONFIG = configService.getConfig();

        this.sortOrderASC = true;
        this._elements = this.elements;

        this.windowSize = {};
        this.windowScroll = 0;
        this.tableScrollFixed = false;

        this.serviceHeaders = [this.LANG.ipvd.count, this.LANG.ipvd.resolutionArea];
        this.serviceParams = ['count', 'resolutionArea'];
        this.paramsShown = 6;
        this.cameraHeaders = [
            this.LANG.ipvd.vendor,
            this.LANG.ipvd.model,
            this.LANG.ipvd.hardwareType,
            this.LANG.ipvd.maxResolution,
            this.LANG.ipvd.maxFps,
            this.LANG.ipvd.primaryCodec,
            this.LANG.ipvd.isAudioSupported,
            this.LANG.ipvd.isPtzSupported,
            this.LANG.ipvd.isFisheye,
            this.LANG.ipvd.isMdSupported,
            this.LANG.ipvd.isIoSupported,
            this.LANG.ipvd.isAnalyticsSupported,
            this.LANG.ipvd.count,
            this.LANG.ipvd.resolutionArea
        ];

        this.elementWidth = '100%';
        this.pagedItems = [];
        this.pagerMaxSize = this.CONFIG.ipvd.pagerMaxSize;
        this.currentPage = 1;
        this.pageSize = this.CONFIG.layout.tableLarge.rows;

        this.uriSubscription = new Subscription();

        this.resizeSubscription = this.scrollMechanicsService.windowSizeSubject.subscribe(() => {
            this.setPagerSize();
        });
    }

    ngOnInit() {
        this.setDebugAndBetaMode();

        this.results = this._elements.length;
        this.csvFilename = Date.now();
        this.csvCameraData = this.getCsvData();

        this.showAnalytics = this.CONFIG.ipvd.showAnalyticsEvents || this.debug || this.beta;
        if (!this.showAnalytics) {
            this.filterAllowedParams([this.LANG.ipvd.isAnalyticsSupported], ['isAnalyticsSupported']);
        }

        this.uriSubscription = this.uri
            .getURI()
            .subscribe(params => {
                this.params = params;
                this.setDebugAndBetaMode();

                if (!this.params.debug && !this.params.beta) {
                    this.filterAllowedParams(this.serviceHeaders, this.serviceParams);
                }

                this.showAnalytics = this.CONFIG.ipvd.showAnalyticsEvents || this.params.debug || this.params.beta;
                this.showHeaders = this.cameraHeaders;

                if (this.params.sortBy) {
                    const sortBy    = this.params.sortBy.split(',');
                    const direction = (sortBy[1] === 'ASC');
                    const column    = this.cameraHeaders.find(x => {
                        return x === this.LANG.ipvd[sortBy[0]];
                    });

                    if (this.sortOrderASC === direction && column === this.selectedHeader) {
                        return; // do not sort if sorted
                    }

                    this.sortOrderASC = direction;
                    this.toggleSort(sortBy[0], true);
                }

                this.setPage(this.params.page || 1, true);

                if (this.params.camera) {
                    const row = this.pagedItems.findIndex((camera) => {
                        return camera.model === this.params.camera;
                    });

                    const camera = this.pagedItems.find((camera) => {
                        return camera.model === this.params.camera;
                    });

                    this.setClickedRow(camera);
                }
            });
    }

    ngAfterViewInit(): void {
        this.calcElementScrollMechanics();

        this.windowScrollSubscription = this.scrollMechanicsService
            .windowScrollSubject
            .subscribe(() => {
                this.calcElementScrollMechanics();
            });

        this.elementTableWidthSubscription = this.scrollMechanicsService
            .elementTableWidthSubject
            .subscribe(() => {
                const width       = this.scrollMechanicsService.elementTableWidth;
                this.elementWidth = (width > 0) ? width + 'px' : '100%';
            });

        this.searchViewHeightSubscription = this.scrollMechanicsService
            .searchViewHeightSubject.pipe(delay(0))
            .subscribe(() => {
                this.scrollHeight = this.scrollMechanicsService.searchViewHeightSubject.getValue() + NxScrollMechanicsService.HEADER_OFFSET;
            });
    }

    ngOnDestroy() {}

    ngOnChanges(changes: SimpleChanges) {
        if (changes.elements) {
            this.sortOrderASC = !this.CONFIG.ipvd.sortSupportedDevicesByPopularity;
            this._elements = changes.elements.currentValue;
            this.results = this._elements.length;

            this.sortElements(true /* keep uri params */);
            this.csvCameraData = this.getCsvData();

            this.setPage(this.currentPage, true);
            ++this.timesElementSet;
        }

        if (changes.activeCamera) {
            if (!changes.activeCamera.currentValue) {
                this.selectedCamera = undefined;
            } else {
                this.selectedCamera = changes.activeCamera.currentValue.sortKey;
            }

            this.setPagerSize();
        }
    }

    private setPagerSize() {
        if (this.scrollMechanicsService.mediaQueryMax(NxScrollMechanicsService.MEDIA.md) ||
            (this.scrollMechanicsService.mediaQueryMax(NxScrollMechanicsService.MEDIA.xl) && this.selectedCamera)) {
            this.pagerMaxSize  = this.CONFIG.ipvd.pagerMaxSizeMedium;
            this.pagerEllipses = false;
        } else {
            this.pagerMaxSize  = this.CONFIG.ipvd.pagerMaxSize;
            this.pagerEllipses = true;
        }
    }

    trackPagedItem(index, item) {
        return item ? item.sortKey : undefined;
    }

    toggleHeaderSort(param) {
        let filter;
        for (const [key, value] of Object.entries(this.LANG.ipvd)) {
            if (value === param) {
                filter = key;
                break;
            }
        }

        this.sortOrderASC = (this.LANG.ipvd[filter] === this.selectedHeader) ? !this.sortOrderASC : true;
        this.toggleSort(filter, false /* reset camera and page params in uri */);

        const queryParams: Params = {};

        queryParams.page = undefined;
        queryParams.sortBy = filter;
        queryParams.sortBy += (this.sortOrderASC) ? ',ASC' : ',DESC';

        this.uri
            .updateURI('/ipvd', queryParams)
            .catch(error => {
                console.error(error);
            });
    }

    toggleSort(param, keepURI) {
        let byParam;

        if (param === 'maxResolution' ||
                param === 'maxFps' ||
                param === 'isAnalyticsSupported' ||
                param === 'count') {
            byParam = NxUtilsService.byParam((elm) => {
                if (param === 'maxResolution') {
                    return elm.resolutionArea;
                } else {
                    return elm[param];
                }
            }, !this.sortOrderASC);
        } else if (param === 'isFisheye' ||
                param === 'isMdSupported' ||
                param === 'isIoSupported') {
            byParam = NxUtilsService.byParam((elm) => {
                if (elm[param]) {
                    return 0;
                }
                if (!elm[param]) {
                    return 2;
                }
                if (elm[param] === null) {
                    return 3;
                }
            }, this.sortOrderASC);
        } else if (param === 'isPtzSupported') {
            byParam = NxUtilsService.byParam((elm) => {
                if (elm.isAptzSupported) {
                    return 0;
                }
                if (elm.isPtzSupported) {
                    return 1;
                }
                if (!elm.isPtzSupported) {
                    return 2;
                }
                if (elm.isPtzSupported === null) {
                    return 3;
                }
            }, this.sortOrderASC);
        } else if (param === 'isAudioSupported') {
            byParam = NxUtilsService.byParam((elm) => {
                if (elm.isAudioSupported === null) {
                    return 3;
                }
                if (!elm.isAudioSupported) {
                    return 2;
                }
                if (elm.isTwAudioSupported) {
                    return 0;
                }
                if (elm.isAudioSupported) {
                    return 1;
                }
            }, this.sortOrderASC);
        } else {
            byParam = NxUtilsService.byParam((elm) => {
                return (typeof elm[param] === 'string') ? elm[param].toLowerCase() : elm[param];
            }, this.sortOrderASC);
        }

        this._elements.sort(byParam);

        if (!keepURI) {
            this.setPage(1, keepURI);
        }

        this.selectedHeader = this.cameraHeaders.find(x => {
            return x === this.LANG.ipvd[param];
        });
    }

    filterAllowedParams(arrHeaders, arrParams) {
        // filter 'service' params
        this.allowedParameters = this.allowedParameters.filter((el) => {
            return !arrParams.includes(el);
        });
        this.cameraHeaders = this.cameraHeaders.filter((el) => {
            return !arrHeaders.includes(el);
        });
        this.showHeaders = this.cameraHeaders;
    }

    showParametersFor(item) {
        const showParameters = [...this.allowedParameters];
        // adjust PTZ and Audio params
        let idxToBeRemoved;
        let param;

        param = (item.isAptzSupported) ? 'isPtzSupported' : 'isAptzSupported';
        idxToBeRemoved = showParameters.indexOf(param);
        showParameters.splice(idxToBeRemoved, 1);

        param = (item.isTwAudioSupported) ? 'isAudioSupported' : 'isTwAudioSupported';
        idxToBeRemoved = showParameters.indexOf(param);
        showParameters.splice(idxToBeRemoved, 1);

        return showParameters;
    }

    calcElementScrollMechanics() {
        this.windowSize = this.scrollMechanicsService.windowSizeSubject.getValue();
        this.windowScroll = this.scrollMechanicsService.windowScroll;

        this.clientHeight = this.camerasTable.nativeElement.clientHeight;
        this.searchHeight = this.scrollMechanicsService.searchViewHeight;

        if (this.clientHeight + this.searchHeight < this.windowSize.height && this.windowScroll >= this.scrollHeight - NxScrollMechanicsService.SCROLL_OFFSET) {
            this.tableScrollFixed = true;
        } else {
            this.tableScrollFixed = false;
        }
    }

    setClickedRow(element) {
        if (element) {
            this.uri.pageOffset = window.pageYOffset;
            this.selectedCamera = element.sortKey;
            this.onRowClick.emit(element);
        } else {
            this.selectedCamera = undefined;
        }

        this.setPagerSize();
    }

    setPage(page: number, keep?: boolean) {
        this.currentPage = page;

        const pageParam = (this.currentPage === 1) ? undefined : this.currentPage;
        // preserve window offset
        this.uri.pageOffset = window.pageYOffset;

        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        this.pagedItems = this._elements.slice(startIndex, endIndex);

        if (this.params && this.params.page != pageParam) { // this.params.page is string - no strict comparison
            const queryParams: Params = {};
            queryParams.page = (this.currentPage === 1) ? undefined : this.currentPage;

            this.uri
                .updateURI('/ipvd', queryParams)
                .catch(error => {
                    console.error(error);
                });
        }
    }

    getCsvData() {
        return this._elements.map(camera => ({
            Vendor           : camera.vendor,
            Model            : camera.model,
            Type             : camera.hardwareType,
            'Max Resolution' : camera.maxResolution,
            'Max FPS'        : camera.maxFps,
            Codec            : camera.primaryCodec,
            Audio            : NxUtilsService.yesNo(camera.isAudioSupported),
            '2-Way Audio'    : NxUtilsService.yesNo(camera.isTwAudioSupported),
            PTZ              : NxUtilsService.yesNo(camera.isPtzSupported),
            'Advanced PTZ'   : NxUtilsService.yesNo(camera.isAptzSupported),
            Fisheye          : NxUtilsService.yesNo(camera.isFisheye),
            Motion           : NxUtilsService.yesNo(camera.isMdSupported),
            'I/O'            : NxUtilsService.yesNo(camera.isIoSupported)
        })
        );
    }

    getCleanTitle(text: string): string {
        return text.replace(/\<br\>/g, ' ')
            .replace(/\<\/?span\>/g, '');
    }

    isBoolean(x: any): boolean {
        return !(typeof x === 'string' || typeof x === 'number');
    }

    // Element with position 'fixed' is loosing the focus when page bottom is reached and cursor is moved (not 'mousewheel')
    // this ensures scroll wrapper will get the event... but content is not clickable during scroll. -- TT
    @HostListener('mousewheel', ['$event'])
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

    private sortElements(keepURI) {
        let sortByColumn;
        if (this.params.sortBy) {
            const sortBy      = this.params.sortBy.split(',');
            this.sortOrderASC = (sortBy[1] === 'ASC');
            sortByColumn = sortBy[0];
        } else {
            // If sort by popularity is set in CMS or default sorting 'Vendor-Model'
            sortByColumn = (this.CONFIG.ipvd.sortSupportedDevicesByPopularity) ? 'count' : 'sortKey';
        }

        this.toggleSort(sortByColumn, keepURI);

        let pageNum;
        if (this.params && this.params.page) {
            pageNum = +this.params.page;
        } else {
            pageNum = 1;
        }

        this.setPage(pageNum, true);
    }

    private setDebugAndBetaMode() {
        this.debug = (this.params.debug !== undefined);
        this.beta = (this.params.beta !== undefined);
    }
}
