import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { isPlatformBrowser, Location } from '@angular/common';
import {
    Component,
    ElementRef,
    Inject,
    LOCALE_ID,
    OnDestroy,
    OnInit,
    PLATFORM_ID,
    ViewChild,
    ViewEncapsulation,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { cloneDeep } from 'lodash-es';
import { SubscriptionLike } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import staticLang from '@common/language/language_i18n_static.json';
import type { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import type { MultiSelectItem } from '@components/dropdowns/multi-select/multi-select.component.types';
import type { SearchFilter } from '@components/search/search.component.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { Size } from '@directives/resize/nx-resize.directive.types';
import { dialogs, icons, search } from '@lib/variables/static-variables';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { Cameras, Vendors } from '@services/nx-cloud-api/nx-cloud-api.types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxUriService } from '@services/uri.service';
import { WINDOW } from '@services/window-provider';
import { alphabeticalSort } from '@utils/general';

import { IpvdSearchService } from './ipvd-search.service';
import type { Disclaimer, IpvdParams, FilteredCamera } from './ipvd.types';

const OTHER_PAGE_ELEMENTS = 270; // in px. combined height of menu, disclaimer, collapsed search and footer
const OTHER_PAGE_ELEMENTS_MOBILE = 400; // in px. combined height of menu, disclaimer, collapsed search and footer
const RIGHT_PANEL_WIDTH = 343; // in px.
const TABLE_MAX_WIDTH = '1192px';

@UntilDestroy()
@Component({
    selector: 'nx-ipvd',
    templateUrl: 'ipvd.component.html',
    styleUrls: ['ipvd.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class NxIpvdComponent implements OnInit, OnDestroy {
    LANG = staticLang;
    CONFIG: IConfig;

    placeholder: string = '';
    company: string;
    vmsName: string;
    vendors: Vendors[] = [];
    resolution: string = '0';
    query: string = '';
    cameras: Cameras[] = [];
    analytics: string[];
    activeCamera?: Cameras;
    showAll: boolean = false;
    hardwareTypes: MultiSelectItem[] = [];
    resolutions: DropdownItem<string>[] = [];
    camerasTable: FilteredCamera[] = [];
    allowedParameters: string[];
    cmsParameters: string[];
    serviceParameters: string[];
    filterModel: SearchFilter = {
        query: '',
        tags: [],
        selects: [],
        multiselects: [],
    };
    toggleCamview: boolean = false;
    params: IpvdParams;
    mobileDetailMode: boolean;
    noResult: boolean = false;
    hasNoSearch: boolean = true;
    debug: boolean;
    beta: boolean;
    uriPath: string;
    breakpoint: string = '(max-width: 767px)';
    showAnalytics: boolean;
    showBeta: boolean;
    disclaimerParams: Disclaimer;

    locationSubscription: SubscriptionLike;
    isMobile: boolean;

    tableHeight: number;
    searchDiff: number = 0;
    templateRows: string = '';
    templateTableRows: string = '';
    tableMaxWidth: string;

    icons = icons;

    @ViewChild('tableContainer', { static: false })
    private tableContainer: ElementRef<HTMLDivElement>;
    @ViewChild('searchContainer', { static: false })
    private searchContainer: ElementRef<HTMLDivElement>;

    private setupDefaults(): void {
        this.tableMaxWidth = TABLE_MAX_WIDTH;

        this.allowedParameters = [
            'vendor',
            'model',
            'hardwareType',
            'maxResolution',
            'maxFps',
            'primaryCodec',
            'isAudioSupported',
            'isTwAudioSupported',
            'isPtzSupported',
            'isAptzSupported',
            'isFisheye',
            'isMdSupported',
            'isIoSupported',
        ];
        this.cmsParameters = ['isAnalyticsSupported'];
        this.serviceParameters = ['count', 'resolutionArea'];

        this.uriPath = '/' + this.route.snapshot.parent.url.map(e => e.path).join('/');

        this.disclaimerParams = {
            companyName: this.CONFIG.company.name,
            vmsName: this.CONFIG.vmsName,
        };
    }

    constructor(
        configService: NxConfigService,
        private cloudApi: NxCloudApiService,
        private cameraSearchService: IpvdSearchService,
        private dialogs: NxDialogsService,
        private uri: NxUriService,
        private route: ActivatedRoute,
        private location: Location,
        private breakpointObserver: BreakpointObserver,
        private router: Router,
        @Inject(PLATFORM_ID) private platformId: object,
        @Inject(WINDOW) private window: Window,
        @Inject(LOCALE_ID) private locale: string,
    ) {
        this.CONFIG = configService.getConfig();

        this.setupDefaults();

        if (isPlatformBrowser(this.platformId)) {
            this.router.events.pipe(untilDestroyed(this)).subscribe(() => {
                window.scroll(0, this.uri.pageOffset);
            });
        }

        this.locationSubscription = this.location.subscribe(() => {
            // force view component update without URI update
            setTimeout(() => {
                this.params = this.route.snapshot.queryParams;
                if (!this.params.camera && this.activeCamera) {
                    this.resetActiveCamera(true);
                }
            });
        });

        this.uri
            .getParams()
            .pipe(untilDestroyed(this), debounceTime(search.debounceShortTime))
            .subscribe(params => {
                this.params = params;
                // this.setDebugAndBetaMode();

                this.showAnalytics =
                    this.CONFIG.ipvd.showAnalyticsEvents || this.debug || this.beta;
                if (this.showAnalytics) {
                    this.allowedParameters = [...this.allowedParameters, ...this.cmsParameters];
                }

                this.showBeta = this.beta;
                if (this.showBeta) {
                    this.allowedParameters = [
                        ...this.allowedParameters,
                        ...this.cmsParameters,
                        ...this.serviceParameters,
                    ];
                }
            });
    }

    ngOnDestroy(): void {
        this.locationSubscription.unsubscribe();
    }

    ngOnInit(): void {
        // Example URI
        // /ipvd?vendors=30X&camera=IPPTZ-ELS2IRL30X-ATI
        this.params = this.route.snapshot.queryParams;
        const numParams = Object.keys(this.params).length;
        if (numParams !== 0) {
            this.debug = this.params.debug !== undefined;
            this.beta = this.params.beta !== undefined;
            this.hasNoSearch = numParams === 1 && !!(this.params.debug || this.params.beta);
        } else {
            this.hasNoSearch = true;
            this.resetFilterModel();
        }

        this.showAnalytics = this.CONFIG.ipvd.showAnalyticsEvents || this.debug || this.beta;

        this.company = this.CONFIG.company.name;
        this.vmsName = this.CONFIG.vmsName;
        this.placeholder = this.LANG.search.Search;

        // add hardware types and tags
        this.addFilterTags();
        this.addFilterTypes();
        this.addFilterResolutions();

        this.getIPVDData();

        this.breakpointObserver
            .observe([this.breakpoint])
            .pipe(untilDestroyed(this))
            .subscribe((state: BreakpointState) => {
                this.isMobile = state.matches;
                this.mobileDetailMode = !!(state.matches && this.activeCamera);

                this.calcRows();
            });
    }

    onResize(event: Size): void {
        if (event.height > 0 && this.tableContainer?.nativeElement) {
            this.tableHeight = this.tableContainer.nativeElement.clientHeight;
        }
    }

    calcRows(isCameraActive?: boolean): void {
        const otherElements = this.isMobile ? OTHER_PAGE_ELEMENTS_MOBILE : OTHER_PAGE_ELEMENTS;
        this.templateRows = this.camerasTable.length
            ? `auto 0 calc(100vh - ${otherElements + this.searchDiff}px)`
            : `auto calc(100vh - ${otherElements + this.searchDiff}px) 0`;

        const isCamera = this.activeCamera || isCameraActive;
        this.templateTableRows = this.isMobile
            ? '1fr'
            : isCamera
            ? `1fr ${RIGHT_PANEL_WIDTH}px`
            : '1fr';
    }

    menuChanged(isHeight: boolean): void {
        if (isHeight) {
            const heightBefore = this.searchContainer.nativeElement.clientHeight;
            setTimeout(() => {
                this.searchDiff = this.searchContainer.nativeElement.clientHeight - heightBefore;
                this.tableHeight -= this.searchContainer.nativeElement.clientHeight - heightBefore;
            });
        } else {
            setTimeout(() => {
                this.tableHeight += this.searchDiff;
                this.searchDiff = 0;
            });
        }
    }

    findVendorForCamera(name: string): [string] | [] {
        const camera = this.cameras.find(camera => {
            return camera.model === name;
        });

        if (camera) {
            return [camera.vendor];
        } else {
            return [];
        }
    }

    updateFilterModel(): void {
        this.filterModel.query = '';

        if (this.params.search) {
            this.filterModel.query = this.params.search;
        }

        if (this.filterModel.tags?.length) {
            this.filterModel.tags.forEach(tag => {
                tag.value = false;
            });
            if (this.params.tags) {
                const paramTags = new Set(this.params.tags.split(','));
                this.filterModel.tags.forEach(tag => {
                    tag.value = paramTags.has(tag.id);
                });
            }
        }

        this.filterModel.selects?.forEach(select => {
            if (this.params[select.id]) {
                select.selected = select.items.find(item => item.value === this.params[select.id]);
            } else if (!select.selected) {
                select.selected = { value: '0', name: this.LANG.search.All };
            }
        });

        this.filterModel.multiselects?.forEach(select => {
            if (this.params[select.id]) {
                select.selected = this.params[select.id].split(',');
            } else if (select.id === 'vendors' && this.params.camera) {
                // direct navigation to camera
                select.selected = this.findVendorForCamera(this.params.camera);
                if (!select.selected.length) {
                    // not found. wrong camera model? try search...
                    this.filterModel.search = this.params.camera;
                }
            } else {
                select.selected = [];
            }
        });
    }

    resetFilterModel(): void {
        this.filterModel.search = '';

        this.filterModel.tags?.forEach(filter => {
            filter.value = false;
        });

        this.filterModel.selects?.forEach(filter => {
            filter.selected = filter.items[0];
        });

        this.filterModel.multiselects?.forEach(filter => {
            filter.selected = [];
        });

        this.filterModel = { ...this.filterModel };
    }

    addFilterResolutions(): void {
        this.resolutions = this.CONFIG.ipvd.supportedResolutions;

        this.filterModel.selects.push({
            id: 'resolution',
            label: this.LANG.search.minResolution,
            items: this.resolutions,
            selected: this.resolutions[0],
        });
    }

    addAnalyticsEvents(): void {
        if (this.showAnalytics && this.analytics) {
            this.filterModel.multiselects.push({
                id: 'analytics',
                label: this.LANG.search.analytics,
                searchLabel: this.LANG.search.analyticsSelected,
                searchLabelSingular: '',
                items: this.analytics.map(v => ({ id: v, label: v })),
                selected: [],
            });
        }
    }

    setActiveCamera(): void {
        if (this.params.camera) {
            this.uri.pageOffset = this.window.pageYOffset;
            const selectedCamera = this.cameras.find(camera => camera.model === this.params.camera);
            this.activateCamera(selectedCamera);
        }
    }

    addFilterTags(): void {
        this.filterModel.tags = this.CONFIG.ipvd.searchTags;

        if (!this.showAnalytics) {
            this.filterModel.tags = this.filterModel.tags.filter(
                tag => tag.id !== 'isAnalyticsSupported',
            );
        }

        this.filterModel.tags.forEach(tag => {
            tag.label = this.LANG.ipvd[tag.id];
        });
    }

    addFilterTypes(): void {
        this.hardwareTypes = this.CONFIG.ipvd.supportedHardwareTypes;
        this.hardwareTypes.forEach(type => {
            type.label = this.LANG.ipvd[type.id];
        });

        this.filterModel.multiselects = [
            {
                id: 'hardwareTypes',
                label: this.LANG.search.hardwareTypes,
                singular: this.LANG.search.hardwareType,
                items: this.hardwareTypes,
                selected: [],
            },
            // vendors will be added later
        ];
    }

    modelChanged(model: SearchFilter): void {
        this.filterModel = cloneDeep(model);
        this.searchVendor();
    }

    getIPVDData(): void {
        if (this.debug) {
            this.cloudApi
                .reloadIPVD()
                .pipe(untilDestroyed(this))
                .subscribe(
                    () => {
                        this.activate();
                    },
                    ex => console.error(ex),
                );
            return;
        }

        this.activate();
    }

    activate(): void {
        this.cloudApi
            .getIPVD()
            .pipe(untilDestroyed(this))
            .subscribe(
                data => {
                    this.cameras = data.cameras;
                    this.analytics = data.analytics;
                    this.cameraSearchService.showAnalytics = this.showAnalytics;
                    this.addAnalyticsEvents();
                    this.addFilterTags();

                    this.vendors = data.vendors;
                    this.vendors.sort(alphabeticalSort(this.locale, elm => elm.name));

                    // reformat vendors to fit the multiselect component
                    this.filterModel.multiselects.unshift({
                        id: 'vendors',
                        label: this.LANG.search.vendors,
                        singular: this.LANG.search.vendor,
                        items: this.vendors.map(v => ({ id: v.name, label: v.name })),
                        selected: [],
                    });

                    this.updateFilterModel();
                    // Trigger model change for search component
                    this.filterModel = { ...this.filterModel };
                    this.searchVendor();
                },
                ex => console.error(ex),
            );
    }

    // restrict the parameters to be passed and viewed for to cam-table (based on allowedParameters)
    preFilterCameraTable(cameras: Cameras[]): FilteredCamera[] {
        const filteredCameras: FilteredCamera[] = [];
        cameras.forEach(camera => {
            const filteredCamera = Object.keys(camera).reduce<FilteredCamera>(
                (obj, key) => {
                    if (this.allowedParameters.includes(key)) {
                        obj[key] = camera[key];
                    }
                    return obj;
                },
                { sortKey: camera.sortKey },
            );
            filteredCameras.push(filteredCamera);
        });
        return filteredCameras;
    }

    notEmptyFilter(): boolean {
        const tags = !!this.filterModel.tags?.find(tag => tag.value);

        const multiselect = this.filterModel.multiselects?.some(
            select => select.selected.length > 0,
        );

        const singleselect = this.filterModel.selects?.some(
            select => select.selected && select.selected.value !== '0',
            // 0 is default choice
        );

        return tags || multiselect || singleselect || this.filterModel.query !== '';
    }

    searchVendor(): void {
        if (!this.params.camera && this.activeCamera) {
            this.resetActiveCamera();
        }

        if (this.cameras && this.cameras.length) {
            if (this.notEmptyFilter()) {
                const filteredCameras = this.cameraSearchService.ipvdSearch(
                    this.cameras,
                    this.filterModel,
                );

                this.noResult = filteredCameras.length === 0;
                this.camerasTable = !this.noResult
                    ? this.preFilterCameraTable(filteredCameras)
                    : [];
                this.setActiveCamera();
            } else {
                this.hasNoSearch = true;
                this.noResult = false;
                this.camerasTable = [];
                this.resetActiveCamera();

                const queryParams: IpvdParams = {};
                // we need these to be only defined or undefined
                queryParams.debug = this.debug ? 'true' : undefined;
                queryParams.beta = this.beta ? 'true' : undefined;
                this.uri.resetURI(this.uriPath, queryParams);

                this.params = queryParams;
            }
        }
        this.calcRows();
    }

    activateCamera(elementSelected: FilteredCamera): void {
        if (!elementSelected) {
            return;
        }
        if (Object.keys(elementSelected).length === 0) {
            // call was not initiated by linking the element in HTML
            // this.resetActiveCamera();
            return;
        }

        elementSelected.sortKey = (elementSelected.vendor + elementSelected.model).replace(
            /\s/g,
            '',
        );

        const selectedCamera = this.cameras.find(camera => {
            return camera.sortKey === elementSelected.sortKey;
        });

        if (this.activeCamera && this.activeCamera.sortKey === selectedCamera.sortKey) {
            return;
        }
        this.showAll = false;

        const queryParams: IpvdParams = {};
        queryParams.camera = selectedCamera.model;

        this.uri
            .updateURI(this.uriPath, queryParams)
            .then(() => {
                this.activeCamera = { ...selectedCamera };
            })
            .catch(error => {
                console.error(error);
            });

        if (this.breakpointObserver.isMatched(this.breakpoint)) {
            this.mobileDetailMode = true;
        }

        this.calcRows(true);
        this.tableMaxWidth = 'none';

        this.toggleCamview = true;
    }

    openPageFeedback(): void {
        this.dialogs.message({
            messageType: dialogs.message.type.ipvd_page,
            data: { disclaimer: this.LANG.privacyPolicy.ipvd, asset: '' },
        });
    }

    openDeviceFeedback(): void {
        this.dialogs.message({
            messageType: dialogs.message.type.ipvd_device,
            data: {
                disclaimer: this.LANG.privacyPolicy.ipvd,
                asset: this.activeCamera?.model ?? '',
            },
        });
    }

    resetActiveCamera(skipUpdateURI?: boolean): void {
        if (!this.activeCamera) {
            return;
        }

        if (!skipUpdateURI) {
            const queryParams: IpvdParams = {};
            queryParams.camera = undefined;

            this.uri.updateURI(this.uriPath, queryParams).catch(error => {
                console.error(error);
            });
        }

        this.activeCamera = undefined;
        this.mobileDetailMode = false;
        this.toggleCamview = false;
        this.tableMaxWidth = TABLE_MAX_WIDTH;
        this.calcRows();
    }
}
