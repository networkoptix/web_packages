import { DataSource }                                 from '@angular/cdk/collections';
import { Component, Input, SimpleChanges }            from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NxDialogsService }                           from '@dialogs/dialogs.service';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateService } from '@ngx-translate/core';
import { NxCloudApiService }                          from '@services/nx-cloud-api';
import { ContextManifest }                            from '@services/nx-cloud-api.types';
import { IConfig, NxConfigService }                   from '@services/nx-config';
import { BehaviorSubject, combineLatest, forkJoin, Observable }      from 'rxjs';
import { filter, map } from 'rxjs/operators';

export enum ConfigType {
    TEXT='text',
    DATE='date',
    COMMENTS='comments',
    STATUS='status',
    ICON_LINK='icon_link',
    ICON_MODAL='icon_modal'
}

export interface ColumnConfig {
    type: ConfigType,
    name: string,
    label: string,
    meta?: Record<string, any>
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

export interface ConsoleManifest {
    intro?: {
        title: string,
        content: string
    },
    perPage: number,
    pagesToShow: number,
    searchable: boolean,
    excludeFromSearch: string[],
    contexts: ColumnConfig[],
    actions: ActionConfig[]
}

export enum ModalType {
    CLIENT_EDIT='client-edit',
    CLIENT_CREATE='client-create'
}

export interface ModalContent {
    id?: number,
    modal: ModalType,
    heading?: string,
    values?: Record<string, any>
}

export class ListSerializer<Initial, Serialized> {
    #serializer: (data: Initial[]) => Serialized[]
    manifest;
    data: Serialized[] = []

    constructor(route: string, manifest: ContextManifest, initialData?: Initial[]) {
        this.manifest = manifest;
        switch (route) {
            case 'custom-clients':
                this.#serializer = this.#customClientsSerializer;
                break;
            default:
                this.#serializer = (data: unknown) => data as Serialized[];
        }
        if (initialData) {
            this.data = this.#serializer(initialData);
        }
    }

    update(data) {
        this.data = this.#serializer(data);
    }

    #customClientsSerializer = (data) => {
        const createDownloadLink = (item) => `/todo/create/download/link/${item.id}`;
        const createModalValues = ({ id, values }) => ({
            modal    : ModalType.CLIENT_EDIT,
            heading  : this.manifest.label,
            manifest : this.manifest,
            values,
            id
        });

        return data.map(
            item => ({
                ...item,
                downloadLink  : createDownloadLink(item),
                settingsModal : createModalValues(item)
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
    @Input() sectionParam: string;

    CONFIG: IConfig;
    CONFIG_TYPE = ConfigType;
    base = '/developers';
    noResultsHeight = 0;
    noResultsWidth = 0;
    dataLoaded = false;

    selectedManifest: ConsoleManifest;
    selectedData: TableDataSource;
    displayedColumns: string[];
    manifest: any;

    constructor(
        configService: NxConfigService,
        private route: ActivatedRoute,
        private router: Router,
        private dialogService: NxDialogsService,
        private cloudApi: NxCloudApiService,
        private translate: TranslateService
    ) {
        this.CONFIG = configService.config;
        this.route.queryParams.pipe(untilDestroyed(this)).subscribe(this.updatePageState);
    }

    async ngOnChanges({ sectionParam: { currentValue, previousValue, firstChange } }: SimpleChanges) {
        if (firstChange || currentValue !== previousValue) {
            this.selectedData = this.displayedColumns = this.selectedManifest = null;
            this.dataLoaded = false;

            forkJoin({
                list     : this.cloudApi.getSubAPI(this.sectionParam).list(),
                manifest : this.cloudApi.getSubAPI(this.sectionParam).getManifest()
            }).subscribe(({ list, manifest: { manifest : { contexts } } }) => {
                this.selectedManifest = this.CONFIG.manifest[this.sectionParam];
                this.displayedColumns = (this.selectedManifest?.contexts || []).map(({ name }) => name);
                this.manifest = contexts[0];
                const { page = 1, search = '' } = this.route.snapshot.queryParams;
                this.selectedData = new TableDataSource(
                    new ListSerializer(this.sectionParam, this.manifest, list).data,
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
            this.selectedData.updateBaseData(new ListSerializer(this.sectionParam, this.manifest, list).data);
        });
    }

    updatePageState = ({ page, search }) => {
        this.selectedData?.updateState({ page: Math.min(parseInt(page), this.selectedData.numberOfPages$.value), search });
    }

    async handleModal(modalContent?) {
        const action = await this.dialogService.edit(modalContent || { modal: ModalType.CLIENT_CREATE, manifest: this.manifest, heading: this.translate.instant('devConsole.create') });
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
