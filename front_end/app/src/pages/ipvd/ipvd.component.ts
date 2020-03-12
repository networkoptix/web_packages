import {
    AfterViewInit,
    Component, ElementRef, Inject,
    OnInit, PLATFORM_ID, ViewChild,
    ViewEncapsulation
}                                                from '@angular/core';
import { isPlatformBrowser, Location }           from '@angular/common';
import { BreakpointObserver, BreakpointState }   from '@angular/cdk/layout';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { IpvdSearchService }                     from './ipvd-search.service';
import { MessageParams }                         from '../../dialogs/message/message.component';
import { NxConfigService, IConfig }           from '../../services/nx-config';
import { NxUriService }              from '../../services/uri.service';
import { NxUtilsService }            from '../../services/utils.service';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxDialogsService }          from '../../dialogs/dialogs.service';
import { NxAccountService }          from '../../services/account.service';
import { SubscriptionLike }          from 'rxjs';
import { isArray }                   from 'rxjs/internal-compatibility';
import { NxScrollMechanicsService }  from '../../services/scroll-mechanics.service';
import { AutoUnsubscribe }           from 'ngx-auto-unsubscribe';
import { NxPageService }             from '../../services/page.service';
import { delay }                     from 'rxjs/operators';
import { NxCloudApiService }         from '../../services/nx-cloud-api';
import { LanguageI18NStaticTypes } from '../../../language_i18n_static_types';

interface Params {
    [key: string]: any;
}

@AutoUnsubscribe()
@Component({
    selector     : 'ipvd',
    templateUrl  : 'ipvd.component.html',
    styleUrls    : ['ipvd.component.scss'],
    encapsulation: ViewEncapsulation.None
})

export class NxIpvdComponent implements OnInit, AfterViewInit {
    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    placeholder: string;
    data: any;
    company: string;
    vmsName: string;
    vendors: any = [];
    resolution: string;
    itemsPerPage: number;
    query: string;
    cameras: any;
    analytics: any;
    activeCamera: any;
    showAll: boolean;
    hardwareTypes: any[];
    resolutions: any;
    camerasTable: any;
    allowedParameters: string[];
    filterModel: any;
    toggleCamview: boolean;
    params: any;
    mobileDetailMode: boolean;
    noResult: boolean;
    hasNoSearch: boolean;
    debug: any;
    beta: any;
    uriPath: string;
    breakpoint: string;
    showAnalytics: boolean;

    breakpointSubscription: SubscriptionLike;
    routerSubscription: SubscriptionLike;
    locationSubscription: SubscriptionLike;
    cameraReloadSubscription: SubscriptionLike;
    cameraGetSubscription: SubscriptionLike;
    windowSizeSubscription: SubscriptionLike;
    offsetSubscription: SubscriptionLike;

    @ViewChild('viewContainer', { static: false }) viewContainer: ElementRef;
    @ViewChild('tableContainer', { static: false }) tableContainer: ElementRef;
    @ViewChild('searchContainer', { static: false }) searchContainer: ElementRef;

    private setupDefaults() {
        this.allowedParameters = [
            'vendor', 'model', 'hardwareType',
            'maxResolution', 'maxFps', 'primaryCodec', 'isAudioSupported',
            'isTwAudioSupported', 'isPtzSupported', 'isAptzSupported',
            'isFisheye', 'isMdSupported', 'isIoSupported', 'isAnalyticsSupported', 'count', 'resolutionArea'
        ];

        this.breakpoint = '(max-width: 767px)';
        this.placeholder = '';
        this.data = undefined;
        this.resolution = '0';
        this.itemsPerPage = 15;
        this.query = '';
        this.noResult = false;
        this.hasNoSearch = true;
        this.cameras = [];
        this.camerasTable = [];
        this.vendors = undefined;

        this.activeCamera = undefined;
        this.showAll = false;
        this.toggleCamview = false;

        this.filterModel = {
            query: ''
        };
        this.filterModel.tags = [];
        this.filterModel.selects = [];
        this.filterModel.multiselects = [];

        this.resolutions = [];
        this.hardwareTypes = [];

        this.uriPath = '/' + this.route.snapshot.url.map(e => e.path).join('/');
    }

    constructor(configService: NxConfigService,
        languageService: NxLanguageProviderService,
                private cloudApi: NxCloudApiService,
                private cameraSearchService: IpvdSearchService,
                // TODO: Use dialog service when it is not being downgraded
                private dialogs: NxDialogsService,
                private uri: NxUriService,
                private route: ActivatedRoute,
                private location: Location,
                private breakpointObserver: BreakpointObserver,
                private router: Router,
                private pageService: NxPageService,
                private accountService: NxAccountService,
                private scrollMechanicsService: NxScrollMechanicsService,
                @Inject(PLATFORM_ID) private platformId: object
    ) {
        this.setupDefaults();

        if (isPlatformBrowser(this.platformId)) {
            this.routerSubscription = this.router.events.subscribe((event: NavigationEnd) => {
                window.scroll(0, this.uri.pageOffset);
            });
        }

        this.locationSubscription = this.location.subscribe((event: PopStateEvent) => {
            // force view component update without URI update
            setTimeout(() => {
                this.params = this.route.snapshot.queryParams;
                if (!this.params.camera && this.activeCamera) {
                    this.resetActiveCamera(true);
                }
            });
        });

        this.windowSizeSubscription = this.scrollMechanicsService
            .windowSizeSubject
            .subscribe(() => {
                if (this.viewContainer && this.viewContainer.nativeElement) {
                    this.scrollMechanicsService.elementViewWidth = this.viewContainer.nativeElement.clientWidth;
                }

                if (this.tableContainer && this.tableContainer.nativeElement) {
                    let width = this.tableContainer.nativeElement.clientWidth;
                    width = (this.activeCamera) ? width - 8 : width; /* -gutter */
                    this.scrollMechanicsService.elementTableWidth = width;
                }
            });

        this.CONFIG = configService.getConfig();
        this.LANG = languageService.getTranslations();
    }

    ngOnInit() {
        // Example URI
        // /ipvd?vendors=30X&camera=IPPTZ-ELS2IRL30X-ATI
        this.params = this.route.snapshot.queryParams;
        const numParams = Object.keys(this.params).length;
        if (numParams !== 0) {
            this.debug = (this.params.debug !== undefined);
            this.beta = (this.params.beta !== undefined);
            this.hasNoSearch = (numParams === 1 && (this.params.debug || this.params.beta));
        } else {
            this.hasNoSearch = true;
            this.resetFilterModel();
        }

        this.pageService.setPageTitle(this.LANG.pageTitles.supportedDevices);

        this.company = this.CONFIG.company.name;
        this.vmsName = this.CONFIG.vmsName;
        this.placeholder = this.LANG.search.search_ipvd;

        // add hardware types and tags
        this.addFilterTags();
        this.addFilterTypes();
        this.addFilterResolutions();

        this.activate();

        this.breakpointSubscription = this.breakpointObserver
            .observe([this.breakpoint])
            .subscribe((state: BreakpointState) => {
                this.mobileDetailMode = (state.matches && this.activeCamera);
            });

        this.offsetSubscription = this.scrollMechanicsService
            .offsetSubject.pipe(delay(0))
            .subscribe(() => {
                this.scrollMechanicsService.searchViewHeight = this.searchContainer.nativeElement.clientHeight;
            });
    }

    ngAfterViewInit() {
        if (this.searchContainer && this.searchContainer.nativeElement) {
            this.scrollMechanicsService.searchViewHeight = this.searchContainer.nativeElement.clientHeight;
        }
    }

    ngOnDestroy() {}

    updateFilterModel() {
        this.filterModel.query = '';

        if (this.params.search && this.params.search.length > 0) {
            this.filterModel.query = this.params.search;
        }

        if (this.filterModel.tags && this.filterModel.tags.length) {
            this.filterModel.tags.forEach((tag: any) => {
                tag.value = false;
            });
            if (this.params.tags) {
                this.params.tags
                    .split(',')
                    .forEach((tagName) => {
                        this.filterModel.tags.find((tag) => {
                            if (tag.id === tagName) {
                                tag.value = true;
                            }
                        });
                    });
            }
        }

        if (this.filterModel.selects && this.filterModel.selects.length) {
            this.filterModel
                .selects
                .find((select) => {
                    if (this.params[select.id]) {
                        select.selected = select.items.find((item) => item.value === this.params[select.id]);
                    } else {
                        if (!select.selected) {
                            select.selected = { value: '0', name: 'All' };
                        }
                    }
                });
        }

        if (this.filterModel.multiselects && this.filterModel.multiselects.length) {
            this.filterModel
                .multiselects
                .find((select) => {
                    if (this.params[select.id]) {
                        select.selected = isArray(this.params[select.id]) ? this.params[select.id] : this.params[select.id].split(',');
                    } else {
                        select.selected = [];
                    }
                });
        }
    }

    resetFilterModel() {
        this.filterModel.search = '';
        if (this.filterModel.tags) {
            this.filterModel.tags.forEach((filter) => {
                filter.value = false;
            });
        }

        if (this.filterModel.selects) {
            this.filterModel.selects.forEach((filter) => {
                filter.selected = filter.items[0];
            });
        }

        if (this.filterModel.multiselects) {
            this.filterModel.multiselects.forEach((filter) => {
                filter.selected = [];
            });
        }

        this.filterModel = { ...this.filterModel };
    }

    addFilterResolutions() {
        this.resolutions = this.CONFIG.ipvd.supportedResolutions;

        this.filterModel.selects.push(
            {
                id      : 'resolution',
                label   : this.LANG.search.minResolution,
                items   : this.resolutions,
                selected: this.resolutions[0]
            });
    }

    addAnalyticsEvents() {
        if (this.showAnalytics && this.analytics) {
            this.filterModel.multiselects.push(
                {
                    id                 : 'analytics',
                    label              : this.LANG.search.analytics,
                    searchLabel        : this.LANG.search.analyticsSelected,
                    searchLabelSingular: '',
                    items              : this.analytics
                        .map(v => (
                            { id: v, label: v })
                        ),
                    selected: []
                });
        }
    }

    setActiveCamera() {
        if (this.params.camera) {
            this.uri.pageOffset = window.pageYOffset;
            const selectedCamera = this.cameras.find((camera) => camera.model === this.params.camera);
            this.activateCamera(selectedCamera);
        }
    }

    addFilterTags() {
        this.filterModel.tags = this.CONFIG.ipvd.searchTags;

        if (!this.showAnalytics) {
            this.filterModel.tags = this.filterModel.tags.filter((tag) => tag.id !== 'isAnalyticsSupported');
        }

        this.filterModel.tags.forEach((tag: any) => {
            tag.label = this.LANG.ipvd[tag.id];
        });
    }

    addFilterTypes() {
        this.hardwareTypes = this.CONFIG.ipvd.supportedHardwareTypes;
        this.hardwareTypes.forEach(type => {
            type.label = this.LANG.ipvd[type.id];
        });

        this.filterModel.multiselects = [
            {
                id      : 'hardwareTypes',
                label   : this.LANG.search.hardwareTypes,
                singular: this.LANG.search.hardwareType,
                items   : this.hardwareTypes,
                selected: []
            }
            // vendors will be added later
        ];
    }

    modelChanged(model) {
        this.filterModel = NxUtilsService.deepCopy(model);
        this.searchVendor();
    }

    reset() {
        this.cameraReloadSubscription = this.cloudApi
            .reloadIPVD()
            .subscribe();
    }

    activate() {
        this.cameraGetSubscription = this.cloudApi
            .getIPVD()
            .subscribe(data => {
                this.cameras = data.cameras;

                this.analytics = data.analytics;

                this.showAnalytics = this.CONFIG.ipvd.showAnalyticsEvents || this.debug || this.beta;
                this.addAnalyticsEvents();
                this.addFilterTags();

                this.vendors = data.vendors;
                this.vendors.sort(NxUtilsService.byParam((elm) => {
                    return elm.name.toLowerCase();
                }, NxUtilsService.sortASC));

                // reformat vendors to fit the multiselect component
                this.filterModel
                    .multiselects.unshift(
                        {
                            id      : 'vendors',
                            label   : this.LANG.search.vendors,
                            singular: this.LANG.search.vendor,
                            items   : this.vendors.map(v => (
                                { id: v.name, label: v.name }
                            )),
                            selected: []
                        });

                this.updateFilterModel();
                this.searchVendor();
                // Trigger model change for search component
                this.filterModel = { ...this.filterModel };
            });
    }

    // restrict the parameters to be passed and viewed for to cam-table (based on allowedParameters)
    preFilterCameraTable(cameras) {
        const values = Object.keys(cameras).map(key => cameras[key]);
        const filteredCameras = [];
        values.forEach(camera => {
            const filteredCamera = Object.keys(camera)
                .filter(key => this.allowedParameters.indexOf(key) > -1 || key === 'sortKey')
                .reduce((obj, key) => {
                    obj[key] = camera[key];
                    return obj;
                }, {});
            filteredCameras.push(filteredCamera);
        });
        return filteredCameras;
    }

    filterEmpty() {
        let tags = false;
        if (this.filterModel.tags) {
            tags = this.filterModel.tags.find(tag => tag.value === true);
        }

        let multiselect = false;
        if (this.filterModel.multiselects) {
            this.filterModel.multiselects.forEach(select => {
                multiselect = multiselect || (select.selected.length > 0);
            });
        }

        let singleselect = false;
        if (this.filterModel.selects) {
            this.filterModel.selects.forEach(select => {
                singleselect = singleselect || (select.selected && select.selected.value > 0); // 0 is default choice
            });
        }

        return tags || multiselect || singleselect || this.filterModel.query !== '';
    }

    searchVendor() {
        if (!this.params.camera && this.activeCamera) {
            this.resetActiveCamera();
        }

        if (this.cameras && this.cameras.length) {
            if (this.filterEmpty()) {
                const filteredCameras: any = this.cameraSearchService.ipvdSearch(this.cameras, this.filterModel);

                this.noResult = (filteredCameras.length === 0);
                if (!this.noResult) {
                    this.camerasTable = this.preFilterCameraTable(filteredCameras);
                } else {
                    this.camerasTable = [];
                }
                this.setActiveCamera();
            } else {
                this.hasNoSearch = true;
                this.noResult = false;
                this.camerasTable = [];
                this.resetActiveCamera();

                const queryParams: Params = {};
                // we need these to be only defined or undefined
                queryParams.debug = (this.debug) ? true : undefined;
                queryParams.beta = (this.beta) ? true : undefined;
                this.uri.resetURI(this.uriPath, queryParams);

                this.params = queryParams;
            }
        }
    }

    setVendor(vendor) {
        this.filterModel.query = vendor;
        this.searchVendor();
        return false;
    }

    activateCamera(elementSelected: any): void {
        if (!elementSelected) {
            return;
        }
        if (Object.keys(elementSelected).length === 0 || elementSelected.key === -1) {
            // call was not initiated by linking the element in HTML
            // this.resetActiveCamera();
            return;
        }

        const selectedCamera = this.cameras.find((camera) => {
            return camera.sortKey === (elementSelected.sortKey || elementSelected.value.sortKey);
        });

        if (this.activeCamera && this.activeCamera.sortKey === selectedCamera.sortKey) {
            return;
        }
        this.activeCamera = { ...selectedCamera };
        this.showAll = false;

        const queryParams: Params = {};
        queryParams.camera = selectedCamera.model || selectedCamera.value.model;

        this.uri
            .updateURI(this.uriPath, queryParams)
            .catch(error => {
                console.error(error);
            });

        if (this.breakpointObserver.isMatched(this.breakpoint)) {
            this.mobileDetailMode = true;
        }

        this.toggleCamview = true;
        setTimeout(() => {
            this.scrollMechanicsService.elementViewWidth = this.viewContainer.nativeElement.clientWidth;
            this.scrollMechanicsService.elementTableWidth = this.tableContainer.nativeElement.clientWidth - 8/* -gutter */;
        }, 500);
    }

    openFeedback(param) {
        const type = (param === 'device') ? this.CONFIG.dialogs.message.type.ipvd_device : this.CONFIG.dialogs.message.type.ipvd_page;
        const device: string = (param === 'device' && this.activeCamera) ? this.activeCamera.model : '';
        const data: MessageParams = {
            disclaimer: this.LANG.privacyPolicy.ipvd,
            asset     : device
        };
        this.dialogs
            .message(this.accountService, type, data)
            .then(() => {
            });

        return false;
    }

    resetActiveCamera(skipUpdateURI?) {
        if (!this.activeCamera) {
            return;
        }

        if (!skipUpdateURI) {
            const queryParams: Params = {};
            queryParams.camera = undefined;

            this.uri
                .updateURI(this.uriPath, queryParams)
                .catch(error => {
                    console.error(error);
                });
        }

        this.activeCamera = undefined;
        this.mobileDetailMode = false;
        this.toggleCamview = false;

        this.scrollMechanicsService.elementTableWidth = 0;
    }
}
