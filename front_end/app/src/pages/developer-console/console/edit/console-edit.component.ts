import { Component, EventEmitter, Input, Output, SimpleChanges, ViewChild } from '@angular/core';
import { ActivatedRoute, Router }                                       from '@angular/router';
import { Observable }                                                   from 'rxjs';

import { NxToastService }               from '@dialogs/toast.service';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { NxCloudApiService }            from '@services/nx-cloud-api';
import { ContextManifest }              from '@services/nx-cloud-api.types';
import { IConfig, NxConfigService }     from '@services/nx-config';
import { NxProcessService, Process }    from '@services/process.service';
import { ConfigType, ConsoleSection }   from '../table/console-table.component';
import { NxConsoleService }             from '@pages/developer-console/console/console.service';

export enum DataStructureType {
    TEXT='text',
    DROPDOWN='dropdown'
}

export interface DataStructureMeta {
    options?: Record<any, any>,
    icon?: string,
    tooltip?: string,
    styles? : string
}

// export interface DataStructure<Value = any> {
//     title: string,
//     key: string,
//     type: DataStructureType,
//     value: Value,
//     tag?: string,
//     placeholder?: string,
//     description?: string,
//     meta?: DataStructureMeta
// }

// interface ContextStruct {
//     heading: string,
//     structures: DataStructure[]
// }

// // TODO: Replace with struct from cms
// const mockStructures: DataStructure[] = [
//     {
//         key         : 'email',
//         title       : 'Support E-mail',
//         tag         : '%SupportE-mail%',
//         value       : 'test@test.com',
//         type        : DataStructureType.TEXT,
//         placeholder : 'email address',
//         description : 'E-mail customers should use for support.'
//     },
//     {
//         key         : 'phone',
//         title       : 'Support Phone',
//         tag         : '%SupportPhone%',
//         value       : '123-456-7890',
//         type        : DataStructureType.TEXT,
//         placeholder : 'phone number',
//         description : 'Phone number customers should use for support. (Ex. (573) 884-1878 | +1 (573) 884-1878 | +(591) 7433433 | 0591 74339296 | +1 555 555 5554)'
//     },
//     {
//         key         : 'url',
//         title       : 'Support URL',
//         tag         : '%SupportURL%',
//         value       : 'www.test.com',
//         type        : DataStructureType.TEXT,
//         placeholder : 'website',
//         description : 'Web address customers should use for support. Example: http://support.google.com, https://www.yahoo.com/support'
//     }
//
// ];
//
// const mockContext: ContextStruct = {
//     heading    : 'Context Header',
//     structures : mockStructures
// };

@UntilDestroy()
@Component({
    selector    : 'console-edit',
    templateUrl : 'console-edit.component.html',
    styleUrls   : ['console-edit.component.scss']
})
export class NxDevConsoleEditComponent {
    @Input() contextList: ContextManifest[] = [];
    @Input() asset: Record<any, any>;

    @ViewChild('editForm', { static: true }) editForm: HTMLFormElement;

    INPUT_TYPE = ConfigType;
    CONFIG: IConfig;
    saveContext: Process;
    context: ContextManifest;
    errors: Record<string, string[]> = {};
    downloadClick: boolean;
    // watchers: {[key: string]: Watcher<any, NxDevConsoleEditComponent>} = {};

    constructor(
        configService: NxConfigService,
        private route: ActivatedRoute,
        private router: Router,
        private processService: NxProcessService,
        private toastService: NxToastService,
        private cloudApi: NxCloudApiService,
        private consoleService: NxConsoleService
    ) {
        this.CONFIG = configService.config;
    }

    ngOnInit() {
        const getMethod = (action: string) => {
            const [subAPI, method] = ({
                [ConsoleSection.CUSTOM_CLIENTS]: {
                    save: ['customClient', 'partialUpdate']
                }
            })[this.route.snapshot.params.section][action];
            return this.cloudApi[subAPI][method];
        };
        this.saveContext = this.processService.createProcess(
            () => getMethod('save')(this.asset.id, this.asset.name, this.asset),
            { ignoreError: true },
            ({ values }) => {
                Object.entries(values).forEach(([key, value]) => {
                    this.asset.values[key] = value;
                });
                const options = {
                    classname : this.CONFIG.toast.success,
                    autohide  : true,
                    delay     : this.CONFIG.alertTimeout
                };

                this.consoleService.targetState = { id: this.asset.id, download: this.downloadClick };
                this.router.navigateByUrl(`/developers/${this.route.snapshot.params.section}`);
            },
            ({ values: errors }) => {
                this.errors = errors;
            }
        );
    }

    ngOnChanges({ contextList: { currentValue, previousValue, firstChange } }: SimpleChanges) {
        if (firstChange || currentValue !== previousValue) {
            if (!this.asset) {
                const { section, id, context } = this.route.snapshot.params;
                if (!this.contextList.length) {
                    return;
                }
                const foundContext = this.contextList.find(({ name }) => name === context);
                this.context = foundContext || this.contextList[0];
                if (!foundContext) {
                    this.router.navigateByUrl(`${context ? this.router.url.split(`/${context}`)[0] : this.router.url}/${this.context.name}`,  { replaceUrl: true });
                }
                (this.cloudApi.getSubAPI(section).retrieve(id) as Observable<any>).pipe(
                    untilDestroyed(this)
                ).subscribe(asset => {
                    if (asset && asset.values) {
                        this.asset = asset;
                    } else {
                        // Navigate up a level
                    }
                });
            }
        }
    }

    onDownloadClick = () => {
        this.downloadClick = true;
    }

    discard = () => {
        this.consoleService.targetState = { id: this.asset.id, download: false };
        this.router.navigateByUrl(`/developers/${this.route.snapshot.params.section}`);
    }

    // addWatchers = () => this.context?.fields.forEach(({ name }) => {
    //     this.watchers[name] = new Watcher(this.values.values[name] || '', this);
    //
    //     this.applyService.initPageWatcher(
    //         this.applyContainer,
    //         this.saveContext,
    //         this.reset,
    //         Object.values(this.watchers)
    //     );
    // });

    // getValues = () => Object.entries(
    //     this.watchers
    // ).reduce((values, [key, watcher]) => ({ ...values, [key]: watcher.value }),{})

    // reset = () => {
    //     for (const key in this.watchers) {
    //         this.watchers[key].reset();
    //     }
    // }

    // updateWatcher(key, value) {
    //     this.watchers[key].value = value;
    //     this.errors = {};
    // }
}
