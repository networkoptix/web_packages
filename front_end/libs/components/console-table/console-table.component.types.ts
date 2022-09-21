import md5 from 'md5';

import {
    DataStructureMeta
} from '@pages/developer-console/console/edit/console-edit.component.types';
import {
    ContentSettings, ContextManifest
} from '@services/nx-cloud-api/nx-cloud-api.types';

import {
    DropdownItem
} from '../dropdowns/generic/dropdown.component.types';

export enum ConfigType {
    TEXT = 'text',
    HTML = 'html',
    DATE = 'date',
    COMMENTS = 'comments',
    STATUS = 'status',
    ICON_LINK = 'icon_link',
    ICON_MODAL = 'icon_modal',
    ASYNC_HANDLER = 'async_handler',
    DROPDOWN = 'dropdown'
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

export enum ActionType {
    PRIMARY = 'primary',
    SECONDARY = 'secondary',
    SUCCESS = 'success',
    DANGER = 'danger',
    WARNING = 'warning',
    INFO = 'info'
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
    FILTER = 'filter',
    SEARCH = 'search',
    PER_PAGE = 'perPage'
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
    perPageOptions: DropdownItem<string>[],
    excludeFromSearch: string[],
    contexts: ColumnConfig[],
    editManifest: ModalManifest,
    downloadManifest: ModalManifest,
    actions: ActionConfig[]
}

export enum ModalType {
    CLIENT_EDIT = 'client-edit',
    CLIENT_CREATE = 'client-create',
    CLIENT_DOWNLOAD = 'client-download'
}

export interface ModalContent {
    id?: number,
    modal: ModalType,
    heading?: string,
    values?: Record<string, any>,
    manifest?: ModalManifest,
    settings?: ContentSettings,
    contextList?: ContextManifest[]
}

export enum ConsoleSection {
    CUSTOM_CLIENTS = 'custom-clients'
}

export class ListSerializer<Initial, Serialized> {
    #serializer: (data: Initial[]) => Serialized[];
    editManifest: ModalManifest;
    downloadManifest: ModalManifest;
    data: Serialized[] = [];

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

    update(data): void {
        this.data = this.#serializer(data);
    }

    #customClientsSerializer = data => {
        const createHash = (values: Record<any, any>) =>
            md5(
                JSON.stringify(
                    Object.entries(values)
                        .sort(([aKey], [bKey]) => aKey < bKey ? 1 : -1)
                )
            );
        const createDownloadAsyncValues = ({ values: _, ...values }) => ({
            modal: ModalType.CLIENT_DOWNLOAD,
            heading: this.downloadManifest.label,
            manifest: this.downloadManifest,
            settings: this.contentSettings || {},
            lookupKey: createHash(values),
            values
        });
        const createSettingsModalValues = ({ values: _, ...values }) => ({
            modal: ModalType.CLIENT_EDIT,
            heading: this.editManifest.label,
            manifest: this.editManifest,
            settings: this.contentSettings || {},
            values
        });

        return data.map(
            item => ({
                ...item,
                downloadAsync: createDownloadAsyncValues(item),
                settingsModal: createSettingsModalValues(item)
            }));
    };
}

export type AdditionalFilter = <Data>(data: Data[]) => Data[];
