import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { isPlatformBrowser, Location } from '@angular/common';
import {
    AfterViewInit,
    Component,
    ElementRef,
    Inject,
    OnInit,
    PLATFORM_ID,
    ViewChild,
    ViewEncapsulation
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { UntilDestroy } from '@ngneat/until-destroy';
import { cloneDeep } from 'lodash-es';
import { SubscriptionLike } from 'rxjs';
import { delay } from 'rxjs/operators';

import type {
    DropdownItem
} from '@components/dropdowns/generic/dropdown.component.types';
import type {
    MultiSelectItem
} from '@components/dropdowns/multi-select/multi-select.component.types';
import type { SearchFilter } from '@components/search/search.component.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import type { MessageParams } from '@dialogs/message/message.component.types';
import { NxAccountService } from '@services/account.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { Cameras, Vendors } from '@services/nx-cloud-api/nx-cloud-api.types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxPageService } from '@services/page.service';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { NxUriService } from '@services/uri.service';
import { WINDOW } from '@services/window-provider';
import {
    paramSortFunc,
    addPseudoAnchor,
    clearPseudoAnchors,
    PseudoAnchorTarget
} from '@utils/general';

import { IpvdSearchService } from './ipvd-search.service';
import type { Disclaimer, IpvdParams, FilteredCamera } from './ipvd.types';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-ipvd',
    templateUrl: 'ipvd.component.html',
    styleUrls: ['ipvd.component.scss'],
    encapsulation: ViewEncapsulation.None
})

export class NxIpvdComponent implements OnInit, AfterViewInit {
    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    targets: PseudoAnchorTarget[] = [];
    placeholder: string = '';
    company: string;
    vmsName: string;
    vendors: Vendors[] = [];
    resolution: string = '0';
    itemsPerPage: number = 15;
    query: string = '';
    cameras: Cameras[] = [];
    analytics: string[];
    activeCamera?: Cameras;
    showAll: boolean = false;
    hardwareTypes: MultiSelectItem[] = [];
    resolutions: DropdownItem<string>[] = [];
    camerasTable: FilteredCamera[] = [];
    allowedParameters: string[];
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
    disclaimerParams: Disclaimer;

    breakpointSubscription: SubscriptionLike;
    routerSubscription: SubscriptionLike;
    locationSubscription: SubscriptionLike;
    cameraReloadSubscription: SubscriptionLike;
    cameraGetSubscription: SubscriptionLike;
    windowSizeSubscription: SubscriptionLike;
    offsetSubscription: SubscriptionLike;
    getIPVDSubscription: SubscriptionLike;

    @ViewChild('viewContainer', { static: false }) viewContainer: ElementRef<HTMLDivElement>;
    @ViewChild('tableContainer', { static: false }) tableContainer: ElementRef<HTMLDivElement>;
    @ViewChild('searchContainer', { static: false }) searchContainer: ElementRef<HTMLDivElement>;
    @ViewChild('ipvdRequest', { static: false }) ipvdRequest: ElementRef<HTMLSpanElement>;

    private setupDefaults(): void {
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
            'isAnalyticsSupported',
            'count',
            'resolutionArea'
        ];

        this.uriPath = '/' +
            this.route.snapshot.parent.url.map(e => e.path).join('/');

        this.disclaimerParams = {
            companyName: this.CONFIG.company.name,
            vmsName: this.CONFIG.vmsName
        };
    }

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private cloudApi: NxCloudApiService,
        private cameraSearchService: IpvdSearchService,
        private dialogs: NxDialogsService,
        private uri: NxUriService,
        private route: ActivatedRoute,
        private location: Location,
        private breakpointObserver: BreakpointObserver,
        private router: Router,
        private pageService: NxPageService,
        private accountService: NxAccountService,
        private scrollMechanicsService: NxScrollMechanicsService,
        @Inject(PLATFORM_ID) private platformId: object,
        @Inject(WINDOW) private window: Window,
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;

        this.setupDefaults();

        if (isPlatformBrowser(this.platformId)) {
            this.routerSubscription = this.router.events.subscribe(() => {
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
        }
        );

        this.windowSizeSubscription = this.scrollMechanicsService
            .windowSizeSubject
            .subscribe(() => {
                if (this.viewContainer?.nativeElement) {
                    this.scrollMechanicsService.elementViewWidth =
                        this.viewContainer.nativeElement.clientWidth;
                }

                if (this.tableContainer?.nativeElement) {
                    let width = this.tableContainer.nativeElement.clientWidth;
                    width = this.activeCamera ? width - 8 : width; /* -gutter */
                    this.scrollMechanicsService.elementTableWidth = width;
                }
            });
    }

    ngOnInit(): void {
        // Example URI
        // /ipvd?vendors=30X&camera=IPPTZ-ELS2IRL30X-ATI
        this.params = this.route.snapshot.queryParams;
        const numParams = Object.keys(this.params).length;
        if (numParams !== 0) {
            this.debug = (this.params.debug !== undefined);
            this.beta = (this.params.beta !== undefined);
            this.hasNoSearch = numParams === 1 &&
                !!(this.params.debug || this.params.beta);
        } else {
            this.hasNoSearch = true;
            this.resetFilterModel();
        }

        this.showAnalytics =
            this.CONFIG.ipvd.showAnalyticsEvents ||
            this.debug ||
            this.beta;

        this.pageService.pageTitle = this.LANG.pageTitles.supportedDevices();

        this.company = this.CONFIG.company.name;
        this.vmsName = this.CONFIG.vmsName;
        this.placeholder = this.LANG.search.Search();

        // add hardware types and tags
        this.addFilterTags();
        this.addFilterTypes();
        this.addFilterResolutions();

        this.getIPVDData();

        this.breakpointSubscription = this.breakpointObserver
            .observe([this.breakpoint])
            .subscribe((state: BreakpointState) => {
                this.mobileDetailMode = !!(state.matches && this.activeCamera);
            });

        this.offsetSubscription = this.scrollMechanicsService
            .offsetSubject.pipe(delay(0))
            .subscribe(() => {
                this.scrollMechanicsService.searchViewHeight =
                    this.searchContainer.nativeElement.clientHeight;
            });
    }

    initPseudoAnchors(): void {
        if (this.ipvdRequest) {
            this.targets = clearPseudoAnchors(this.targets);
            const linkRequest = this.ipvdRequest.nativeElement
                .querySelector<HTMLSpanElement>('span#request');
            addPseudoAnchor(
                this.targets,
                linkRequest,
                undefined,
                'click',
                () => { this.openFeedback('page'); });
        }
    }

    ngAfterViewInit(): void {
        if (this.searchContainer?.nativeElement) {
            this.scrollMechanicsService.searchViewHeight =
                this.searchContainer.nativeElement.clientHeight;
        }
    }

    ngOnDestroy(): void {
        this.targets = clearPseudoAnchors(this.targets);
    }

    findVendorForCamera(name: string): [string] | [] {
        const camera = this.cameras.find(camera => {
            return camera.model === name;
        });

        if (camera) {
            const queryParams: IpvdParams = {};
            queryParams.vendors = camera.vendor;
            this.uri
                .updateURI(this.uri.getURL(), queryParams, true)
                .catch(error => {
                    console.error(error);
                });

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
                select.selected = select.items.find(item =>
                    item.value === this.params[select.id]
                );
            } else if (!select.selected) {
                select.selected = { value: '0', name: 'All' };
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
            label: this.LANG.search.minResolution(),
            items: this.resolutions,
            selected: this.resolutions[0]
        });
    }

    addAnalyticsEvents(): void {
        if (this.showAnalytics && this.analytics) {
            this.filterModel.multiselects.push({
                id: 'analytics',
                label: this.LANG.search.analytics(),
                searchLabel: this.LANG.search.analyticsSelected(),
                searchLabelSingular: '',
                items: this.analytics.map(v => ({ id: v, label: v })),
                selected: []
            });
        }
    }

    setActiveCamera(): void {
        if (this.params.camera) {
            this.uri.pageOffset = this.window.pageYOffset;
            const selectedCamera = this.cameras.find(camera =>
                camera.model === this.params.camera
            );
            this.activateCamera(selectedCamera);
        }
    }

    addFilterTags(): void {
        this.filterModel.tags = this.CONFIG.ipvd.searchTags;

        if (!this.showAnalytics) {
            this.filterModel.tags = this.filterModel.tags.filter(tag =>
                tag.id !== 'isAnalyticsSupported'
            );
        }

        this.filterModel.tags.forEach(tag => {
            tag.label = this.LANG.ipvd[tag.id]();
        });
    }

    addFilterTypes(): void {
        this.hardwareTypes = this.CONFIG.ipvd.supportedHardwareTypes;
        this.hardwareTypes.forEach(type => {
            type.label = this.LANG.ipvd[type.id]();
        });

        this.filterModel.multiselects = [
            {
                id: 'hardwareTypes',
                label: this.LANG.search.hardwareTypes(),
                singular: this.LANG.search.hardwareType(),
                items: this.hardwareTypes,
                selected: []
            }
            // vendors will be added later
        ];
    }

    modelChanged(model: SearchFilter): void {
        this.filterModel = cloneDeep(model);
        this.searchVendor();
    }

    getIPVDData(): void {
        if (this.debug) {
            this.cameraReloadSubscription = this.cloudApi
                .reloadIPVD()
                .subscribe(
                    () => {
                        this.activate();
                    },
                    ex => console.error(ex)
                );
            return;
        }

        this.activate();
    }

    activate(): void {
        this.getIPVDSubscription = this.cloudApi
            .getIPVD()
            .subscribe(data => {
                this.cameras = data.cameras;
                this.analytics = data.analytics;
                this.cameraSearchService.showAnalytics = this.showAnalytics;
                this.addAnalyticsEvents();
                this.addFilterTags();

                this.vendors = data.vendors;
                this.vendors.sort(
                    paramSortFunc(elm => elm.name.toLowerCase())
                );

                // reformat vendors to fit the multiselect component
                this.filterModel.multiselects.unshift({
                    id: 'vendors',
                    label: this.LANG.search.vendors(),
                    singular: this.LANG.search.vendor(),
                    items: this.vendors.map(v => ({ id: v.name, label: v.name })),
                    selected: []
                });

                this.updateFilterModel();
                // Trigger model change for search component
                this.filterModel = { ...this.filterModel };
                this.searchVendor();
            },
                ex => console.error(ex));
    }

    // restrict the parameters to be passed and viewed for to cam-table (based on allowedParameters)
    preFilterCameraTable(cameras: Cameras[]): FilteredCamera[] {
        const filteredCameras: FilteredCamera[] = [];
        cameras.forEach(camera => {
            const filteredCamera = Object.keys(camera)
                .reduce<FilteredCamera>((obj, key) => {
                    if (this.allowedParameters.includes(key)) {
                        obj[key] = camera[key];
                    }
                    return obj;
                }, { sortKey: camera.sortKey });
            filteredCameras.push(filteredCamera);
        });
        return filteredCameras;
    }

    notEmptyFilter(): boolean {
        const tags = !!this.filterModel.tags?.find(tag => tag.value);

        const multiselect = this.filterModel.multiselects?.some(select =>
            select.selected.length > 0
        );

        const singleselect = this.filterModel.selects?.some(select =>
            select.selected && select.selected.value !== '0'
            // 0 is default choice
        );

        return tags ||
            multiselect ||
            singleselect ||
            this.filterModel.query !== '';
    }

    searchVendor(): void {
        if (!this.params.camera && this.activeCamera) {
            this.resetActiveCamera();
        }

        if (this.cameras && this.cameras.length) {
            if (this.notEmptyFilter()) {
                const filteredCameras = this.cameraSearchService.ipvdSearch(
                    this.cameras,
                    this.filterModel
                );

                this.noResult = (filteredCameras.length === 0);
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

                setTimeout(() => {
                    this.initPseudoAnchors();
                });
            }
        }
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

        const selectedCamera = this.cameras.find(camera => {
            return camera.sortKey === elementSelected.sortKey;
        });

        if (
            this.activeCamera &&
            this.activeCamera.sortKey === selectedCamera.sortKey
        ) {
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

        this.toggleCamview = true;
        setTimeout(() => {
            if (
                this.viewContainer?.nativeElement &&
                this.tableContainer?.nativeElement
            ) {
                this.scrollMechanicsService.elementViewWidth =
                    this.viewContainer.nativeElement.clientWidth;
                this.scrollMechanicsService.elementTableWidth =
                    this.tableContainer.nativeElement.clientWidth - 8;
            } /* -gutter */
        }, 500);
    }

    openFeedback(param: 'device' | 'page'): false {
        const type = (param === 'device')
            ? this.CONFIG.dialogs.message.type.ipvd_device
            : this.CONFIG.dialogs.message.type.ipvd_page;
        const device = (param === 'device' && this.activeCamera)
            ? this.activeCamera.model
            : '';
        const data: MessageParams = {
            disclaimer: this.LANG.privacyPolicy.ipvd(),
            asset: device
        };
        this.dialogs
            .message(this.accountService, type, data)
            .then(() => {
            });

        return false;
    }

    resetActiveCamera(skipUpdateURI?: boolean): void {
        if (!this.activeCamera) {
            return;
        }

        if (!skipUpdateURI) {
            const queryParams: IpvdParams = {};
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
