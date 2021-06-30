import { DataSource }                                 from '@angular/cdk/collections';
import { Component, Input, SimpleChanges }            from '@angular/core';
import { NxDialogsService }                           from '@dialogs/dialogs.service';
import { TranslateService } from '@ngx-translate/core';
import { NxCloudApiService }                          from '@services/nx-cloud-api';
import { ContextManifest }                            from '@services/nx-cloud-api.types';
import { IConfig, NxConfigService }                   from '@services/nx-config';
import { BehaviorSubject, forkJoin, Observable }      from 'rxjs';

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

@Component({
    selector    : 'console-table',
    templateUrl : 'console-table.component.html',
    styleUrls   : ['console-table.component.scss']
})
export class NxDevConsoleTableComponent {
    @Input() sectionParam: string;

    CONFIG: IConfig
    CONFIG_TYPE = ConfigType
    base = '/developers'

    selectedManifest: ConsoleManifest;
    selectedData: TableDataSource;
    displayedColumns: string[];
    manifest: any;

    constructor(
        configService: NxConfigService,
        private dialogService: NxDialogsService,
        private cloudApi: NxCloudApiService,
        private translate: TranslateService
    ) {
        this.CONFIG = configService.config;
    }

    async ngOnChanges({ sectionParam: { currentValue, previousValue, firstChange } }: SimpleChanges) {
        if (firstChange || currentValue !== previousValue) {
            this.selectedData = this.displayedColumns = this.selectedManifest = null;
            forkJoin({
                list     : this.cloudApi.getSubAPI(this.sectionParam).list(),
                manifest : this.cloudApi.getSubAPI(this.sectionParam).getManifest()
            }).subscribe(({ list, manifest: { manifest : { contexts } } }) => {
                this.selectedManifest = this.CONFIG.manifest[this.sectionParam];
                this.displayedColumns = (this.selectedManifest?.contexts || []).map(({ name }) => name);
                this.manifest = contexts[0];
                this.selectedData = new TableDataSource(new ListSerializer(this.sectionParam, this.manifest, list).data);
            });
        };
    }

    updateData() {
        this.cloudApi.getSubAPI(this.sectionParam).list().subscribe(list => {
            this.selectedData.data$.next(new ListSerializer(this.sectionParam, this.manifest, list).data);
        });
    }

    async handleModal(modalContent?) {
        const action = await this.dialogService.edit(modalContent || { modal: ModalType.CLIENT_CREATE, manifest: this.manifest, heading: this.translate.instant('devConsole.create') });
        if (action) {
            this.updateData();
        }
    }
}

class TableDataSource extends DataSource<any> {
    data$: BehaviorSubject<any[]> = new BehaviorSubject([])

    constructor(data) {
        super();
        this.data$.next(data);
    }

    connect(): Observable<any[]> {
        return this.data$;
    }

    disconnect() {}
}
