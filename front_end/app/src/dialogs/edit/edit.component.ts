import { Component, Input } from '@angular/core';
import { NgbActiveModal }   from '@ng-bootstrap/ng-bootstrap';
import { UntilDestroy }     from '@ngneat/until-destroy';

import { NxConfigService, IConfig }         from '@services/nx-config';
import { NxLanguageProviderService }        from '@services/nx-language-provider';
import { NxProcessService, Process }        from '@services/process.service';
import { NxToastService }                   from '../toast.service';
import { LanguageI18NStaticTypes }          from '../../../language_i18n_static_types';
import {
    ConfigType, ModalContent, ModalManifest, ModalType
}                                           from '@components/console-table/console-table.component';
import { NxCloudApiService }                from '@services/nx-cloud-api';
import { DropdownItem }                     from '@components/dropdowns/generic/dropdown.component';
import { ContentSettings, ContextManifest } from '@services/nx-cloud-api.types';
import { NxHeaderService }                  from '@services/nx-header.service';
import { NxConsoleService }                 from '@pages/developer-console/console/console.service';
import { Router }                           from '@angular/router';
import { ConsoleMode }                      from '@pages/developer-console/console/console.component';

export const manifestLookupByType = (config: IConfig, type: ModalType) => {
    const manifestKeyLookup = {
        [ModalType.CLIENT_EDIT]   : 'custom-clients',
        [ModalType.CLIENT_CREATE] : 'custom-clients'
    };
    return config.manifest[manifestKeyLookup[type]];
};

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-modal-edit',
    templateUrl : 'edit.component.html',
    styleUrls   : ['edit.component.scss']
})
export class EditModalContent implements ModalContent {
    @Input() heading: string;
    @Input() modal: ModalType;
    @Input() values: Record<string, any>;
    @Input() manifest: ModalManifest;
    @Input() settings: ContentSettings;
    @Input() contextList: ContextManifest[] = [];

    STRUCTURE_TYPE = ConfigType
    errors: Record<string, string[]> = {};
    processDisabled = false;
    name = '';
    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;
    createContext: Process;
    saveContext: Process;
    deleteContext: Process;
    dropdownLookup: {
        [key: string]: {
            selected : DropdownItem,
            options  : DropdownItem[]
        }
    } = {}

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        public activeModal: NgbActiveModal,
        private processService: NxProcessService,
        private toastService: NxToastService,
        private cloudApi: NxCloudApiService,
        private headerService: NxHeaderService,
        private router: Router,
        private consoleService: NxConsoleService
    ) {
        this.CONFIG = configService.config;
        this.LANG = language.translations;
    }

    ngOnInit() {
        if (!this.values) {
            this.values = this.manifest.fields.reduce((values, { name }) => ({ ...values, [name]: '' }), {});
        }

        const getMethod = (action: string) => {
            const [subAPI, method] = ({
                [ModalType.CLIENT_EDIT]: {
                    create : ['customClient', 'create'],
                    save   : ['customClient', 'partialUpdate'],
                    delete : ['customClient', 'destroy'],
                    getVMS : ['customClient', 'getVMS']
                },
                [ModalType.CLIENT_CREATE]: {
                    create : ['customClient', 'create'],
                    save   : ['customClient', 'partialUpdate'],
                    delete : ['customClient', 'destroy'],
                    getVMS : ['customClient', 'getVMS']
                }
            })[this.modal][action];
            return this.cloudApi[subAPI][method];
        };

        for (const { name, type } of this.manifest.fields) {
            if (type === ConfigType.DROPDOWN) {
                const { options = [], hidden = false } = this.settings?.[name] || {};
                const currentValue = this.values[name];
                const selected = options.find(({ value }) => value === currentValue) || options[0];
                this.dropdownLookup[name] = {
                    selected,
                    options
                };
                const field = this.manifest.fields.find(({ name: fieldName }) => fieldName === name);
                if (field) {
                    field.hidden = hidden || !options.length;
                }
            }
        }

        const options = {
            classname : this.CONFIG.toast.success,
            autohide  : true,
            delay     : this.CONFIG.alertTimeout
        };

        this.createContext = this.processService.createProcess(() => getMethod('create')(this.values.name, this.values.base_vms),
            { ignoreError: true },
            _ => {
                // Need spec for saving message
                // this.toastService.show('Custom Client Created', options);
                // this.close({ id: this.values.id, action: 'create' });
            }, err => {
                switch (this.modal) {
                    case ModalType.CLIENT_CREATE:
                        const id = err;
                        const asset = this.consoleService.unsavedAssets[id];
                        this.close();
                        const [currentRoute, params = ''] = this.router.url.split('?');
                        const baseEditUrl = `${currentRoute}/${ConsoleMode.EDIT}`;
                        const assetEditUrl = `${baseEditUrl}/${id}`;
                        this.router.navigateByUrl(`${assetEditUrl}${params ? '?' + params : ''}`);
                        break;

                    default:
                        console.error(err);
                        break;
                }
            });

        this.saveContext = this.processService.createProcess(() => getMethod('save')(this.values.id, this.values.name, this.values),
            { ignoreError: true },
            _ => {
                // Need spec for saving message
                this.toastService.show('Custom Client Saved', options);
                this.close({ id: this.values.id, action: 'save' });
            },
            ({ values: errors }) => {
                this.errors = errors;
                this.processDisabled = true;
            });

        this.deleteContext = this.processService.createProcess(() => getMethod('delete')(this.values.id),
            {},
            _ => {
                // Need spec for saving deleting message
                this.toastService.show('Custom Client Deleted', options);
                this.close({ id: this.values.id, action: 'delete' });
            }, err => { console.error(err); });
    }

    close = (result?) => {
        this.activeModal.close(result);
    }

    clearError = (field) => {
        if (field in this.errors) {
            delete this.errors[field];
        }
        this.processDisabled = !!Object.keys(this.errors).length;
    }

    updateDropdown = (fieldName: string, item: DropdownItem) => {
        this.values[fieldName] = item.value;
    }
}
