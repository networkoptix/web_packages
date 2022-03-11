import { DataSource } from '@angular/cdk/collections';
import {
    Component,
    EventEmitter,
    Inject, Input,
    Output,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import {
    FilterState,
    FilterUpdatePayload
} from '@components/advanced-filter/advanced-filter.component';
import {
    AdditionalFilter,
    ConfigType,
    ConsoleManifest,
    ConsoleSection,
    ListSerializer,
    ModalType,
    OptionalFeatures
} from '@components/console-table/console-table.component.types';
import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { PackageHandler } from '@dialogs/download-async/download-async.component';
import { PackageProgress } from '@dialogs/download-async/download-async.component.types';
import { NxToastService } from '@dialogs/toast.service';
import { ConsoleMode } from '@pages/developer-console/console/console.component.types';
import { NxConsoleService } from '@pages/developer-console/console/console.service';
import { NxMenusService } from '@services/menus.service';
import { CustomClientAPI, NxCloudApiService } from '@services/nx-cloud-api';
import {
    ContentManifest,
    ContextManifest,
    DocAsset
} from '@services/nx-cloud-api.types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxHeaderService } from '@services/nx-header.service';
import { NxUriService } from '@services/uri.service';
import { WINDOW } from '@services/window-provider';
import { NgChanges } from '@utils/ng-changes';

export class TableDataSource extends DataSource<any> {
    #baseData$: BehaviorSubject<any[]> = new BehaviorSubject([]);
    #itemsPerPage$: BehaviorSubject<number> = new BehaviorSubject(null);
    #currentPage$: BehaviorSubject<number> = new BehaviorSubject(null);
    #displayedColumns$: BehaviorSubject<string[]> = new BehaviorSubject([]);
    #numberOfItems$ = new BehaviorSubject(0);
    #additionalFilters$: BehaviorSubject<Record<string, AdditionalFilter>> = new BehaviorSubject({});
    search$: BehaviorSubject<string> = new BehaviorSubject(null);
    noSearchMatches$ = new BehaviorSubject(false);
    numberOfPages$ = new BehaviorSubject(0);
    showAdvanced$ = this.#baseData$.pipe(map(data => data.length > this.minItemsAdvanced));
    minItemsAdvanced = 0;
    filterStates: Map<string, FilterState> = new Map();

    perPage$ = combineLatest([
        this.#numberOfItems$,
        this.#itemsPerPage$
    ]).pipe(
        map(([items, perPage]) => Math.min(items, perPage))
    );

    updateFilters(filtersToUpdate: Record<string, AdditionalFilter>, fieldName: string, filterState: FilterState) {
        if (this.filterStates.get(fieldName)?.sort !== filterState.sort) {
            this.filterStates.delete(fieldName);
        }

        this.filterStates.set(fieldName, filterState);

        this.#additionalFilters$.next({ ...this.#additionalFilters$.value, ...filtersToUpdate });
    }

    data$ = combineLatest([
        this.#baseData$, this.#itemsPerPage$, this.#currentPage$, this.#displayedColumns$, this.search$, this.#additionalFilters$
    ]).pipe(
        map(([data, perPage, currentPage, displayedColumns, search, additionalFilters]) => {
            if (!data.length) {
                return data;
            }
            let noSearchMatches = false;
            if (search && displayedColumns.length) {
                const filteredData = data.filter(data => {
                    return displayedColumns.some(key => (data[key]?.toLowerCase?.() || '').includes(search.toLowerCase()));
                });
                noSearchMatches = !filteredData.length;
                if (!noSearchMatches) {
                    data = filteredData;
                } else {
                    this.noSearchMatches$.next(true);
                    return filteredData;
                }
            }

            const sortOrder = [...this.filterStates].map(([fieldName]) => fieldName);

            data = Object.entries(additionalFilters)
                .sort(([a], [b]) => {
                    const aIndex = sortOrder.indexOf(a);
                    const bIndex = sortOrder.indexOf(b);
                    return aIndex - bIndex;
                })
                .reduce((
                    filtered, [_, filterFunc]
                ) => filterFunc(filtered), data);
            // for (const field of sortOrder) {
            //     const sortBy = this.filterStates.get(field)?.sort;
            //     if (sortBy) {
            //         const sortValue = sortBy === FilterSort.ASC ? 1 : -1;
            //         data = data.sort((a, b) =>  a[field] === b[field] ? 0 : a[field] > b[field] ? sortValue : -sortValue);
            //     }
            // }
            this.noSearchMatches$.next(false);
            const numberOfPages = Math.ceil(data.length / perPage);
            this.numberOfPages$.next(numberOfPages);
            const end = Math.min(currentPage, this.numberOfPages$.value) * perPage;
            const start = Math.min(end - perPage, data.length);

            if (currentPage > numberOfPages) {
                this.updatePageParam(numberOfPages);
                this.#currentPage$.next(numberOfPages);
            } else if (isNaN(currentPage) || currentPage < 1) {
                this.updatePageParam(1);
                this.#currentPage$.next(1);
            }

            this.#numberOfItems$.next(data.length);

            return data.slice(start, end);
        }));

    constructor(
        data,
        itemsPerPage = 3,
        minItemsAdvanced = 15,
        currentPage = 1,
        search = '',
        displayedColumns = [],
        private updatePageParam = page => console.error(`Missing param handler ${page}`)
    ) {
        super();
        this.minItemsAdvanced = minItemsAdvanced;
        this.updateBaseData(data);
        this.#itemsPerPage$.next(itemsPerPage);
        this.#currentPage$.next(currentPage);
        this.#displayedColumns$.next(displayedColumns);
        this.#numberOfItems$.next(data.length);
        this.search$.next(search);
    }

    connect(): Observable<any[]> {
        return this.data$;
    }

    disconnect() {}

    updateBaseData(data) {
        this.#baseData$.next(data);
    }

    updateState({ page, search, perPage }) {
        this.#currentPage$.next(page || 1);
        this.search$.next(search || '');
        if (page > this.numberOfPages$.value && this.updatePageParam) {
            this.updatePageParam(this.numberOfPages$.value);
        }

        if (perPage) {
            this.#itemsPerPage$.next(Math.min(perPage, this.#numberOfItems$.value));
        }
    }

    findElementIndex(id: number): { index: number, value: any } {
        const index = this.#baseData$.value.findIndex(item => item.id === id);
        return { index, value: this.#baseData$.value[index] };
    }

    indexToPage(index: number): number {
        return Math.floor(index / this.#itemsPerPage$.value) + 1;
    }
}

@UntilDestroy()
@Component({
    selector: 'console-table',
    templateUrl: 'console-table.component.html',
    styleUrls: ['console-table.component.scss']
})
export class NxConsoleTableComponent {
    @Input() sectionParam: ConsoleSection;
    @Input() contextList: ContextManifest[];
    @Output() editValues = new EventEmitter();

    CONFIG: IConfig;
    CONFIG_TYPE = ConfigType;
    CONSOLE_MODE = ConsoleMode;
    OPTIONAL_FEATURES = OptionalFeatures;
    base = '/developers';
    noResultsHeight = 0;
    noResultsWidth = 0;
    dataLoaded = false;
    showSearch = false;
    activeFilter: string | false = false;
    update$ = new BehaviorSubject(null);
    filterStates: Record<string, FilterState> = {};
    fixedWidths = {};
    noItems = false;
    ignoreActive = false;

    selectedManifest: ConsoleManifest;
    selectedData: TableDataSource;
    displayedColumns: string[];
    manifest: any;
    contentManifest: ContentManifest;
    docAsset: DocAsset;
    perPageSelectedOption: DropdownItem;

    constructor(
        configService: NxConfigService,
        private route: ActivatedRoute,
        private router: Router,
        private dialogService: NxDialogsService,
        private cloudApi: NxCloudApiService,
        private translate: TranslateService,
        private headerService: NxHeaderService,
        private menusService: NxMenusService,
        private toastService: NxToastService,
        private uriService: NxUriService,
        private consoleService: NxConsoleService,
        @Inject(WINDOW) private window: Window
    ) {
        this.CONFIG = configService.config;
        this.route.queryParams.pipe(untilDestroyed(this)).subscribe(this.updatePageState);
    }

    async ngOnChanges({ sectionParam }: NgChanges<NxConsoleTableComponent>) {
        if (sectionParam && (sectionParam.firstChange || sectionParam.currentValue !== sectionParam.previousValue)) {
            this.selectedManifest = null;
            this.displayedColumns = null;
            this.selectedData = null;
            this.dataLoaded = false;

            combineLatest([
                this.update$.pipe(switchMap(this.cloudApi.getSubAPI(this.sectionParam).list)),
                this.cloudApi.getSubAPI(this.sectionParam).getManifest(),
                this.menusService.getMenu('header').pipe(
                    map(({ nodes }) => NxHeaderService.findMatchFactory(`${this.base}/${this.sectionParam}`)(nodes)?.assetId),
                    switchMap(assetId => assetId ? this.cloudApi.getDocAsset(assetId) : Promise.resolve(null as DocAsset))
                )
            ]).subscribe(([list, contentManifest, docAsset]) => {
                this.contentManifest = contentManifest as ContentManifest;
                this.docAsset = docAsset;
                this.selectedManifest = this.CONFIG.manifest[this.sectionParam];
                this.displayedColumns = (this.selectedManifest?.contexts || []).map(({ name }) => name);
                this.manifest = this.selectedManifest.editManifest;
                const { page = 1, search = '', perPage = 0 } = this.route.snapshot.queryParams;
                const { data } = new ListSerializer(this.sectionParam, this.selectedManifest, list, this.contentManifest.manifest.settings);
                this.noItems = !data.length;
                this.showSearch ||= !!search;
                const perPageFromParam = parseInt(perPage || this.selectedManifest.perPage);
                if (!isNaN(perPageFromParam)) {
                    const name = `${perPageFromParam}`;
                    this.perPageSelectedOption = { name, value: name };
                } else {
                    const name = `${this.selectedManifest.perPage}`;
                    this.perPageSelectedOption = { name, value: name };
                }
                this.selectedData = new TableDataSource(
                    data,
                    perPageFromParam,
                    this.selectedManifest.minItemsAdvanced,
                    parseInt(page),
                    search,
                    this.displayedColumns.filter(key => !this.selectedManifest.excludeFromSearch.includes(key)),
                    this.updatePageParam
                );

                for (const asset of data as any[]) {
                    this.headerService.addDynamicDevConsoleNode(asset, `${this.base}/${this.sectionParam}/${ConsoleMode.EDIT}`, this.contentManifest.manifest.contexts);
                }
                this.dataLoaded = true;
                const targetState = this.consoleService.targetState || { id: this.route.snapshot.queryParams.download, download: true };
                if (targetState && targetState.id !== undefined) {
                    const { index, value } = this.selectedData.findElementIndex(parseInt(targetState.id));
                    const page = this.selectedData.indexToPage(index);
                    setTimeout(_ => this.updatePageParam(page));

                    if (targetState.download) {
                        this.handleAsync(value.downloadAsync);
                    }
                    this.consoleService.targetState = undefined;
                }
            });
        }
    }

    #paramUpdaterFactory = (param: string) => <Value>(value: Value) => this.router.navigate(
        [],
        {
            relativeTo: this.route,
            queryParams: { [param]: value },
            queryParamsHandling: 'merge',
            replaceUrl: true
        }
    );

    updateEditValues(asset) {
        this.editValues.emit(asset.values);
    }

    toggleSearch() {
        if (!this.route.snapshot.queryParams.search || !this.showSearch) {
            this.showSearch = !this.showSearch;
        }
    }

    updateFixedWidth(column, event, defaultWidth = 0) {
        this.fixedWidths[column] = Math.max(defaultWidth, Math.round(event.width + 24), this.fixedWidths[column] || 0);
    }

    filterUpdaterFactory = (fieldName: string) => (payload: FilterUpdatePayload) => {
        this.filterStates[fieldName] = payload.state;
        this.selectedData.updateFilters({ [fieldName]: payload.filter }, fieldName, payload.state);
    };

    updatePageParam = this.#paramUpdaterFactory('page');

    updatePerPageParam = this.#paramUpdaterFactory('perPage');

    updateSearchParam = ({ query } = { query: '' }) => {
        this.#paramUpdaterFactory('search')(query);
    };

    updateData() {
        this.update$.next('update');
    }

    updatePageState = ({ page, search, perPage = 0 }) => {
        this.selectedData?.updateState({ page: Math.min(parseInt(page), this.selectedData.numberOfPages$.value), search, perPage: perPage || this.selectedManifest.perPage });
    };

    resetSearch() {
        this.updateSearchParam({ query: '' });
        this.updatePageState({ search: '', page: this.route.snapshot.params.page || '1' });
    }

    updateActiveFilter(filter: string | false = false) {
        this.activeFilter = filter;
    }

    async handleModal(modalContent?) {
        const createClientModalContent = {
            modal: ModalType.CLIENT_CREATE,
            manifest: this.manifest,
            heading: this.translate.instant('devConsole.create'),
            settings: this.contentManifest.manifest.settings,
            contextList: this.contextList
        };

        const actions = modal => ({
            [ModalType.CLIENT_CREATE]: () => this.dialogService.edit(createClientModalContent),
            [ModalType.CLIENT_EDIT]: () => this.dialogService.edit(modalContent)
            // [ModalType.CLIENT_DOWNLOAD] : () => this.dialogService.downloadAsync(modalContent)
        })[modal || ModalType.CLIENT_CREATE]();

        const action = await actions(modalContent?.modal);
        if (action) {
            this.updateData();
        }
    }

    asyncInProgress = {};
    asyncErrors = {};
    cancelHandlers = {};

    handleAsync = async asyncSettings => {
        const apiLookup: Partial<Record<ModalType, ConsoleSection>> = {
            [ModalType.CLIENT_DOWNLOAD]: ConsoleSection.CUSTOM_CLIENTS
        };

        const buildDownloadToast = url => asyncSettings.manifest.fields[0].meta.options.toastMessage.replace(
            '%NAME%', asyncSettings.values.name
        ).replace(
            '%URL%', url
        );

        const notifyDownload = url => {
            const options = {
                classname: this.CONFIG.toast.success,
                showHTML: true
            };
            this.toastService.show(buildDownloadToast(url), options);
        };

        const {
            generatePackage,
            checkPackage,
            getDownloadUrl
        } = this.cloudApi.getSubAPI(apiLookup[asyncSettings.modal]) as CustomClientAPI;
        const packageHandler = new PackageHandler(
            asyncSettings.values.id,
            generatePackage,
            checkPackage,
            getDownloadUrl,
            this.window,
            notifyDownload
        );
        this.asyncErrors[asyncSettings.lookupKey] = false;
        this.asyncInProgress[asyncSettings.lookupKey] = asyncSettings.manifest.fields[1].meta?.options?.pending;
        this.cancelHandlers[asyncSettings.lookupKey] = () => {
            this.asyncErrors[asyncSettings.lookupKey] = false;
            this.asyncInProgress[asyncSettings.lookupKey] = false;
            packageHandler.cancelProcess();
        };
        packageHandler.state$.pipe(untilDestroyed(this)).subscribe(state => {
            switch (state.packageState) {
                case PackageProgress.PACKAGE_ERROR:
                    this.asyncErrors[asyncSettings.lookupKey] = state.errors;
                    this.asyncInProgress[asyncSettings.lookupKey] = false;
                    break;

                case PackageProgress.DOWNLOAD_READY:
                    this.asyncInProgress[asyncSettings.lookupKey] = false;
                    break;

                default:
                    this.asyncInProgress[asyncSettings.lookupKey] = `(${state ? Math.floor(state.current / state.total) : 0}%)`;
            }
        });
    };

    updateTableSize({ width, height }) {
        this.noResultsHeight = height;
        this.noResultsWidth = width;
    }

    handleIgnoreActive(event, ignore) {
        this.ignoreActive = ignore;
        event.stopPropagation();
    }
}
