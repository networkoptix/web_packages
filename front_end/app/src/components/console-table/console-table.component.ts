import { DataSource }                                 from '@angular/cdk/collections';
import {
    Component, EventEmitter, Inject, Input, Output, SimpleChanges
}                                                     from '@angular/core';
import { ActivatedRoute, Router }                     from '@angular/router';
import { NxDialogsService }                           from '@dialogs/dialogs.service';
import { UntilDestroy, untilDestroyed }               from '@ngneat/until-destroy';
import { TranslateService }                           from '@ngx-translate/core';
import { map, switchMap }                             from 'rxjs/operators';
import md5                                            from 'md5';

import { CustomClientAPI, NxCloudApiService }                from '@services/nx-cloud-api';
import {
    ContentManifest, ContentSettings, ContextManifest, DocAsset
}                                                            from '@services/nx-cloud-api.types';
import { IConfig, NxConfigService }                          from '@services/nx-config';
import { BehaviorSubject, combineLatest, Observable }        from 'rxjs';
import { NxHeaderService }                                   from '@services/nx-header.service';
import { NxMenusService }                                    from '@services/menus.service';
import { PackageHandler, PackageProgress }                   from '@dialogs/download-async/download-async.component';
import { WINDOW }                                            from '@services/window-provider';
import { NxToastService }                                    from '@dialogs/toast.service';
import { NxUriService }                                      from '@services/uri.service';
import { NxConsoleService }                                  from '@pages/developer-console/console/console.service';
import { FilterState, FilterUpdatePayload }                  from '@components/advanced-filter/advanced-filter.component';
import { DropdownItem }                                      from '@components/dropdowns/generic/dropdown.component';
import { ConsoleMode }                                       from '@pages/developer-console/console/console.component';
import { DataStructureMeta }                                 from '@pages/developer-console/console/edit/console-edit.component';

export enum ConfigType {
    TEXT='text',
    HTML='html',
    DATE='date',
    COMMENTS='comments',
    STATUS='status',
    ICON_LINK='icon_link',
    ICON_MODAL='icon_modal',
    ASYNC_HANDLER='async_handler',
    DROPDOWN='dropdown'
}

export interface ColumnConfig {
    type: ConfigType,
    name: string,
    label: string,
    description?: string,
    placeholder?: string,
    hidden?: boolean,
    meta?: DataStructureMeta
}

enum ActionType {
    PRIMARY='primary',
    SECONDARY='secondary',
    SUCCESS='success',
    DANGER='danger',
    WARNING='warning',
    INFO='info'
}

interface ActionConfig {
    title: string,
    modal: ModalType,
    subheading?: string,
    icon?: string,
    type?: ActionType,
}

export interface ModalManifest {
    label: string,
    fields: ColumnConfig[]
}

export enum OptionalFeatures {
    FILTER='filter',
    SEARCH='search',
    PER_PAGE='perPage'
}

export interface ConsoleManifest {
    // intro?: {
    //     title: string,
    //     content: string
    // },
    sort: number,
    title: string,
    url: string,
    icon: string
    perPage: number,
    pagesToShow: number,
    searchSubheading: string,
    noResultsMessage: string,
    minItemsAdvanced: number,
    disabled: Record<OptionalFeatures, boolean>,
    perPageOptions: DropdownItem[],
    excludeFromSearch: string[],
    contexts: ColumnConfig[],
    editManifest: ModalManifest,
    downloadManifest: ModalManifest,
    actions: ActionConfig[]
}

export enum ModalType {
    CLIENT_EDIT='client-edit',
    CLIENT_CREATE='client-create',
    CLIENT_DOWNLOAD='client-download'
}

export interface ModalContent {
    id?: number,
    modal: ModalType,
    heading?: string,
    values?: Record<string, any>
}

export enum ConsoleSection {
    CUSTOM_CLIENTS='custom-clients'
}

export class ListSerializer<Initial, Serialized> {
    #serializer: (data: Initial[]) => Serialized[]
    editManifest: ModalManifest;
    downloadManifest: ModalManifest;
    data: Serialized[] = []

    constructor(
        route: string,
        manifest: ConsoleManifest,
        initialData?: Initial[],
        private contentSettings?: ContentSettings
    ) {
        this.editManifest = manifest.editManifest;
        this.downloadManifest = manifest.downloadManifest;
        switch (route) {
            case 'custom-clients':
                this.#serializer = this.#customClientsSerializer;
                break;
            default:
                this.#serializer = (data: unknown) => data as Serialized[];
        }
        if (initialData?.length) {
            this.update(initialData);
        }
    }

    update(data) {
        this.data = this.#serializer(data);
    }

    #customClientsSerializer = (data) => {
        const createHash = (values: Record<any, any>) => md5(JSON.stringify(Object.entries(values).sort(([aKey], [bKey]) => aKey < bKey ? 1 : -1)));
        const createDownloadAsyncValues = ({ values: _, ...values }) => ({
            modal     : ModalType.CLIENT_DOWNLOAD,
            heading   : this.downloadManifest.label,
            manifest  : this.downloadManifest,
            settings  : this.contentSettings || {},
            lookupKey : createHash(values),
            values
        });
        const createSettingsModalValues = ({ values: _, ...values }) => ({
            modal    : ModalType.CLIENT_EDIT,
            heading  : this.editManifest.label,
            manifest : this.editManifest,
            settings : this.contentSettings || {},
            values
        });

        return data.map(
            item => ({
                ...item,
                downloadAsync : createDownloadAsyncValues(item),
                settingsModal : createSettingsModalValues(item)
            }));
    }
}

@UntilDestroy()
@Component({
    selector    : 'console-table',
    templateUrl : 'console-table.component.html',
    styleUrls   : ['console-table.component.scss']
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
    ignoreActive = false

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

    async ngOnChanges({ sectionParam }: SimpleChanges) {
        if (sectionParam && (sectionParam.firstChange || sectionParam.currentValue !== sectionParam.previousValue)) {
            this.selectedData = this.displayedColumns = this.selectedManifest = null;
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
                const targetState = this.consoleService.targetState;
                if (targetState && targetState.id !== undefined) {
                    const { index, value } = this.selectedData.findElementIndex(targetState.id);
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
            relativeTo          : this.route,
            queryParams         : { [param]: value },
            queryParamsHandling : 'merge',
            replaceUrl          : true
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

    updatePageParam = this.#paramUpdaterFactory('page')

    updatePerPageParam = this.#paramUpdaterFactory('perPage')

    updateSearchParam = ({ query } = { query: '' }) => {
        this.#paramUpdaterFactory('search')(query);
    }

    updateData() {
        this.update$.next('update');
    }

    updatePageState = ({ page, search, perPage = 0 }) => {
        this.selectedData?.updateState({ page: Math.min(parseInt(page), this.selectedData.numberOfPages$.value), search, perPage: perPage || this.selectedManifest.perPage });
    }

    resetSearch() {
        this.updateSearchParam({ query: '' });
        this.updatePageState({ search: '', page: this.route.snapshot.params.page || '1' });
    }

    updateActiveFilter(filter: string | false = false) {
        this.activeFilter = filter;
    }

    async handleModal(modalContent?) {
        const createClientModalContent = {
            modal       : ModalType.CLIENT_CREATE,
            manifest    : this.manifest,
            heading     : this.translate.instant('devConsole.create'),
            settings    : this.contentManifest.manifest.settings,
            contextList : this.contextList
        };

        const actions = (modal) => ({
            [ModalType.CLIENT_CREATE] : () => this.dialogService.edit(createClientModalContent),
            [ModalType.CLIENT_EDIT]   : () => this.dialogService.edit(modalContent)
            // [ModalType.CLIENT_DOWNLOAD] : () => this.dialogService.downloadAsync(modalContent)
        })[modal || ModalType.CLIENT_CREATE]();

        const action = await actions(modalContent?.modal);
        if (action) {
            this.updateData();
        }
    }

    asyncInProgress = {}
    asyncErrors = {};
    cancelHandlers = {}

    handleAsync = async(asyncSettings) => {
        const apiLookup: Partial<Record<ModalType, ConsoleSection>> = {
            [ModalType.CLIENT_DOWNLOAD]: ConsoleSection.CUSTOM_CLIENTS
        };

        const buildDownloadToast = (url) => asyncSettings.manifest.fields[0].meta.options.toastMessage.replace(
            '%NAME%', asyncSettings.values.name
        ).replace(
            '%URL%', url
        );

        const notifyDownload = (url) => {
            const options = {
                classname : this.CONFIG.toast.success,
                showHTML  : true
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
            this.asyncInProgress[asyncSettings.lookupKey] = this.asyncErrors[asyncSettings.lookupKey] = false;
            packageHandler.cancelProcess();
        };
        packageHandler.state$.pipe(untilDestroyed(this)).subscribe((state) => {
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
    }

    updateTableSize({ width, height }) {
        this.noResultsHeight = height;
        this.noResultsWidth = width;
    }

    handleIgnoreActive(event, ignore) {
        this.ignoreActive = ignore;
        event.stopPropagation();
    }
}

export type AdditionalFilter = <Data>(data: Data[]) => Data[]

class TableDataSource extends DataSource<any> {
    #baseData$: BehaviorSubject<any[]> = new BehaviorSubject([]);
    #itemsPerPage$: BehaviorSubject<number> = new BehaviorSubject(null);
    #currentPage$: BehaviorSubject<number> = new BehaviorSubject(null);
    #displayedColumns$: BehaviorSubject<string[]> = new BehaviorSubject([])
    #numberOfItems$ = new BehaviorSubject(0);
    #additionalFilters$: BehaviorSubject<Record<string, AdditionalFilter>> = new BehaviorSubject({});
    search$: BehaviorSubject<string> = new BehaviorSubject(null);
    noSearchMatches$ = new BehaviorSubject(false);
    numberOfPages$ = new BehaviorSubject(0);
    showAdvanced$ = this.#baseData$.pipe(map(data => data.length > this.minItemsAdvanced))
    minItemsAdvanced = 0;
    filterStates: Map<string, FilterState> = new Map()

    perPage$ = combineLatest([
        this.#numberOfItems$,
        this.#itemsPerPage$
    ]).pipe(
        map(([items, perPage]) => Math.min(items, perPage))
    )

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
        }))

    constructor(
        data,
        itemsPerPage = 0,
        minItemsAdvanced = 0,
        currentPage = 1,
        search = '',
        displayedColumns = [],
        private updatePageParam = (page) => console.error(`Missing param handler ${page}`)
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
