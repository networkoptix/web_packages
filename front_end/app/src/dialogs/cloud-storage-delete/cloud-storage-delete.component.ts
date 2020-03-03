import {
    Component,
    Input,
    Renderer2,
    ViewChild
}                                    from '@angular/core';
import { NgbActiveModal }            from '@ng-bootstrap/ng-bootstrap';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxProcessService }          from '../../services/process.service';
import { NxCloudApiService }         from '../../services/nx-cloud-api';

@Component({
    selector: 'nx-modal-cloud-storage-delete-content',
    templateUrl: 'cloud-storage-delete.component.html',
    styleUrls: []
})
export class CloudStorageDeleteModalContent {
    @Input() systemId;
    @Input() delete;
    @Input() closable;

    LANG: any;
    password: string;
    wrongPassword: boolean;
    auth = {
        password: ''
    };

    @ViewChild('deleteForm', { static: true }) deleteForm: HTMLFormElement;

    constructor(private activeModal: NgbActiveModal,
                private language: NxLanguageProviderService,
                private processService: NxProcessService,
                private cloudApiService: NxCloudApiService,
                private renderer: Renderer2
    ) {
        this.LANG = this.language.getTranslations();
    }

    ngOnInit() {
        this.auth.password = '';

        this.delete = this.processService.createProcess(() => {
            this.deleteForm.controls.password.setErrors(undefined);
            this.wrongPassword = false;
            // Need to setup new method on cloudApiService for delete cloud storage
            return this.cloudApiService.disconnect(this.systemId, this.auth.password).toPromise();
        }, {
            ignoreUnauthorized: true,
            errorCodes: {
                wrongPassword: () => {
                    this.wrongPassword = true;
                    this.auth.password = '';

                    this.renderer.selectRootElement('#password').focus();
                },
            },
            successMessage: this.LANG.toastMessage.system.disconnected.success,
            errorPrefix: this.LANG.errorCodes.cantDisconnectSystemPrefix
        }).then(() => {
            this.activeModal.close(true);
        });
    }

    close() {
        this.activeModal.close();
    }
}
