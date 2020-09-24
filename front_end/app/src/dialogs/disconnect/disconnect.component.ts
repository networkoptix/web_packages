import {
    Component, Input,
    Renderer2, ViewChild
}                         from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { of }             from 'rxjs';

import { environment }                     from '../../../environments/environment';
import { NxLanguageProviderService }       from '../../services/nx-language-provider';
import { NxProcessService }                from '../../services/process.service';
import { NxSystemAPI, NxSystemAPIService } from '../../services/system-api.service';
import { LanguageI18NStaticTypes }         from '../../../language_i18n_static_types';

@Component({
    selector : 'nx-modal-disconnect-content',
    templateUrl : 'disconnect.component.html',
    styleUrls : []
})
export class DisconnectModalContent {
    @Input() account;
    @Input() system;
    @Input() disconnect;
    @Input() closable;

    isLocal: boolean;
    LANG: LanguageI18NStaticTypes;
    password: string;
    wrongPassword: boolean;
    auth = {
        username : '',
        password : ''
    };

    hideErrors = true;
    mediaServerApi: NxSystemAPI;

    @ViewChild('disconnectForm', { static: true }) disconnectForm: HTMLFormElement;

    constructor(
        language: NxLanguageProviderService,
        public activeModal: NgbActiveModal,
        private processService: NxProcessService,
        private renderer: Renderer2,
        private systemApiService: NxSystemAPIService,
    ) {
        this.LANG = language.translations;
        this.isLocal = environment.isLocal;
    }

    ngOnInit() {
        this.auth.password = '';
        this.account
            .get()
            .then((account) => {
                if (account) {
                    this.auth.username = this.isLocal ? account.first_name : account.email;
                }
            });

        this.disconnect = this.processService.createProcess(() => {
            this.disconnectForm.controls.password.setErrors(undefined);
            this.wrongPassword = false;

            if (this.isLocal) {
                return this.disconnectLocal(this.auth.password);
            }
            return this.account.disconnect(this.system.id, this.auth.password);
        }, {
            ignoreUnauthorized : true,
            errorCodes         : {
                wrongPassword: () => {
                    this.wrongPassword = true;
                    this.auth.password = '';

                    this.renderer.selectRootElement('#password').focus();
                }
            },
            successMessage : this.LANG.toastMessage.system.disconnected.success(),
            errorPrefix    : this.LANG.errorCodes.cantDisconnectSystemPrefix()
        }).then(() => {
            this.activeModal.close(true);
        });
    }

    close() {
        this.activeModal.close();
    }

    private disconnectLocal(password) {
        this.mediaServerApi = this.systemApiService
            .createConnection(undefined, undefined, undefined, () => of(''));

        return this.mediaServerApi.disconnectFromCloud(password);
    }
}
