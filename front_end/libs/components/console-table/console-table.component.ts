import { CdkTableModule } from '@angular/cdk/table';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Inject, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { NxAdvancedFilterComponent } from '@components/advanced-filter/advanced-filter.component';
import {
    FilterState,
    FilterUpdatePayload,
} from '@components/advanced-filter/advanced-filter.component.types';
import {
    ConfigType,
    ConsoleManifest,
    ConsoleSection,
    ListSerializer,
    ModalType,
    OptionalFeatures,
} from '@components/console-table/console-table.component.types';
import { NxContentBlockComponent } from '@components/content-block/content-block.component';
import { NxContentBlockSectionComponent } from '@components/content-block/section/section.component';
import { DropdownItem } from '@components/dropdowns/generic/dropdown.component.types';
import { NxGenericDropdownModule } from '@components/dropdowns/generic/dropdown.module';
import { NxPaginatorComponent } from '@components/paginator/paginator.component';
import { NxPreLoaderComponent } from '@components/placeholders/pre-loader/pre-loader.component';
import { NxSearchComponent } from '@components/search/search.component';
import { NxSearchHighlightComponent } from '@components/search-highlight/search-highlight.component';
import { ToastType } from '@components/toast-container/toast.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { DirectivesModule } from '@directives/directives.module';
import { NxConsoleService } from '@pages/developer-console/console/console.service';
import { ConsoleMode } from '@pages/developer-console/console/console.types';
import { PipesModule } from '@pipes/pipes.module';
import { NxMenusService } from '@services/menus.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { CustomClientAPI } from '@services/nx-cloud-api/custom-client-api';
import {
    ContentManifest,
    ContextManifest,
    DocAsset,
} from '@services/nx-cloud-api/nx-cloud-api.types';
import { NxHeaderService } from '@services/nx-header.service';
import { NxToastService } from '@services/toast.service';
import { WINDOW } from '@services/window-provider';
import { icons, manifest } from '@static-variables';
import { NgChanges } from '@utils/ng-changes';

import { PackageHandler, PackageProgress } from './package-handler';
import { TableDataSource } from './table-data-source';

@UntilDestroy()
@Component({
    selector: 'nx-console-table',
    templateUrl: 'console-table.component.html',
    styleUrls: ['console-table.component.scss'],
    imports: [
        CommonModule,
        FormsModule,
        DirectivesModule,
        PipesModule,
        RouterModule,
        TranslateModule,
        CdkTableModule,
        AngularSvgIconModule,
        NxAdvancedFilterComponent,
        NxContentBlockSectionComponent,
        NxContentBlockComponent,
        NxGenericDropdownModule,
        NxPaginatorComponent,
        NxPreLoaderComponent,
        NxSearchComponent,
        NxSearchHighlightComponent,
    ],
    standalone: true,
})
export class NxConsoleTableComponent {
    @Input() sectionParam: ConsoleSection;
    @Input() contextList: ContextManifest[];
    @Output() editValues = new EventEmitter();

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
    perPageSelectedOption: DropdownItem<string>;
    icons = icons;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private dialogService: NxDialogsService,
        private cloudApi: NxCloudApiService,
        private translate: TranslateService,
        private headerService: NxHeaderService,
        private menusService: NxMenusService,
        private toastService: NxToastService,
        private consoleService: NxConsoleService,
        @Inject(WINDOW) private window: Window,
    ) {
        this.route.queryParams.pipe(untilDestroyed(this)).subscribe(this.updatePageState);
    }

    async ngOnChanges({ sectionParam }: NgChanges<NxConsoleTableComponent>): Promise<void> {
        if (
            sectionParam &&
            (sectionParam.firstChange || sectionParam.currentValue !== sectionParam.previousValue)
        ) {
            this.selectedManifest = null;
            this.displayedColumns = null;
            this.selectedData = null;
            this.dataLoaded = false;

            combineLatest([
                this.update$.pipe(switchMap(this.cloudApi.getSubAPI(this.sectionParam).list)),
                this.cloudApi.getSubAPI(this.sectionParam).getManifest() as BehaviorSubject<{}>,
                this.menusService.getMenu('configuration').pipe(
                    map(
                        ({ nodes }) =>
                            NxHeaderService.findMatchFactory(`${this.base}/${this.sectionParam}`)(
                                nodes,
                            )?.assetId,
                    ),
                    switchMap(assetId =>
                        assetId
                            ? this.cloudApi.getDocAsset(assetId)
                            : Promise.resolve(null as DocAsset),
                    ),
                ),
            ]).subscribe(([list, contentManifest, docAsset]) => {
                this.contentManifest = contentManifest as ContentManifest;
                this.docAsset = docAsset;
                this.selectedManifest = manifest[this.sectionParam];
                this.displayedColumns = (this.selectedManifest?.contexts || []).map(
                    ({ name }) => name,
                );
                this.manifest = this.selectedManifest.editManifest;
                const { page = 1, search = '', perPage = 0 } = this.route.snapshot.queryParams;
                const { data } = new ListSerializer(
                    this.sectionParam,
                    this.selectedManifest,
                    (<unknown>list) as unknown[],
                    this.contentManifest.manifest.settings,
                );
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
                    this.displayedColumns.filter(
                        key => !this.selectedManifest.excludeFromSearch.includes(key),
                    ),
                    this.updatePageParam,
                );

                for (const asset of data as any[]) {
                    this.headerService.addDynamicDevConsoleNode(
                        asset,
                        `${this.base}/${this.sectionParam}/${ConsoleMode.EDIT}`,
                        this.contentManifest.manifest.contexts,
                    );
                }
                this.dataLoaded = true;
                const targetState = this.consoleService.targetState || {
                    id: this.route.snapshot.queryParams.download,
                    download: true,
                };
                if (targetState && targetState.id !== undefined) {
                    const { index, value } = this.selectedData.findElementIndex(
                        parseInt(targetState.id),
                    );
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

    #paramUpdaterFactory =
        (param: string) =>
        <Value>(value: Value) =>
            this.router.navigate([], {
                relativeTo: this.route,
                queryParams: { [param]: value },
                queryParamsHandling: 'merge',
                replaceUrl: true,
            });

    updateEditValues(asset): void {
        this.editValues.emit(asset.values);
    }

    toggleSearch(): void {
        if (!this.route.snapshot.queryParams.search || !this.showSearch) {
            this.showSearch = !this.showSearch;
        }
    }

    updateFixedWidth(column, event, defaultWidth = 0): void {
        this.fixedWidths[column] = Math.max(
            defaultWidth,
            Math.round(event.width + 24),
            this.fixedWidths[column] || 0,
        );
    }

    filterUpdaterFactory = (fieldName: string) => (payload: FilterUpdatePayload) => {
        this.filterStates[fieldName] = payload.state;
        this.selectedData.updateFilters({ [fieldName]: payload.filter }, fieldName, payload.state);
    };

    updatePageParam = this.#paramUpdaterFactory('page');

    updatePerPageParam = this.#paramUpdaterFactory('perPage');

    updateSearchParam = ({ query } = { query: '' }): void => {
        this.#paramUpdaterFactory('search')(query);
    };

    updateData(): void {
        this.update$.next('update');
    }

    updatePageState = ({ page, search, perPage = 0 }): void => {
        this.selectedData?.updateState({
            page: Math.min(parseInt(page), this.selectedData.numberOfPages$.value),
            search,
            perPage: perPage || this.selectedManifest.perPage,
        });
    };

    resetSearch(): void {
        this.updateSearchParam({ query: '' });
        this.updatePageState({ search: '', page: this.route.snapshot.params.page || '1' });
    }

    updateActiveFilter(filter: string | false = false): void {
        this.activeFilter = filter;
    }

    async handleModal(modalContent?): Promise<void> {
        const createClientModalContent = {
            modal: ModalType.CLIENT_CREATE,
            manifest: this.manifest,
            heading: this.translate.instant('devConsole.create'),
            settings: this.contentManifest.manifest.settings,
            contextList: this.contextList,
        };

        const actions = modal =>
            ({
                [ModalType.CLIENT_CREATE]: () => this.dialogService.edit(createClientModalContent),
                [ModalType.CLIENT_EDIT]: () => this.dialogService.edit(modalContent),
                // [ModalType.CLIENT_DOWNLOAD] : () => this.dialogService.downloadAsync(modalContent)
            }[modal || ModalType.CLIENT_CREATE]());

        const action = await actions(modalContent?.modal);
        if (action) {
            this.updateData();
        }
    }

    asyncInProgress = {};
    asyncErrors = {};
    cancelHandlers = {};

    handleAsync = async (asyncSettings): Promise<void> => {
        const apiLookup: Partial<Record<ModalType, ConsoleSection>> = {
            [ModalType.CLIENT_DOWNLOAD]: ConsoleSection.CUSTOM_CLIENTS,
        };

        const buildDownloadToast = (url: string): string => {
            return asyncSettings.manifest.fields[0].meta.options.toastMessage
                .replace('%NAME%', asyncSettings.values.name)
                .replace('%URL%', url);
        };

        const notifyDownload = (url: string): void => {
            this.toastService.show(buildDownloadToast(url), ToastType.Success, { showHTML: true });
        };

        const { generatePackage, checkPackage, getDownloadUrl } = this.cloudApi.getSubAPI(
            apiLookup[asyncSettings.modal],
        ) as CustomClientAPI;
        const packageHandler = new PackageHandler(
            asyncSettings.values.id,
            generatePackage,
            checkPackage,
            getDownloadUrl,
            this.window,
            notifyDownload,
        );
        this.asyncErrors[asyncSettings.lookupKey] = false;
        this.asyncInProgress[asyncSettings.lookupKey] =
            asyncSettings.manifest.fields[1].meta?.options?.pending;
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
                    this.asyncInProgress[asyncSettings.lookupKey] = `(${
                        state ? Math.floor(state.current / state.total) : 0
                    }%)`;
            }
        });
    };

    updateTableSize({ width, height }): void {
        this.noResultsHeight = height;
        this.noResultsWidth = width;
    }

    handleIgnoreActive(event, ignore): void {
        this.ignoreActive = ignore;
        event.stopPropagation();
    }
}
