import {
    Component,
    Input,
    Output,
    EventEmitter,
    OnChanges,
    SimpleChanges,
    OnInit,
    ViewEncapsulation,
    Inject,
    PLATFORM_ID,
    OnDestroy,
    AfterViewInit,
    ElementRef,
    ViewChild,
    HostListener,
    Renderer2
} from '@angular/core';
import { Router } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Subject, Subscription, SubscriptionLike } from 'rxjs';
import { debounceTime, delay } from 'rxjs/operators';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { NxUriService } from '@services/uri.service';
import { NxUtilsService } from '@services/utils.service';

interface Params {
    [key: string]: any;
}

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-cam-table',
    templateUrl: './cam-table.component.html',
    styleUrls: ['./cam-table.component.scss'],
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
    public selectedCamera;
    public sortOrderASC: boolean;
    public results;
    public debug: boolean;

    private _elements: any[];
    private cameraHeaders;
    private paramsShown;
    private beta: boolean;

    targets: object[] = [];
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
    disclaimerParams: any = {};

    windowSize: any = {};
    windowScroll;
    clientHeight: number;
    searchHeight: number;
    offsetHeight: number;
    scrollHeight: number;
    tableScrollFixed: boolean;
    elementWidth: any;
    revert: any;
    timesElementSet = 0;

    private clicks = new Subject();

    clickSubscription: SubscriptionLike;
    uriSubscription: SubscriptionLike;
    searchViewHeightSubscription: SubscriptionLike;
    windowScrollSubscription: SubscriptionLike;
    elementTableWidthSubscription: SubscriptionLike;
    resizeSubscription: SubscriptionLike;

    // Options for the Excel export
    public csvFilename;
    public csvCameraData: any[];
    public csvOptions = {
        fieldSeparator: ',',
        quoteStrings: '"',
        decimalseparator: '.',
        showLabels: true,
        headers: [
            'Vendor',
            'Model',
            'Type',
            'Max Resolution',
            'Max FPS',
            'Codec',
            'Audio',
            '2-Way Audio',
            'PTZ',
            'Advanced PTZ',
            'Fisheye',
            'Motion',
            'I/O'
        ],
        showTitle: true,
        title: 'Camera List',
        useBom: false,
        removeNewLines: true
    };

    @ViewChild('ipvdRequest', { static: false }) ipvdRequest: ElementRef;
    @ViewChild('nxScrollWrapper', { static: false }) scrollWrapper: ElementRef;
    @ViewChild('nxTable', { static: false }) camerasTable: ElementRef;

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private router: Router,
        private uri: NxUriService,
        private scrollMechanicsService: NxScrollMechanicsService,
        private renderer: Renderer2,
        @Inject(PLATFORM_ID) private platformId: object
    ) {
        this.LANG = language.translations;
        this.CONFIG = configService.getConfig();

        this.sortOrderASC = true;
        this._elements = this.elements;

        this.windowSize = {};
        this.windowScroll = 0;
        this.tableScrollFixed = false;

        this.serviceHeaders = [
            this.LANG.ipvd.count(),
            this.LANG.ipvd.resolutionArea()
        ];
        this.serviceParams = ['count', 'resolutionArea'];
        this.paramsShown = 6;
        this.cameraHeaders = [
            this.LANG.ipvd.vendor(),
            this.LANG.ipvd.model(),
            this.LANG.ipvd.hardwareType(),
            this.LANG.ipvd.maxResolution(),
            this.LANG.ipvd.maxFps(),
            this.LANG.ipvd.primaryCodec(),
            this.LANG.ipvd.isAudioSupported(),
            this.LANG.ipvd.isPtzSupported(),
            this.LANG.ipvd.isFisheye(),
            this.LANG.ipvd.isMdSupported(),
            this.LANG.ipvd.isIoSupported(),
            this.LANG.ipvd.isAnalyticsSupported(),
            this.LANG.ipvd.count(),
            this.LANG.ipvd.resolutionArea()
        ];

        this.elementWidth = '100%';
        this.pagedItems = [];
        this.pagerMaxSize = this.CONFIG.ipvd.pagerMaxSize;
        this.currentPage = 1;
        this.pageSize = this.CONFIG.layout.tableLarge.rows;

        this.uriSubscription = new Subscription();

        this.resizeSubscription = this.scrollMechanicsService.windowSizeSubject
            .subscribe(() => {
                this.setPagerSize();
            });

        this.disclaimerParams = {
            companyName: this.CONFIG.company.name,
            vmsName: this.CONFIG.vmsName
        };
    }

    ngOnInit() {
        this.setDebugAndBetaMode();

        this.results = this._elements.length;
        this.csvFilename = Date.now();
        this.csvCameraData = this.getCsvData();

        this.showAnalytics = this.CONFIG.ipvd.showAnalyticsEvents ||
            this.debug ||
            this.beta;
        if (!this.showAnalytics) {
            this.filterAllowedParams(
                [this.LANG.ipvd.isAnalyticsSupported()],
                ['isAnalyticsSupported']
            );
        }

        this.uriSubscription = this.uri
            .getParams()
            .subscribe(params => {
                this.params = params;
                this.setDebugAndBetaMode();

                if (!this.params.debug && !this.params.beta) {
                    this.filterAllowedParams(
                        this.serviceHeaders,
                        this.serviceParams
                    );
                }

                this.showAnalytics = this.CONFIG.ipvd.showAnalyticsEvents ||
                    this.params.debug ||
                    this.params.beta;
                this.showHeaders = this.cameraHeaders;

                if (this.params.sortBy) {
                    const sortBy    = this.params.sortBy.split(',');
                    const direction = (sortBy[1] === 'ASC');
                    const column    = this.cameraHeaders.find(x => {
                        return x === this.LANG.ipvd[sortBy[0]]();
                    });

                    if (
                        this.sortOrderASC === direction &&
                        column === this.selectedHeader
                    ) {
                        return; // do not sort if sorted
                    }

                    this.sortOrderASC = direction;
                    this.toggleSort(sortBy[0], true);
                }

                this.setPage(this.params.page || 1, true);

                if (this.params.camera) {
                    const camera = this.pagedItems.find((camera) => {
                        return camera.model === this.params.camera;
                    });
                    this.setClickedRow(camera);
                }
            });

        this.clickSubscription = this.clicks.pipe(
            debounceTime(0) // avoid fast change of selected camera row
        ).subscribe((element: any) => {
            this.uri.pageOffset = window.pageYOffset;
            if (this.selectedCamera === element.sortKey) {
                this.onRowClick.emit(element);
            }
        });
    }

    ngAfterViewInit(): void {
        if (this.ipvdRequest) {
            const linkRequest = this.ipvdRequest.nativeElement.querySelector('span#request');
            NxUtilsService.addPseudoAnchor(
                this.targets,
                linkRequest,
                undefined,
                'click',
                () => { this.onFeedbackClick.emit('page'); });
        }

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
                this.scrollHeight =
                    this.scrollMechanicsService.searchViewHeightSubject.getValue() +
                    NxScrollMechanicsService.HEADER_OFFSET;
            });
    }

    ngOnDestroy() {
        this.targets = NxUtilsService.clearPseudoAnchors(this.targets);
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.elements) {
            this.sortOrderASC = !this.CONFIG.ipvd.sortSupportedDevicesByPopularity;
            this._elements = changes.elements.currentValue;
            this.results = this._elements.length;

            this.sortElements(true /* keep uri params */);
            this.csvCameraData = this.getCsvData();

            this.setPage(this.currentPage, true);
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
        if (
            this.scrollMechanicsService.mediaQueryMax(
                NxScrollMechanicsService.MEDIA.md
            ) || (
                this.scrollMechanicsService.mediaQueryMax(
                    NxScrollMechanicsService.MEDIA.xl
                ) &&
                this.selectedCamera
            )
        ) {
            this.pagerMaxSize = this.CONFIG.ipvd.pagerMaxSizeMedium;
            this.pagerEllipses = false;
        } else {
            this.pagerMaxSize = this.CONFIG.ipvd.pagerMaxSize;
            this.pagerEllipses = true;
        }
    }

    trackPagedItem(index, item) {
        return item ? item.sortKey : undefined;
    }

    toggleHeaderSort(param) {
        let filter;
        for (const [key, value] of Object.entries(this.LANG.ipvd)) {
            if (value() === param) {
                filter = key;
                break;
            }
        }

        this.sortOrderASC = (this.LANG.ipvd[filter]() === this.selectedHeader)
            ? !this.sortOrderASC
            : true;
        this.toggleSort(filter, false);
        /* reset camera and page params in uri */

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
            byParam = NxUtilsService.byParam((elm: any) => {
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
            byParam = NxUtilsService.byParam((elm: any) => {
                if (elm.isAptzSupported) {
                    return 0;
                }
                if (elm.isPtzSupported === null) {
                    return 3;
                }
                if (elm.isPtzSupported) {
                    return 1;
                }
                if (!elm.isPtzSupported) {
                    return 2;
                }
            }, this.sortOrderASC);
        } else if (param === 'isAudioSupported') {
            byParam = NxUtilsService.byParam((elm: any) => {
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
                return (typeof elm[param] === 'string')
                    ? elm[param].toLowerCase()
                    : elm[param];
            }, this.sortOrderASC);
        }

        this._elements.sort(byParam);

        if (!keepURI) {
            this.setPage(1, keepURI);
        }

        this.selectedHeader = this.cameraHeaders.find(x => {
            return x === this.LANG.ipvd[param]();
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

        param = (item.isAptzSupported)
            ? 'isPtzSupported'
            : 'isAptzSupported';
        idxToBeRemoved = showParameters.indexOf(param);
        showParameters.splice(idxToBeRemoved, 1);

        param = (item.isTwAudioSupported)
            ? 'isAudioSupported'
            : 'isTwAudioSupported';
        idxToBeRemoved = showParameters.indexOf(param);
        showParameters.splice(idxToBeRemoved, 1);

        return showParameters;
    }

    calcElementScrollMechanics() {
        this.windowSize = this.scrollMechanicsService.windowSizeSubject.getValue();
        this.windowScroll = this.scrollMechanicsService.windowScroll;

        this.clientHeight = this.camerasTable.nativeElement.clientHeight;
        this.searchHeight = this.scrollMechanicsService.searchViewHeight;

        this.tableScrollFixed =
            this.clientHeight + this.searchHeight < this.windowSize.height &&
            this.windowScroll >= this.scrollHeight - NxScrollMechanicsService.SCROLL_OFFSET;
    }

    setClickedRow(element) {
        if (element) {
            this.clicks.next(element);
            this.selectedCamera = element.sortKey;
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

        // Reset page because slice was outside _elements bounds.
        // If _elements was empty no results would show instead.
        if (this.pagedItems.length === 0) {
            return this.setPage(1);
        }

        if (this.params && parseInt(this.params.page) !== pageParam) {
            const queryParams: Params = {};
            queryParams.page = (this.currentPage === 1)
                ? undefined
                : this.currentPage;

            this.uri
                .updateURI('/ipvd', queryParams)
                .catch(error => {
                    console.error(error);
                });
        }
    }

    getCsvData() {
        return this._elements.map(camera => ({
            Vendor: camera.vendor,
            Model: camera.model,
            Type: camera.hardwareType,
            'Max Resolution': camera.maxResolution,
            'Max FPS': camera.maxFps,
            Codec: camera.primaryCodec,
            Audio: NxUtilsService.yesNo(camera.isAudioSupported),
            '2-Way Audio': NxUtilsService.yesNo(camera.isTwAudioSupported),
            PTZ: NxUtilsService.yesNo(camera.isPtzSupported),
            'Advanced PTZ': NxUtilsService.yesNo(camera.isAptzSupported),
            Fisheye: NxUtilsService.yesNo(camera.isFisheye),
            Motion: NxUtilsService.yesNo(camera.isMdSupported),
            'I/O': NxUtilsService.yesNo(camera.isIoSupported)
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
            this.renderer.setStyle(
                this.scrollWrapper.nativeElement,
                'z-index',
                '-1'
            );
            clearTimeout(this.revert);
            this.revert = setTimeout(() => {
                this.renderer.setStyle(
                    this.scrollWrapper.nativeElement,
                    'z-index',
                    '1'
                );
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
            sortByColumn = this.CONFIG.ipvd.sortSupportedDevicesByPopularity
                ? 'count'
                : 'sortKey';
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
