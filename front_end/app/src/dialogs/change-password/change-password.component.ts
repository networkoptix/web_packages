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
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';
import type { NxSystem } from '@services/system.service/system';
import type {
    NxSystemUser
} from '@services/system.service/user-manager/user-manager-types';
import { pickFrom } from '@utils/general';

@Component({
    selector: 'nx-modal-change-password',
    templateUrl: 'change-password.component.html',
    styleUrls: []
})
export class ChangePasswordModalContent {
    @Input() closable = true;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;

    system: NxSystem;
    user: NxSystemUser;
    changePassword: Process;
    newPasswordForUser: string;
    currentPasswordForUser: string;
    confirmNewPasswordForUser: string;
    hideErrors = true;
    currentPasswordToggle = true;
    confirmPasswordToggle = true;

    @ViewChild('changePasswordForm') changePasswordForm: NgForm;

    constructor(
        private renderer: Renderer2,
        private language: NxLanguageProviderService,
        private processService: NxProcessService,
        private configService: NxConfigService,
        private dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: any,
    ) {
        this.CONFIG = this.configService.getConfig();
        this.LANG = this.language.translations;
        this.newPasswordForUser = '';
        this.currentPasswordForUser = '';
        this.confirmNewPasswordForUser = '';
    }

    public get isMe(): boolean {
        return this.user.isLocalOwner && this.user.isMe;
    }

    ngOnInit() {
        pickFrom(this.dialogData, ['system', 'user'], this);

        this.changePassword = this.processService
            .createProcess(() => {
                this.user.password = this.newPasswordForUser;

                if (this.isMe) {
                    if (this.confirmNewPasswordForUser !== this.newPasswordForUser) {
                        this.changePasswordForm.controls.confirmNewPassword.setErrors({ dontMatch: true });
                        this.renderer.selectRootElement('#confirmNewPassword').focus();
                        return Promise.reject('dontMatch');
                    }

                    return this.system.mediaserver.loginToken(
                        'admin',
                        this.currentPasswordForUser,
                        true
                    ).toPromise().then(() => {
                        return this.system
                            .saveUser(this.user, this.user.role)
                            .then(() => this.close(true));
                    }, () => {
                        this.changePasswordForm.controls.currentPassword.setErrors({ wrongPassword: true });
                        this.renderer.selectRootElement('#currentPassword').focus();
                        return Promise.reject('wrongPassword');
                    });
                }

                return this.system
                    .saveUser(this.user, this.user.role)
                    .then(() => this.close(true));
            }, {
                errorCodes: {
                    notAuthorized: this.LANG.errorCodes.oldPasswordMistmatch?.(),
                    wrongOldPassword: this.LANG.errorCodes.oldPasswordMistmatch?.(),
                    dontMatch: () => {},
                    wrongPassword: () => {}
                },
                successMessage: this.LANG.account.passwordChangedSuccess?.(),
                errorPrefix: this.LANG.errorCodes.cantChangePasswordPrefix?.(),
                ignoreUnauthorized: true
            });
    }

    close = (msg: string | boolean = false) => {
        this.dialogRef.close(msg);
    };
}
