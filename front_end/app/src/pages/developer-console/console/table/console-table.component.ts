import { DataSource }                                 from '@angular/cdk/collections';
import { Component, Input, SimpleChanges }            from '@angular/core';
import { ActivatedRoute, Router }                     from '@angular/router';
import { NxDialogsService }                           from '@dialogs/dialogs.service';
import { UntilDestroy, untilDestroyed }               from '@ngneat/until-destroy';
import { TranslateService }                           from '@ngx-translate/core';
import { map, switchMap }                                        from 'rxjs/operators';

import { NxCloudApiService }                                 from '@services/nx-cloud-api';
import { ContentManifest, ContentSettings, ContextManifest, DocAsset } from '@services/nx-cloud-api.types';
import { IConfig, NxConfigService }                          from '@services/nx-config';
import { BehaviorSubject, combineLatest, Observable }        from 'rxjs';
import { ConsoleMode }                                       from '../console.component';
import { DataStructureMeta }                                 from '../edit/console-edit.component';
import { NxHeaderService } from '@services/nx-header.service';
import { NxMenusService } from '@services/menus.service';

export enum ConfigType {
    TEXT='text',
    DATE='date',
    COMMENTS='comments',
    STATUS='status',
    ICON_LINK='icon_link',
    ICON_MODAL='icon_modal',
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
    modal: ModalType
    type?: ActionType,
}

export interface ModalManifest {
    label: string,
    fields: ColumnConfig[]
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
    searchable: boolean,
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
            this.data = this.#serializer(initialData);
        }
    }

    update(data) {
        this.data = this.#serializer(data);
    }

    #customClientsSerializer = (data) => {
        const createDownloadModalValues = ({ values: _, ...values }) => ({
            modal    : ModalType.CLIENT_DOWNLOAD,
            heading  : this.downloadManifest.label,
            manifest : this.downloadManifest,
            settings : this.contentSettings || {},
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
                downloadModal : createDownloadModalValues(item),
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
export class NxDevConsoleTableComponent {
    @Input() sectionParam: ConsoleSection;

    CONFIG: IConfig;
    CONFIG_TYPE = ConfigType;
    CONSOLE_MODE = ConsoleMode;
    base = '/developers';
    noResultsHeight = 0;
    noResultsWidth = 0;
    dataLoaded = false;

    selectedManifest: ConsoleManifest;
    selectedData: TableDataSource;
    displayedColumns: string[];
    manifest: any;
    contentManifest: ContentManifest;
    docAsset: DocAsset;

    constructor(
        configService: NxConfigService,
        private route: ActivatedRoute,
        private router: Router,
        private dialogService: NxDialogsService,
        private cloudApi: NxCloudApiService,
        private translate: TranslateService,
        private headerService: NxHeaderService,
        private menusService: NxMenusService
    ) {
        this.CONFIG = configService.config;
        this.route.queryParams.pipe(untilDestroyed(this)).subscribe(this.updatePageState);
    }

    async ngOnChanges({ sectionParam: { currentValue, previousValue, firstChange } }: SimpleChanges) {
        if (firstChange || currentValue !== previousValue) {
            this.selectedData = this.displayedColumns = this.selectedManifest = null;
            this.dataLoaded = false;

            combineLatest([
                this.cloudApi.getSubAPI(this.sectionParam).list(),
                this.cloudApi.getSubAPI(this.sectionParam).getManifest(),
                this.menusService.getMenu('header').pipe(
                    map(({ nodes }) => this.headerService.findMatchFactory(`${this.base}/${this.sectionParam}`)(nodes)?.assetId),
                    switchMap(assetId => assetId ? this.cloudApi.getDocAsset(assetId) : Promise.resolve(null as DocAsset))
                )
            ]).subscribe(([list, contentManifest, docAsset]) => {
                this.contentManifest = contentManifest as ContentManifest;
                this.docAsset = docAsset;
                this.selectedManifest = this.CONFIG.manifest[this.sectionParam];
                this.displayedColumns = (this.selectedManifest?.contexts || []).map(({ name }) => name);
                this.manifest = this.selectedManifest.editManifest;
                const { page = 1, search = '' } = this.route.snapshot.queryParams;
                this.selectedData = new TableDataSource(
                    new ListSerializer(this.sectionParam, this.selectedManifest, list, this.contentManifest.settings).data,
                    this.selectedManifest.perPage,
                    parseInt(page),
                    search,
                    this.displayedColumns.filter(key => !this.selectedManifest.excludeFromSearch.includes(key)),
                    this.updatePageParam
                );
                this.dataLoaded = true;
            });
        };
    }

    #paramUpdaterFactory = (param: string) => <Value>(value: Value) => this.router.navigate(
        [],
        {
            relativeTo          : this.route,
            queryParams         : { [param]: value },
            queryParamsHandling : 'merge'
        }
    );

    updatePageParam = this.#paramUpdaterFactory('page')

    updateSearchParam = ({ query }) => {
        this.#paramUpdaterFactory('search')(query);
    }

    updateData() {
        this.cloudApi.getSubAPI(this.sectionParam).list().subscribe(list => {
            this.selectedData.updateBaseData(new ListSerializer(this.sectionParam, this.manifest, list, this.contentManifest.settings).data);
        });
    }

    updatePageState = ({ page, search }) => {
        this.selectedData?.updateState({ page: Math.min(parseInt(page), this.selectedData.numberOfPages$.value), search });
    }

    async handleModal(modalContent?) {
        const createClientModalContent = {
            modal    : ModalType.CLIENT_CREATE,
            manifest : this.manifest,
            heading  : this.translate.instant('devConsole.create'),
            settings : this.contentManifest.settings
        };

        const actions = (modal) => ({
            [ModalType.CLIENT_CREATE]   : () => this.dialogService.edit(createClientModalContent),
            [ModalType.CLIENT_EDIT]     : () => this.dialogService.edit(modalContent),
            [ModalType.CLIENT_DOWNLOAD] : () => this.dialogService.downloadAsync(modalContent)
        })[modal || ModalType.CLIENT_CREATE]();

        const action = await actions(modalContent?.modal);
        if (action) {
            this.updateData();
        }
    }

    updateTableSize({ width, height }) {
        this.noResultsHeight = height;
        this.noResultsWidth = width;
    }
}

class TableDataSource extends DataSource<any> {
    #baseData$: BehaviorSubject<any[]> = new BehaviorSubject([]);
    #itemsPerPage$: BehaviorSubject<number> = new BehaviorSubject(null);
    #currentPage$: BehaviorSubject<number> = new BehaviorSubject(null);
    #displayedColumns$: BehaviorSubject<string[]> = new BehaviorSubject([])
    search$: BehaviorSubject<string> = new BehaviorSubject(null);
    noSearchMatches$ = new BehaviorSubject(false);
    numberOfPages$ = new BehaviorSubject(0)
    data$ = combineLatest([
        this.#baseData$, this.#itemsPerPage$, this.#currentPage$, this.#displayedColumns$, this.search$
    ]).pipe(
        map(([data, perPage, currentPage, displayedColumns, search]) => {
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
                }
            }
            this.noSearchMatches$.next(noSearchMatches);
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

            return data.slice(start, end);
        }))

    constructor(
        data, itemsPerPage = 0,
        currentPage = 1,
        search = '',
        displayedColumns = [],
        private updatePageParam = (page) => console.error(`Missing param handler ${page}`)
    ) {
        super();
        this.#baseData$.next(data);
        this.#itemsPerPage$.next(itemsPerPage);
        this.#currentPage$.next(currentPage);
        this.#displayedColumns$.next(displayedColumns);
        this.search$.next(search);
    }

    connect(): Observable<any[]> {
        return this.data$;
    }

    disconnect() {}

    updateBaseData(data) {
        this.#baseData$.next(data);
    }

    updateState({ page, search }) {
        this.#currentPage$.next(page || 1);
        this.search$.next(search || '');
        if (page > this.numberOfPages$.value && this.updatePageParam) {
            this.updatePageParam(this.numberOfPages$.value);
        }
    }
}
