import {
    Component,
    OnDestroy,
    OnInit,
    ViewChild,
    ViewContainerRef
} from '@angular/core';
import { NgForm } from '@angular/forms';

import { NxMenuService } from '@app/menu/menu.service';
import staticLang from '@common/language/language_i18n_static.json';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxToastService } from '@lib/dialogs/toast.service';
import { NxAccountService } from '@services/account.service';
import { Account } from '@services/account.service/account';
import { NxApplyService } from '@services/apply.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';

@Component({
    selector: 'nx-account-password-component',
    templateUrl: 'password.component.html',
    styleUrls: ['password.component.scss']
})

export class NxAccountPasswordComponent implements OnInit, OnDestroy {
    @ViewChild('pageApply', { read: ViewContainerRef, static: true }) private pageApply: ViewContainerRef;
    @ViewChild('passwordForm', { read: NgForm }) private passwordForm: NgForm;

    LANG = staticLang;

    account: Account;
    pass = { password: '', newPassword: '' };
    hideErrors = false;
    weakPassword = false;

    private changePassword: Process;

    constructor(
        private processService: NxProcessService,
        private cloudApiService: NxCloudApiService,
        private accountService: NxAccountService,
        private dialogs: NxDialogsService,
        private menuService: NxMenuService,
        private applyService: NxApplyService,
        private toastService: NxToastService
    ) {
        this.menuService.detail = 'password';
    }

    ngOnInit(): void {
        this.applyService.initPageFormsWatcher(this.pageApply);

        this.changePassword = this.processService.createProcess(() => {
            const verifySession = (): Promise<unknown> => {
                return this.dialogs.passwordVerificationCode(
                    this.pass.newPassword,
                    this.pass.password
                );
            };
            return this.account.account2faEnabled
                ? this.cloudApiService.verify(this.pass.password)
                    .then(
                        () => verifySession(),
                        ({ error }) => error?.resultCode === 'forbidden'
                            ? verifySession()
                            : Promise.reject(error)
                    )
                : this.cloudApiService.changePassword(
                    this.pass.newPassword,
                    this.pass.password
                );
        }, {
            errorCodes: {
                notAuthorized: this.LANG.errorCodes.oldPasswordMistmatch,
                wrongOldPassword: this.LANG.errorCodes.oldPasswordMistmatch,
                badRequest: this.LANG.errorCodes.oldPasswordMistmatch,
            },
            errorPrefix: this.LANG.errorCodes.cantChangePasswordPrefix,
            ignoreUnauthorized: true
        }, () => {
            this.toastService.notify(this.LANG.authorize.newPassConfirmText, 'success');
            this.hideErrors = true;
            this.passwordForm.reset();
        });

        this.accountService
            .get()
            .then(account => {
                if (account) {
                    this.account = account;

                    setTimeout(() => {
                        this.applyService.createFormWatcher(
                            'passwordForm',
                            this.passwordForm,
                            this.changePassword
                        );
                    });
                }
            });
    }

    ngOnDestroy(): void {
        this.applyService.removeWatchers();
    }
}
