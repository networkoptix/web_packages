import {
    Component, Input,
    Renderer2, ViewChild
}                                    from '@angular/core';
import { NgbActiveModal }            from '@ng-bootstrap/ng-bootstrap';
import { NxLanguageProviderService } from '../../services/nx-language-provider';
import { NxProcessService, Process }          from '../../services/process.service';
import { NxCloudApiService }         from '../../services/nx-cloud-api';
import { LanguageI18NStaticTypes }   from '../../../language_i18n_static_types';

@Component({
    selector : 'nx-modal-disconnect-content',
    templateUrl : 'disconnect.component.html',
    styleUrls : []
})
export class DisconnectModalContent {
    @Input() systemId;
    @Input() disconnect: Process;
    @Input() closable;

    LANG: LanguageI18NStaticTypes;
    password: string;
    wrongPassword: boolean;
    auth = {
        password: ''
    };

    @ViewChild('disconnectForm', { static: true }) disconnectForm: HTMLFormElement;

    constructor(
        language: NxLanguageProviderService,
        public activeModal: NgbActiveModal,
        private processService: NxProcessService,
        private cloudApiService: NxCloudApiService,
        private renderer: Renderer2
    ) {
        this.LANG = language.translations;
    }

    ngOnInit() {
        this.auth.password = '';

        this.disconnect = this.processService.createProcess(() => {
            this.disconnectForm.controls.password.setErrors(undefined);
            this.wrongPassword = false;

            return this.cloudApiService.disconnect(this.systemId, this.auth.password).toPromise();
        }, {
            ignoreUnauthorized : true,
            errorCodes         : {
                wrongPassword: () => {
                    this.wrongPassword = true;
                    this.auth.password = '';

                    this.renderer.selectRootElement('#password').focus();
                }
            },
            successMessage : this.LANG.toastMessage.system.disconnected.success,
            errorPrefix    : this.LANG.errorCodes.cantDisconnectSystemPrefix
        }).then(() => {
            this.activeModal.close(true);
        });
    }

    close() {
        this.activeModal.close();
    }
}
