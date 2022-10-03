import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TranslateService } from '@ngx-translate/core';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import {
    ConfigType,
    ModalContent,
    ModalManifest,
    ModalType
} from '@components/console-table/console-table.component.types';
import {
    DropdownItem
} from '@components/dropdowns/generic/dropdown.component.types';
import {
    ConsoleMode
} from '@pages/developer-console/console/console.component.types';
import {
    NxConsoleService
} from '@pages/developer-console/console/console.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { ContentSettings, ContextManifest } from '@services/nx-cloud-api.types';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxHeaderService } from '@services/nx-header.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';

import { NxToastService } from '../toast.service';

export const manifestLookupByType = (config: IConfig, type: ModalType) => {
    const manifestKeyLookup = {
        [ModalType.CLIENT_EDIT]: 'custom-clients',
        [ModalType.CLIENT_CREATE]: 'custom-clients'
    };
    return config.manifest[manifestKeyLookup[type]];
};

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'nx-modal-edit',
    templateUrl: 'edit.component.html',
    styleUrls: ['edit.component.scss']
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
        private translate: TranslateService,
        private router: Router,
        private consoleService: NxConsoleService
    ) {
        this.CONFIG = configService.config;
        this.LANG = language.translations;
    }

    ngOnInit() {
        this.values = this.values
            ? { ...this.values }
            : this.manifest.fields.reduce((
                values, { name }
            ) => ({ ...values, [name]: '' }), {});

        const getMethod = (action: string) => {
            const [subAPI, method] = ({
                [ModalType.CLIENT_EDIT]: {
                    create: ['customClient', 'create'],
                    save: ['customClient', 'partialUpdate'],
                    delete: ['customClient', 'destroy'],
                    getVMS: ['customClient', 'getVMS']
                },
                [ModalType.CLIENT_CREATE]: {
                    create: ['customClient', 'create'],
                    save: ['customClient', 'partialUpdate'],
                    delete: ['customClient', 'destroy'],
                    getVMS: ['customClient', 'getVMS']
                }
            })[this.modal][action];
            return this.cloudApi[subAPI][method];
        };

        for (const { name, type } of this.manifest.fields) {
            if (type === ConfigType.DROPDOWN) {
                const { options = [], hidden = false } = this.settings?.[name] || {};
                const currentValue = this.values[name];
                const selected = options.find(({ value }) =>
                    value === currentValue
                ) || options[0];
                this.dropdownLookup[name] = {
                    selected,
                    options
                };
                const field = this.manifest.fields
                    .find(({ name: fieldName }) => fieldName === name);
                if (field) {
                    field.hidden = hidden || !options.length;
                }
            }
        }

        const options = {
            classname: this.CONFIG.toast.success,
            autohide: true,
            delay: this.CONFIG.alertTimeout
        };

        const updateErrors = () => {
            for (const { name, meta } of this.manifest.fields) {
                const required = meta?.options?.required;
                const missingValue = required && !this.values[name];
                if (missingValue) {
                    const existingErrors = this.errors[name] || [];
                    this.errors[name] = [
                        ...existingErrors,
                        this.translate.instant('This field is required')
                    ];
                }
            }
        };

        const createHandler = () => {
            updateErrors();
            if (Object.entries(this.errors).length) {
                return Promise.reject();
            }
            return getMethod('create')(this.values.name, this.values.base_vms);
        };

        this.createContext = this.processService.createProcess(createHandler,
            { ignoreError: true },
            _ => {
                // Need spec for saving message
                // this.toastService.show('Custom Client Created', options);
                // this.close({ id: this.values.id, action: 'create' });
            }, id => {
                switch (this.modal) {
                    case ModalType.CLIENT_CREATE:
                        if (id) {
                            this.close();
                            const [currentRoute, params = ''] = this.router.url.split('?');
                            const baseEditUrl = `${currentRoute}/${ConsoleMode.EDIT}`;
                            const assetEditUrl = `${baseEditUrl}/${id}`;
                            this.router.navigateByUrl(`${assetEditUrl}${params ? '?' + params : ''}`);
                        }
                        break;

                    default:
                        console.error(id);
                        break;
                }
            });

        const updateHandler = () => {
            updateErrors();
            if (Object.entries(this.errors).length) {
                return Promise.reject();
            }
            return getMethod('save')(this.values.id, this.values.name, this.values);
        };

        this.saveContext = this.processService.createProcess(updateHandler,
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

        this.deleteContext = this.processService.createProcess(
            () => getMethod('delete')(this.values.id),
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
