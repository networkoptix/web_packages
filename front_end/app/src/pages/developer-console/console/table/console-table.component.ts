import { DataSource }                       from '@angular/cdk/collections';
import { Component, Input, SimpleChanges }  from '@angular/core';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { IConfig, NxConfigService }         from '@services/nx-config';
import { BehaviorSubject, Observable }      from 'rxjs';
import { DataStructure, DataStructureType } from '../edit/console-edit.component';

enum ConfigType {
    TEXT='text',
    COMMENTS='comments',
    STATUS='status',
    ICON_LINK='icon_link',
    ICON_MODAL='icon_modal'
}

interface ColumnConfig {
    type: ConfigType,
    key: string,
    title: string,
    meta?: {[key: string]:  any}
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
    type?: ActionType,
}

export interface ConsoleManifest {
    intro?: {
        title: string,
        content: string
    },
    structure: ColumnConfig[],
    actions: ActionConfig[]
}

export const customClientManifest: ConsoleManifest = {
    // Temporary: Remove once connected to CMS
    intro: {
        title   : 'About',
        content : 'Custom client packages are needed for creating custom clients using open-source Meta VMS client: <a href="https://github.com/networkoptix/meta_open_client">https://github.com/networkoptix/meta_open_client</a>. More about building custom VMS clients: How to build your first custom VMS client?'
    },
    structure: [
        {
            type  : ConfigType.TEXT,
            key   : 'internalName',
            title : 'Internal Name',
            meta  : {
                styles: 'font-italic'
            }
        },
        {
            type  : ConfigType.TEXT,
            key   : 'lastModified',
            title : 'Last Modified',
            meta  : {
                styles: 'expanded-width'
            }
        },
        {
            type  : ConfigType.ICON_LINK,
            key   : 'downloadLink',
            title : '',
            meta  : {
                icon    : 'eye.svg',
                tooltip : 'Download'
            }
        },
        {
            type  : ConfigType.ICON_MODAL,
            key   : 'settingsModal',
            title : '',
            meta  : {
                icon    : 'lock.svg',
                tooltip : 'Settings'
            }
        }
    ],
    actions: [
        {
            title: 'Create'
        }
    ]
};

export const mockManifest = {
    'custom-clients': customClientManifest
};

export enum ModalType {
    CLIENT_EDIT='client-edit'
}

export interface ModalContent {
    id: number,
    modal: ModalType,
    heading: string,
    structures: DataStructure[]
}

const vmsOptions = [
    { name: 'NX Meta', value: 'nx-meta' },
    { name: 'NX Witness', value: 'nx-witness' },
    { name: 'Other VMS', value: 'other-vms' }
];

const modalContent = (index): ModalContent => ({
    id         : index,
    modal      : ModalType.CLIENT_EDIT,
    heading    : 'Edit VMS Client',
    structures : [
        {
            key         : 'internalName',
            title       : 'Internal Name',
            tag         : '%InternalName',
            value       : `Custom VMS Client ${index}`,
            type        : DataStructureType.TEXT,
            placeholder : 'VMS Client Name',
            description : 'Name is hidden from external users'
        },
        {
            key   : 'baseVMS',
            title : 'Based on',
            tag   : '%BaseVMS',
            value : vmsOptions[index % 3],
            type  : DataStructureType.DROPDOWN,
            meta  : {
                options: vmsOptions
            }
        }
    ]
});

const customClients = [...Array(7).keys()].map((_, index) => ({
    // Temporary: Remove once connected to CMS
    internalName  : `VMS Client ${index}`,
    version       : `1.${index}`,
    lastModified  : '1/1/2021',
    customization : `Customization #${index}`,
    comments      : [{ name: 'someone', value: 'some comment' }, { name: 'someone else', value: 'some other comment' }],
    status        : index % 3 ? 'accepted' : 'review',
    downloadLink  : 'https://cloud-test.hdw.mx/',
    settingsModal : modalContent(index)
}));

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
    manifests: {
        [key: string]: ConsoleManifest;
    }

    selectedManifest: ConsoleManifest;
    selectedData: TableDataSource
    displayedColumns: string[]

    constructor(
        configService: NxConfigService,
        private dialogService: NxDialogsService
    ) {
        this.CONFIG = configService.config;
        // Temporary: Remove once connected to CMS
        this.manifests = mockManifest;
    }

    ngOnChanges({ sectionParam: { currentValue, previousValue, firstChange } }: SimpleChanges) {
        if (firstChange || currentValue !== previousValue) {
            this.selectedManifest = this.manifests[this.sectionParam];
            this.displayedColumns = (this.selectedManifest?.structure || []).map(({ key }) => key);

            // Temporary: Remove once connected to CMS
            this.selectedData = new TableDataSource(this.sectionParam === 'custom-clients' ? customClients : []);
        };
    }

    handleModal(modalContent) {
        this.dialogService.edit(modalContent);
    }
}

class TableDataSource extends DataSource<any> {
    data$: BehaviorSubject<any[]>

    constructor(data) {
        super();
        this.data$ = new BehaviorSubject([]);

        // Temporary: Remove once connected to CMS
        setTimeout(() => this.data$.next(data), 5000);
    }

    connect(): Observable<any[]> {
        return this.data$;
    }

    disconnect() {}
}
