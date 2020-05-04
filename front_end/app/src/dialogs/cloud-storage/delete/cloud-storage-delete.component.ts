import {
    Component,
    Input,
    Renderer2,
    ViewChild,
    OnInit
}                                    from '@angular/core';
import { NgbActiveModal }            from '@ng-bootstrap/ng-bootstrap';
import { BehaviorSubject }           from 'rxjs';
import { NxLanguageProviderService } from '../../../services/nx-language-provider';
import { NxProcessService, Process } from '../../../services/process.service';
import { NxSystem }                  from '../../../services/system.service';
import { NxCloudApiService }         from '../../../services/nx-cloud-api';
import { LanguageI18NStaticTypes }   from '../../../../language_i18n_static_types';

@Component({
    selector    : 'nx-modal-cloud-storage-delete-content',
    templateUrl : 'cloud-storage-delete.component.html',
    styleUrls   : []
})
export class CloudStorageDeleteModalContent implements OnInit {
    @Input() system$: BehaviorSubject<NxSystem>;
    @Input() updateCallback: () => void;
    @Input() closable: boolean;

    LANG: LanguageI18NStaticTypes;
    wrongPassword: boolean;
    delete: Process;

    systemId = '';
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
        this.system$.subscribe(system => {
            this.systemId = system.id;
        });

        this.delete = this.processService.createProcess(() => {
            this.deleteForm.controls.password.setErrors(undefined);
            this.wrongPassword = false;
            const { LANG } = this;
            return this.cloudApiService.deleteCloudStorage(this.systemId, this.auth.password);
        }, {
            ignoreUnauthorized : true,
            errorCodes         : {
                wrongPassword: () => {
                    this.wrongPassword = true;
                    this.auth.password = '';

                    this.renderer.selectRootElement('#password').focus();
                }
            },
            // TODO: These messages and errorCodes will be implemented on a future ticket
            successMessage : this.LANG.dialogs.cloudStorage.remove.success,
            errorPrefix    : this.LANG.dialogs.cloudStorage.remove.errorPrefix
        }).then(() => {
            this.updateCallback();
            this.activeModal.close(true);
        });
    }

    close() {
        this.activeModal.close();
    }
}
