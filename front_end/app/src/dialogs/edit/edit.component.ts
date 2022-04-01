import { Component, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { UntilDestroy } from '@ngneat/until-destroy';
import { TranslateService } from '@ngx-translate/core';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import {
    ConfigType,
    ModalManifest,
    ModalType
} from '@components/console-table/console-table.component.types';
import {
    DropdownItem
} from '@components/dropdowns/generic/dropdown.component.types';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import {
    ConsoleMode
} from '@pages/developer-console/console/console.component.types';
import {
    NxConsoleService
} from '@pages/developer-console/console/console.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { ContentSettings, ContextManifest } from '@services/nx-cloud-api.types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxHeaderService } from '@services/nx-header.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import { pickFrom } from '@utils/general';

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
export class EditModalContent {
    heading: string;
    modal: ModalType;
    values: Record<string, string>;
    manifest: ModalManifest;
    settings: ContentSettings;
    contextList: ContextManifest[] = [];

    STRUCTURE_TYPE = ConfigType;
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
            selected : DropdownItem<string>,
            options : DropdownItem<string>[]
        }
    } = {};

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private processService: NxProcessService,
        private toastService: NxToastService,
        private cloudApi: NxCloudApiService,
        private headerService: NxHeaderService,
        private translate: TranslateService,
        private router: Router,
        private consoleService: NxConsoleService,
        private dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: any,
    ) {
        this.CONFIG = configService.config;
        this.LANG = language.translations;
    }

    ngOnInit(): void {
        pickFrom(
            this.dialogData,
            [
                'heading',
                'modal',
                'values',
                'manifest',
                'settings',
                'contextList',
            ],
            this
        );

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

    close = (result?: { id: string; action: string }) => {
        this.dialogRef.close(result);
    };

    clearError = field => {
        if (field in this.errors) {
            delete this.errors[field];
        }
        this.processDisabled = !!Object.keys(this.errors).length;
    };

    updateDropdown = (fieldName: string, item: DropdownItem<string>) => {
        this.values[fieldName] = item.value;
    };
}
