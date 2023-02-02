import {
    Component,
    Inject,
    Input,
    Renderer2,
    ViewChild
} from '@angular/core';
import type { NgForm } from '@angular/forms';

import staticLang from '@common/language/language_i18n_static.json';
import { DIALOG_DATA, DialogRef } from '@dialogs/dialog-ref';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import type { NxSystem } from '@services/system.service/system';
import type {
    NxEc2LocalUser,
} from '@services/system.service/user-manager/user-manager-types';
import { pickFrom } from '@utils/general';

@Component({
    selector: 'nx-modal-change-password',
    templateUrl: 'change-password.component.html',
    styleUrls: []
})
export class ChangePasswordModalContent {
    @Input() closable = true;

    LANG = staticLang;

    system: NxSystem;
    user: NxEc2LocalUser;
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
        private processService: NxProcessService,
        private dialogRef: DialogRef,
        @Inject(DIALOG_DATA) private dialogData: any,
    ) {
        this.newPasswordForUser = '';
        this.currentPasswordForUser = '';
        this.confirmNewPasswordForUser = '';
    }

    public get isMe(): boolean {
        return this.user.isLocalOwner && this.user.isMe;
    }

    ngOnInit(): void {
        pickFrom(this.dialogData, ['system', 'user'], this);

        this.changePassword = this.processService
            .createProcess(() => {
                const updatedUser = {
                    ...this.user,
                    password: this.newPasswordForUser
                };

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
                        return this.system.userManager
                            .saveUser(updatedUser)
                            .then(() => this.close(true));
                    }, () => {
                        this.changePasswordForm.controls.currentPassword.setErrors({ wrongPassword: true });
                        this.renderer.selectRootElement('#currentPassword').focus();
                        return Promise.reject('wrongPassword');
                    });
                }

                return this.system.userManager
                    .saveUser(updatedUser)
                    .then(() => this.close(true));
            }, {
                errorCodes: {
                    notAuthorized: this.LANG.errorCodes.oldPasswordMistmatch,
                    wrongOldPassword: this.LANG.errorCodes.oldPasswordMistmatch,
                    dontMatch: () => { },
                    wrongPassword: () => { }
                },
                successMessage: this.LANG.account.passwordChangedSuccess,
                errorPrefix: this.LANG.errorCodes.cantChangePasswordPrefix,
                ignoreUnauthorized: true
            });
    }

    close = (msg: boolean = false): void => {
        this.dialogRef.close(msg);
    };
}
