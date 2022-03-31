import {
    Component,
    Inject,
    Input,
    Renderer2,
    ViewChild
} from '@angular/core';
import type { NgForm } from '@angular/forms';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { NxToastService } from '@dialogs/toast.service';
import { environment } from '@environments/environment';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import { NxSystemAPI } from '@services/system-api.service';
import type { NxSystem } from '@services/system.service/system';
import { pickFrom } from '@utils/general';

@Component({
    selector: 'nx-modal-remove-model-content',
    templateUrl: 'remove-system.component.html',
    styleUrls: []
})
export class RemoveSystemModalContent {
    @Input() closable = true;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    disconnectFromAccount: Process;
    system: NxSystem;
    isLocal: boolean;
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
        private processService: NxProcessService,
        private renderer: Renderer2,
        private toastService: NxToastService,
        private dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: any,
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
    };

    ngOnInit(): void {
        pickFrom(this.dialogData, ['system'], this);

        this.auth.username = this.system.userManager.currentUserEmail;
        this.auth.password = '';

        this.disconnectFromAccount = this.processService.createProcess(() => {
            this.disconnectAccountForm.controls.password.setErrors(undefined);
            this.wrongPassword = false;
            return this.system.deleteFromCurrentAccount(this.auth.password).toPromise();
        }, {
            ignoreUnauthorized: true,
            errorCodes: {
                accountBlocked: this.credentialErrorHandler,
                notAuthorized: this.credentialErrorHandler
            },
            errorPrefix: this.LANG.errorCodes.cantUnshareWithMeSystemPrefix()
        }, () => {
            this.close(true);
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

    close = (withResult?: boolean) => {
        this.dialogRef.close(withResult);
    };
}
