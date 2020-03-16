import {
    Component,
    Input,
    Renderer2,
    ViewChild
}                                   from '@angular/core';
import { NgbActiveModal }            from '@ng-bootstrap/ng-bootstrap';
import { NxLanguageProviderService } from '../../../services/nx-language-provider';
import { NxProcessService }          from '../../../services/process.service';
import { LanguageI18NStaticTypes } from '../../../../language_i18n_static_types';
import { NxCloudApiService } from '../../../services/nx-cloud-api';

@Component({
    selector   : 'nx-modal-cloud-storage-delete-content',
    templateUrl: 'cloud-storage-delete.component.html',
    styleUrls  : []
})
export class CloudStorageDeleteModalContent {
    @Input() systemId;
    @Input() delete;
    @Input() closable;

    LANG: LanguageI18NStaticTypes;
    password: string;
    wrongPassword: boolean;
    auth = {
        password: ''
    };

    @ViewChild('deleteForm', { static: true }) deleteForm: HTMLFormElement;

    constructor(public activeModal: NgbActiveModal,
                private language: NxLanguageProviderService,
                private processService: NxProcessService,
                private renderer: Renderer2,
                private cloudApiService: NxCloudApiService
    ) {
        this.LANG = this.language.getTranslations();
    }

    ngOnInit() {
        this.auth.password = '';

        this.delete = this.processService.createProcess(() => {
            this.deleteForm.controls.password.setErrors(undefined);
            this.wrongPassword = false;
            return this.cloudApiService.deleteCloudStorage(this.systemId, this.auth.password);
        }, {
            ignoreUnauthorized: true,
            errorCodes        : {
                wrongPassword: () => {
                    this.wrongPassword = true;
                    this.auth.password = '';

                    this.renderer.selectRootElement('#password').focus();
                }
            },
            successMessage: 'Cloud Storage Successfully removed from system',
            errorPrefix   : 'Error removing cloud storage'
        }).then(() => {
            this.activeModal.close(true);
        });
    }

    close() {
        this.activeModal.close();
    }

    deleteCloudStorage() {
        this.close();
    }
}
