import {
    Component,
    Input,
    Output,
    EventEmitter,
    OnChanges,
    OnInit,
    ViewEncapsulation,
    Inject,
    AfterViewInit,
    ElementRef,
    ViewChild,
    HostListener,
    Renderer2,
    LOCALE_ID
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { isEqual } from 'lodash-es';
import { Subject, SubscriptionLike } from 'rxjs';
import { debounceTime, delay } from 'rxjs/operators';

import staticLang from '@common/language/language_i18n_static.json';
import { icons, layout, search } from '@lib/variables/static-variables';
import type { Cameras } from '@services/nx-cloud-api/nx-cloud-api.types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { NxUriService } from '@services/uri.service';
import { WINDOW } from '@services/window-provider';
import { GridBreakpoints } from '@styles/theme-variables-common';
import { paramSortFunc } from '@utils/general';
import { NgChanges } from '@utils/ng-changes';

import type { IpvdParams, Disclaimer, FilteredCamera, csvData } from '../../ipvd.types';

function yesNo(bVal: unknown): string {
    if (bVal === undefined || bVal === null) {
        return 'Unknown';
    }

    return bVal ? 'Yes' : 'No';
}

type CsvData = Record<string, string | number>[];

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-cam-table',
    templateUrl: './cam-table.component.html',
    styleUrls: ['./cam-table.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class CamTableComponent implements OnChanges, OnInit, AfterViewInit {
    @Input() elements: FilteredCamera[];
    @Input() allowedParameters: string[];
    @Input() activeCamera: Cameras;
    @Input() params: IpvdParams;

    @Output() public onRowClick = new EventEmitter<FilteredCamera>();
    @Output() public onFeedbackClick = new EventEmitter<void>();

    public selectedHeader: string;
    public showHeaders: string[];
    public selectedCamera: string;
    public sortOrderASC: boolean = true;
    public pages: number;
    public debug: boolean;

    private _elements: FilteredCamera[];
    private cameraHeaders: string[];
    private beta: boolean;

    currentPage: number = 1;
    pageSize: number;
    pagedItems: FilteredCamera[] = [];
    pagerMaxSize: number;
    CONFIG: IConfig;
    LANG = staticLang;
    showAnalytics: boolean;
    readonly serviceParams: string[] = ['count', 'resolutionArea'];
    serviceHeaders: string[];
    disclaimerParams: Disclaimer;

    scrollHeight: number;
    tableScrollFixed: boolean = false;
    elementWidth: string = '100%';
    revert: number;

    private clicks = new Subject<FilteredCamera>();

    clickSubscription: SubscriptionLike;
    uriSubscription: SubscriptionLike;
    searchViewHeightSubscription: SubscriptionLike;
    windowScrollSubscription: SubscriptionLike;
    elementTableWidthSubscription: SubscriptionLike;
    resizeSubscription: SubscriptionLike;
    icons = icons;

    // Options for the CSV export
    public csvFilename: number;
    public csvCameraData: CsvData;
    /* Missing filename and keys property, but README says keys is optional
    and filename is provided as a property on the element so probably fine */
    public csvOptions = {
        fieldSeparator: ',',
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
    };

    @ViewChild('nxScrollWrapper', { static: false })
    private scrollWrapper: ElementRef<HTMLDivElement>;

    @ViewChild('nxTable', { static: false })
    private camerasTable: ElementRef<HTMLDivElement>;

    constructor(
        configService: NxConfigService,

        private route: ActivatedRoute,
        private uri: NxUriService,
        private scrollMechanicsService: NxScrollMechanicsService,
        private renderer: Renderer2,
        @Inject(WINDOW) private window: Window,
        @Inject(LOCALE_ID) private locale: string,
    ) {
        this.CONFIG = configService.getConfig();

        this.serviceHeaders = [
            this.LANG.ipvd.count,
            this.LANG.ipvd.resolutionArea
        ];

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

        this.pagerMaxSize = this.CONFIG.ipvd.pagerMaxSize;
        this.pageSize = layout.tableLarge.rows;

        this.disclaimerParams = {
            companyName: this.CONFIG.company.name,
            vmsName: this.CONFIG.vmsName
        };
    }

    ngOnInit(): void {
        this._elements = this.elements;

        this.resizeSubscription = this.scrollMechanicsService.windowSizeSubject
            .subscribe(() => {
                this.setPagerSize();
            });

        this.params = this.route.snapshot.queryParams;
        this.setDebugAndBetaMode();

        this.showAnalytics = this.CONFIG.ipvd.showAnalyticsEvents ||
            this.debug ||
            this.beta;
        if (!this.showAnalytics) {
            this.filterAllowedParams(
                [this.LANG.ipvd.isAnalyticsSupported],
                ['isAnalyticsSupported']
            );
        } else {
            this.csvOptions.headers.push('Analytics');
        }

        this.csvFilename = Date.now();
        this.csvCameraData = this.getCsvData();

        this.uriSubscription = this.uri
            .getParams()
            .pipe(debounceTime(search.debounceShortTime))
            .subscribe(params => {
                this.params = params;
                this.setDebugAndBetaMode();

                this.showAnalytics = this.CONFIG.ipvd.showAnalyticsEvents ||
                    this.debug ||
                    this.beta;

                this.showHeaders = this.cameraHeaders;

                if (this.params.sortBy) {
                    const sortBy = this.params.sortBy.split(',');
                    const direction = (sortBy[1] === 'ASC');
                    const column = this.cameraHeaders.find(x =>
                        x === this.LANG.ipvd[sortBy[0]]
                    );

                    // do not sort if sorted
                    if (
                        this.sortOrderASC !== direction ||
                        column !== this.selectedHeader
                    ) {
                        this.sortOrderASC = direction;
                        this.toggleSort(sortBy[0], true);
                    }
                }

                this.setPage(parseInt(this.params.page) || 1);

                if (this.params.camera) {
                    const camera = this.pagedItems.find(camera =>
                        camera.model === this.params.camera
                    );
                    this.setClickedRow(camera);
                }
            });

        this.clickSubscription = this.clicks.pipe(
            debounceTime(0) // avoid fast change of selected camera row
        ).subscribe(element => {
            this.uri.pageOffset = this.window.pageYOffset;
            if (this.selectedCamera === element.sortKey) {
                this.onRowClick.emit(element);
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
                const width = this.scrollMechanicsService.elementTableWidth;
                this.elementWidth = (width > 0) ? width + 'px' : '100%';
            });

        this.searchViewHeightSubscription = this.scrollMechanicsService
            .searchViewHeightSubject.pipe(delay(0))
            .subscribe(() => {
                const searchViewHeight = this.scrollMechanicsService
                    .searchViewHeightSubject.getValue();
                const { HEADER_OFFSET } = NxScrollMechanicsService;
                this.scrollHeight = searchViewHeight + HEADER_OFFSET;
            });
    }

    ngOnChanges(changes: NgChanges<CamTableComponent>): void {
        if (changes.elements) {
            const { elements } = changes;
            if (
                elements.firstChange || (
                    !elements.firstChange &&
                    !isEqual(elements.currentValue, elements.previousValue)
                )
            ) {
                this.sortOrderASC = !this.CONFIG.ipvd.sortSupportedDevicesByPopularity;
                this._elements = elements.currentValue;
                this.pages = Math.ceil(this._elements.length / this.pageSize);

                this.sortElements(true); /* keep uri params */
                this.csvCameraData = this.getCsvData();

                this.setPage(this.currentPage);
            }
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

    private setPagerSize(): void {
        const maxWidthMd = this.scrollMechanicsService.mediaQueryMax(GridBreakpoints.MD);
        const maxWidthXl = this.scrollMechanicsService.mediaQueryMax(GridBreakpoints.XL);
        if (maxWidthMd || (maxWidthXl && this.selectedCamera)) {
            this.pagerMaxSize = this.CONFIG.ipvd.pagerMaxSizeMedium;
        } else {
            this.pagerMaxSize = this.CONFIG.ipvd.pagerMaxSize;
        }
    }

    trackPagedItem(index: number, item: FilteredCamera): string | undefined {
        return item ? item.sortKey : undefined;
    }

    toggleHeaderSort(param: string): void {
        const filter = Object.keys(this.LANG.ipvd).find(key =>
            this.LANG.ipvd[key] === param
        );

        this.sortOrderASC = (this.LANG.ipvd[filter] === this.selectedHeader)
            ? !this.sortOrderASC
            : true;
        this.toggleSort(filter, false);
        /* reset camera and page params in uri */

        const queryParams: IpvdParams = {
            page: undefined,
            sortBy: `${filter},${this.sortOrderASC ? 'ASC' : 'DESC'}`
        };

        this.uri
            .updateURI('/ipvd', queryParams)
            .catch(error => {
                console.error(error);
            });
    }

    toggleSort(param: string, keepURI: boolean): void {
        let byParam: (a: Cameras, b: Cameras) => number;

        switch (param) {
            case 'vendor':
            case 'model':
            case 'hardwareType':
            case 'primaryCodec':
                // string
                const collator = new Intl.Collator(this.locale);
                // Using collator object here for speed
                // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/localeCompare#performance
                byParam = (a, b) => {
                    const result = collator.compare(a[param], b[param]);
                    return this.sortOrderASC ? result : -result;
                };
                break;
            case 'maxResolution':
                // Display resolution string, but use area number for sorting
                byParam = paramSortFunc(elm => elm.resolutionArea, !this.sortOrderASC);
                break;
            case 'maxFps':
            case 'count':
            case 'resolutionArea':
                // number
                byParam = paramSortFunc(elm => elm[param], !this.sortOrderASC);
                break;
            case 'isFisheye':
            case 'isMdSupported':
            case 'isIoSupported':
            case 'isAnalyticsSupported':
                // boolean + null (no info)
                byParam = paramSortFunc(elm => {
                    if (elm[param] === null) {
                        return 0;
                    } else if (!elm[param]) {
                        return 1;
                    } else {
                        return 2;
                    }
                }, !this.sortOrderASC);
                break;
            case 'isPtzSupported':
                // tri-state + null
                byParam = paramSortFunc(elm => {
                    if (elm.isAptzSupported) {
                        return 0;
                    } else if (elm.isPtzSupported === null) {
                        return 3;
                    } else if (elm.isPtzSupported) {
                        return 1;
                    } else if (!elm.isPtzSupported) {
                        return 2;
                    }
                }, this.sortOrderASC);
                break;
            case 'isAudioSupported':
                // tri-state + null
                byParam = paramSortFunc(elm => {
                    if (elm.isAudioSupported === null) {
                        return 3;
                    } else if (!elm.isAudioSupported) {
                        return 2;
                    } else if (elm.isTwAudioSupported) {
                        return 0;
                    } else if (elm.isAudioSupported) {
                        return 1;
                    }
                }, this.sortOrderASC);
                break;
            default:
                byParam = paramSortFunc(elm => elm[param], this.sortOrderASC);
        }

        this._elements.sort(byParam);

        if (!keepURI) {
            this.setPage(1);
        }

        this.selectedHeader = this.cameraHeaders.find(x =>
            x === this.LANG.ipvd[param]
        );
    }

    filterAllowedParams(headers: string[], params: string[]): void {
        // filter 'service' params
        this.allowedParameters = this.allowedParameters.filter(el =>
            !params.includes(el)
        );
        this.cameraHeaders = this.cameraHeaders.filter(el =>
            !headers.includes(el)
        );
        this.showHeaders = this.cameraHeaders;
    }

    showParametersFor(item: FilteredCamera): string[] {
        const showParameters = [...this.allowedParameters];
        // adjust PTZ and Audio params
        let idxToBeRemoved: number;
        let param: string;

        param = item.isAptzSupported ? 'isPtzSupported' : 'isAptzSupported';
        idxToBeRemoved = showParameters.indexOf(param);
        showParameters.splice(idxToBeRemoved, 1);

        param = item.isTwAudioSupported
            ? 'isAudioSupported'
            : 'isTwAudioSupported';
        idxToBeRemoved = showParameters.indexOf(param);
        showParameters.splice(idxToBeRemoved, 1);

        return showParameters;
    }

    calcElementScrollMechanics(): void {
        const windowSize = this.scrollMechanicsService
            .windowSizeSubject.getValue();
        const windowScroll = this.scrollMechanicsService.windowScroll;

        const { clientHeight } = this.camerasTable.nativeElement;
        const searchHeight = this.scrollMechanicsService.searchViewHeight;

        const { SCROLL_OFFSET } = NxScrollMechanicsService;

        this.tableScrollFixed =
            clientHeight + searchHeight < windowSize.height &&
            windowScroll >= this.scrollHeight - SCROLL_OFFSET;
    }

    setClickedRow(element: FilteredCamera | undefined): void {
        if (element) {
            this.clicks.next(element);
            this.selectedCamera = element.sortKey;
        } else {
            this.selectedCamera = undefined;
        }

        this.setPagerSize();
    }

    setPage(page: number): void {
        this.currentPage = page;

        const pageParam = (this.currentPage === 1)
            ? undefined
            : this.currentPage;
        // preserve window offset
        this.uri.pageOffset = this.window.pageYOffset;

        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        this.pagedItems = this._elements.slice(startIndex, endIndex);

        // Reset page because slice was outside _elements bounds.
        // If _elements was empty no results would show instead.
        if (this.pagedItems.length === 0) {
            return this.setPage(1);
        }

        if (this.params && parseInt(this.params.page) !== pageParam) {
            this.uri
                .updateURI('/ipvd', { page: pageParam })
                .catch(error => {
                    console.error(error);
                });
        }
    }

    getCsvData(): CsvData {
        return this._elements.map(camera => {
            const csv: Partial<csvData> = ({
                Vendor: camera.vendor,
                Model: camera.model,
                Type: camera.hardwareType,
                'Max Resolution': camera.maxResolution,
                'Max FPS': camera.maxFps,
                Codec: camera.primaryCodec,
                Audio: yesNo(camera.isAudioSupported),
                '2-Way Audio': yesNo(camera.isTwAudioSupported),
                PTZ: yesNo(camera.isPtzSupported),
                'Advanced PTZ': yesNo(camera.isAptzSupported),
                Fisheye: yesNo(camera.isFisheye),
                Motion: yesNo(camera.isMdSupported),
                'I/O': yesNo(camera.isIoSupported)
            });

            if (this.showAnalytics) {
                csv.Analytics = yesNo(camera.isAnalyticsSupported);
            }

            return csv;
        });
    }

    isBoolIcon(value: unknown): boolean {
        return typeof value === 'boolean' || value === 0 || value === '0x0';
    }

    // Element with position 'fixed' is losing the focus when page bottom is reached and cursor is moved (not 'mousewheel')
    // this ensures scroll wrapper will get the event... but content is not clickable during scroll. -- TT
    @HostListener('mousewheel', ['$event'])
    onMouseWheel(event: MouseEvent): void {
        if (this.tableScrollFixed) {
            this.renderer.setStyle(
                this.scrollWrapper.nativeElement,
                'z-index',
                '-1'
            );
            clearTimeout(this.revert);
            this.revert = this.window.setTimeout(() => {
                this.renderer.setStyle(
                    this.scrollWrapper.nativeElement,
                    'z-index',
                    '1'
                );
                clearTimeout(this.revert);
            }, 100);
        }
    }

    private sortElements(keepURI: boolean): void {
        let sortByColumn: string;
        if (this.params.sortBy) {
            const sortBy = this.params.sortBy.split(',');
            this.sortOrderASC = (sortBy[1] === 'ASC');
            sortByColumn = sortBy[0];
        } else {
            // If sort by popularity is set in CMS or default sorting 'Vendor-Model'
            sortByColumn = this.CONFIG.ipvd.sortSupportedDevicesByPopularity
                ? 'count'
                : 'sortKey';
        }

        this.toggleSort(sortByColumn, keepURI);

        const pageNum = this.params?.page ? Number(this.params.page) : 1;

        this.setPage(pageNum);
    }

    private setDebugAndBetaMode(): void {
        this.debug = (this.params.debug !== undefined);
        this.beta = (this.params.beta !== undefined);

        if (!this.debug && !this.beta) {
            this.filterAllowedParams(this.serviceHeaders, this.serviceParams);
        }
    }
}
