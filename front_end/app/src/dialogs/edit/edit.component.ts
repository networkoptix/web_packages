import { Component, Input }            from '@angular/core';
import { NgbActiveModal }              from '@ng-bootstrap/ng-bootstrap';
import { UntilDestroy }                from '@ngneat/until-destroy';

import { NxConfigService, IConfig }  from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import { NxToastService }            from '../toast.service';
import { LanguageI18NStaticTypes }   from '../../../language_i18n_static_types';
import { ModalContent, ModalType }   from '@pages/developer-console/console/table/console-table.component';
import { DataStructureType }         from '@pages/developer-console/console/edit/console-edit.component';
import { ContextManifest }           from '@services/nx-cloud-api.types';
import { NxCloudApiService }         from '@services/nx-cloud-api';

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
    @Input() id: number;
    @Input() heading: string;
    @Input() modal: ModalType;
    @Input() values: Record<string, any>;
    @Input() manifest: ContextManifest;

    STRUCTURE_TYPE = DataStructureType
    errors: Record<string, string[]> = {};
    processDisabled = false;
    name = '';
    nameStructure;
    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;
    createContext: Process;
    saveContext: Process;
    deleteContext: Process;

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        public activeModal: NgbActiveModal,
        private processService: NxProcessService,
        private toastService: NxToastService,
        private cloudApi: NxCloudApiService
    ) {
        this.CONFIG = configService.config;
        this.LANG = language.translations;
    }

    ngOnInit() {
        this.nameStructure = manifestLookupByType(this.CONFIG, this.modal).contexts[0];
        if (!this.values) {
            this.values = this.manifest.fields.reduce((values, { name }) => ({ ...values, [name]: '' }), {});
        } else {
            this.values = { ...this.values };
        }
        const getMethod = (action: string) => {
            const [subAPI, method] = ({
                [ModalType.CLIENT_EDIT]: {
                    create : ['customClient', 'create'],
                    save   : ['customClient', 'partialUpdate'],
                    delete : ['customClient', 'destroy']
                },
                [ModalType.CLIENT_CREATE]: {
                    create : ['customClient', 'create'],
                    save   : ['customClient', 'partialUpdate'],
                    delete : ['customClient', 'destroy']
                }
            })[this.modal][action];
            return this.cloudApi[subAPI][method];
        };

        const options = {
            classname : this.CONFIG.toast.success,
            autohide  : true,
            delay     : this.CONFIG.alertTimeout
        };

        this.createContext = this.processService.createProcess(() => getMethod('create')(this.name, this.values),
            {},
            _ => {
                // Need spec for saving message
                this.toastService.show('Custom Client Created', options);
                this.close({ id: this.id, action: 'create' });
            }, err => { console.error(err); });

        this.saveContext = this.processService.createProcess(() => getMethod('save')(this.id, undefined, this.values),
            { ignoreError: true },
            _ => {
                // Need spec for saving message
                this.toastService.show('Custom Client Saved', options);
                this.close({ id: this.id, action: 'save' });
            },
            ({ values: errors }) => {
                this.errors = errors;
                this.processDisabled = true;
            });

        this.deleteContext = this.processService.createProcess(() => getMethod('delete')(this.id),
            {},
            _ => {
                // Need spec for saving deleting message
                this.toastService.show('Custom Client Deleted', options);
                this.close({ id: this.id, action: 'delete' });
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
}
