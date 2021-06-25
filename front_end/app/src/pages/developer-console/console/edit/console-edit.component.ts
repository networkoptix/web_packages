import { Component, ViewChild, ViewContainerRef } from '@angular/core';
import { NxToastService } from '@dialogs/toast.service';
import { NxApplyService, Watcher } from '@services/apply.service';
import { IConfig, NxConfigService } from '@services/nx-config';
import { NxProcessService, Process } from '@services/process.service';

export enum DataStructureType {
    TEXT='text',
    DROPDOWN='dropdown'
}

interface DataStructureMeta {
    options: { name: any, value: any }[]
}

export interface DataStructure<Value = any> {
    title: string,
    key: string,
    type: DataStructureType,
    value: Value,
    tag?: string,
    placeholder?: string,
    description?: string,
    meta?: DataStructureMeta
}

interface ContextStruct {
    heading: string,
    structures: DataStructure[]
}

// TODO: Replace with struct from cms
const mockStructures: DataStructure[] = [
    {
        key         : 'email',
        title       : 'Support E-mail',
        tag         : '%SupportE-mail%',
        value       : 'test@test.com',
        type        : DataStructureType.TEXT,
        placeholder : 'email address',
        description : 'E-mail customers should use for support.'
    },
    {
        key         : 'phone',
        title       : 'Support Phone',
        tag         : '%SupportPhone%',
        value       : '123-456-7890',
        type        : DataStructureType.TEXT,
        placeholder : 'phone number',
        description : 'Phone number customers should use for support. (Ex. (573) 884-1878 | +1 (573) 884-1878 | +(591) 7433433 | 0591 74339296 | +1 555 555 5554)'
    },
    {
        key         : 'url',
        title       : 'Support URL',
        tag         : '%SupportURL%',
        value       : 'www.test.com',
        type        : DataStructureType.TEXT,
        placeholder : 'website',
        description : 'Web address customers should use for support. Example: http://support.google.com, https://www.yahoo.com/support'
    }

];

const mockContext: ContextStruct = {
    heading    : 'Context Header',
    structures : mockStructures
};

@Component({
    selector    : 'console-edit',
    templateUrl : 'console-edit.component.html',
    styleUrls   : ['console-edit.component.scss']
})
export class NxDevConsoleEditComponent {
    @ViewChild('applyContainer', { read: ViewContainerRef }) applyContainer;

    CONFIG: IConfig;
    saveContext: Process;
    context: ContextStruct
    watchers: {[key: string]: Watcher<any, NxDevConsoleEditComponent>} = {}

    constructor(
        configService: NxConfigService,
        private applyService: NxApplyService,
        private processService: NxProcessService,
        private toastService: NxToastService
    ) {
        this.context = mockContext;
        this.CONFIG = configService.config;
        this.context.structures.forEach(({ key, value }) => {
            this.watchers[key] = new Watcher(value, this);
        });
    }

    ngOnInit() {
        this.saveContext = this.processService.createProcess(() => {
            // TODO: Replace process with saving to CMS once endpoint is ready
            return new Promise(resolve => setTimeout(resolve, 2500));
        }, {}, result => {
            const options = {
                classname : this.CONFIG.toast.success,
                autohide  : true,
                delay     : this.CONFIG.alertTimeout
            };
            this.toastService.show('Context Saved', options);
        }, err => { console.error(err); });
    }

    ngAfterViewInit() {
        this.applyService.initPageWatcher(
            this.applyContainer,
            this.saveContext,
            this.reset,
            Object.values(this.watchers)
        );
    }

    reset = () => {
        for (const key in this.watchers) {
            this.watchers[key].reset();
        }
    }

    updateWatcher(key, value) {
        this.watchers[key].value = value;
    }
}
