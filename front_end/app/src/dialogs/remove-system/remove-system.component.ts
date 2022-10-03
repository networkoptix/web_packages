import {
    Component,
    Input,
    Renderer2,
    ViewChild
} from '@angular/core';
import type { NgForm } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxToastService } from '@dialogs/toast.service';
import { environment } from '@environments/environment';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService } from '@services/process.service';
import { NxSystemAPI } from '@services/system-api.service';

@Component({
    selector: 'nx-modal-remove-model-content',
    templateUrl: 'remove-system.component.html',
    styleUrls: []
})
export class RemoveSystemModalContent {
    @Input() system;
    @Input() disconnectFromAccount;
    @Input() closable;

    isLocal: boolean;
    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;
    password: string;
    wrongPassword: boolean;
    auth = {
        username: '',
        password: ''
    };

    hideErrors = true;
    mediaServerApi: NxSystemAPI;

    @ViewChild('disconnectAccountForm', { static: true }) disconnectAccountForm: NgForm;

    constructor(
        language: NxLanguageProviderService,
        configService: NxConfigService,
        public activeModal: NgbActiveModal,
        private processService: NxProcessService,
        private renderer: Renderer2,
        private toastService: NxToastService
    ) {
        this.LANG = language.translations;
        this.CONFIG = configService.getConfig();
        this.isLocal = environment.isLocal;
    }

    credentialErrorHandler = () => {
        this.wrongPassword = true;
        this.auth.password = '';

        this.renderer.selectRootElement('#password').focus();
        return true;
    }

    ngOnInit() {
        this.auth.username = this.system.userManager.currentUserEmail;
        this.auth.password = '';

        this.disconnectFromAccount = this.processService.createProcess(() => {
            this.disconnectAccountForm.controls.password.setErrors(undefined);
            this.wrongPassword = false;
            return this.system.deleteFromCurrentAccount(this.auth.password);
        }, {
            ignoreUnauthorized: true,
            errorCodes: {
                accountBlocked: this.credentialErrorHandler,
                notAuthorized: this.credentialErrorHandler
            },
            errorPrefix: this.LANG.errorCodes.cantUnshareWithMeSystemPrefix()
        }, () => {
            this.activeModal.close(true);
            const options = {
                classname: this.CONFIG.toast.success,
                autohide: true,
                delay: this.CONFIG.alertTimeout
            };
            const msg = this.LANG.toastMessage.system.deleted.success({
                systemName: this.system.info.systemName || this.system.info.name
            });
            this.toastService.show(msg, options);
        }, err => console.error(err));
    }

    close() {
        this.activeModal.close();
    }
}
