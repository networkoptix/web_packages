import {
    Component,
    Input,
    Renderer2,
    ViewChild
} from '@angular/core';
import type { NgForm } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxConfigService, IConfig } from '@services/nx-config';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxProcessService, Process } from '@services/process.service';

@Component({
    selector: 'nx-modal-change-password',
    templateUrl: 'change-password.component.html',
    styleUrls: []
})
export class ChangePasswordModalContent {
    @Input() system;
    @Input() user;
    @Input() closable;

    LANG: LanguageI18NStaticTypes;
    CONFIG: IConfig;
    changePassword: Process;
    newPasswordForUser: string;
    currentPasswordForUser: string;
    confirmNewPasswordForUser: string;
    hideErrors = true;
    currentPasswordToggle = true;
    confirmPasswordToggle = true;

    @ViewChild('changePasswordForm') changePasswordForm: NgForm;

    constructor(
        public activeModal: NgbActiveModal,
        private renderer: Renderer2,
        private language: NxLanguageProviderService,
        private processService: NxProcessService,
        private configService: NxConfigService
    ) {
        this.CONFIG = this.configService.getConfig();
        this.LANG = this.language.translations;
        this.newPasswordForUser = '';
        this.currentPasswordForUser = '';
        this.confirmNewPasswordForUser = '';
    }

    public get isMe (): boolean {
        return this.user.isLocalOwner && this.user.isMe;
    }

    public closeModal = (result: boolean = false) => {
        return this.activeModal.close(result);
    }

    ngOnInit() {
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
                            .then(() => this.closeModal(true));
                    }, () => {
                        this.changePasswordForm.controls.currentPassword.setErrors({ wrongPassword: true });
                        this.renderer.selectRootElement('#currentPassword').focus();
                        return Promise.reject('wrongPassword');
                    });
                }

                return this.system
                    .saveUser(this.user, this.user.role)
                    .then(() => this.closeModal(true));
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
}
