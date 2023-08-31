import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { CommonModule } from '@angular/common';
import {
    Component,
    Inject,
    Renderer2,
    ViewChild,
    OnInit,
    AfterViewInit,
    computed,
} from '@angular/core';
import type { NgForm } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { NxPasswordComponent } from '@components/password-input/password.component';
import { NxPasswordValidationComponent } from '@components/password-input-validation/password-validation.component';
import { NxProcessButtonComponent } from '@components/process-button/process-button.component';
import { NxProcessCancelButtonComponent } from '@components/process-cancel-Button/process-cancel-button.component';
import { ToastType } from '@components/toast-container/toast.types';
import type { ChangePassword as DT } from '@dialogs/dialogs.types';
import { ModalBase } from '@dialogs/modal-base';
import staticLang from '@language_static';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { NxUser } from '@services/system-user.types';
import type { NxSystem } from '@services/system.service/system';
import { NxToastService } from '@services/toast.service';
import { assignFrom } from '@utils/general';

@Component({
    selector: 'nx-modal-change-password',
    templateUrl: 'change-password.component.html',
    styleUrls: [],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,

        NxPasswordComponent,
        NxPasswordValidationComponent,
        NxProcessButtonComponent,
        NxProcessCancelButtonComponent,
    ],
})
export class ChangePasswordModalContent
    extends ModalBase<DT['return']>
    implements OnInit, AfterViewInit
{
    LANG = staticLang;

    system: NxSystem;
    user: NxUser;
    changePassword: Process;
    newPasswordForUser: string;
    currentPasswordForUser: string;
    confirmNewPasswordForUser: string;
    hideErrors = true;
    currentPasswordToggle = true;
    confirmPasswordToggle = true;

    @ViewChild('changePasswordForm') private changePasswordForm: NgForm;

    constructor(
        private renderer: Renderer2,
        private processService: NxProcessService,
        private toastService: NxToastService,
        dialogRef: DialogRef<DT['return']>,
        @Inject(DIALOG_DATA) private dialogData: DT['data'],
    ) {
        super(dialogRef);
        this.newPasswordForUser = '';
        this.currentPasswordForUser = '';
        this.confirmNewPasswordForUser = '';
    }

    isLocalOwner = computed(() => {
        if (!this.system || !this.user) {
            return false;
        }
        const currentUser = this.system.permissionManager.currentUser();
        return this.user.isLocalOwner && this.user.id === currentUser.id;
    });

    ngOnInit(): void {
        assignFrom(this.dialogData, ['system', 'user'], this);

        this.changePassword = this.processService.createProcess(
            () => {
                this.lock();
                const updatedUser = {
                    ...this.user,
                    password: this.newPasswordForUser,
                };

                if (this.isLocalOwner()) {
                    if (this.confirmNewPasswordForUser !== this.newPasswordForUser) {
                        this.changePasswordForm.controls.confirmNewPassword.setErrors({
                            dontMatch: true,
                        });
                        this.renderer.selectRootElement('#confirmNewPassword').focus();
                        return Promise.reject('dontMatch');
                    }

                    return this.system.mediaserver
                        .loginToken('admin', this.currentPasswordForUser, true)
                        .toPromise()
                        .then(
                            () => {
                                return this.system.userManager
                                    .saveUser(updatedUser)
                                    .then(() => this.close(true));
                            },
                            () => {
                                this.changePasswordForm.controls.currentPassword.setErrors({
                                    wrongPassword: true,
                                });
                                this.renderer.selectRootElement('#currentPassword').focus();
                                return Promise.reject('wrongPassword');
                            },
                        );
                }

                return this.system.userManager.saveUser(updatedUser).then(() => this.close(true));
            },
            {
                errorCodes: {
                    notAuthorized: this.LANG.errorCodes.oldPasswordMistmatch,
                    wrongOldPassword: this.LANG.errorCodes.oldPasswordMistmatch,
                    dontMatch: () => {},
                    wrongPassword: () => {},
                },
                successMessage: this.LANG.account.passwordChangedSuccess,
                errorPrefix: this.LANG.errorCodes.cantChangePasswordPrefix,
                ignoreUnauthorized: true,
                ignoreError: true,
            },
            undefined,
            () => {
                this.toastService.notify(
                    this.LANG.dialogs.updateSession.changePassword,
                    ToastType.Warning,
                );
                this.unlock();
            },
        );
    }

    ngAfterViewInit(): void {
        setTimeout(() => {
            this.renderer.selectRootElement('.modal-body input')?.focus();
        });
    }

    override close = (msg: DT['return'] = false): void => {
        this.dialogRef.close(msg);
    };
}
