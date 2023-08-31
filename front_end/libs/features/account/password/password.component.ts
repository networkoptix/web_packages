import { Component, OnDestroy, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { NgForm } from '@angular/forms';

import { ToastType } from '@components/toast-container/toast.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import staticLang from '@language_static';
import { NxMenuService } from '@menu/menu.service';
import { NxAccountService } from '@services/account.service';
import { Account } from '@services/account.service/account';
import { NxApplyService } from '@services/apply.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { NxToastService } from '@services/toast.service';

@Component({
    selector: 'nx-account-password-component',
    templateUrl: 'password.component.html',
    styleUrls: ['password.component.scss'],
})
export class NxAccountPasswordComponent implements OnInit, OnDestroy {
    @ViewChild('pageApply', { read: ViewContainerRef, static: true })
    private pageApply: ViewContainerRef;
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
        private toastService: NxToastService,
    ) {
        this.menuService.navItemId.set('password');
    }

    ngOnInit(): void {
        this.applyService.initPageFormsWatcher(this.pageApply);

        this.changePassword = this.processService.createProcess(
            () => {
                const { password: oldPass, newPassword: newPass } = this.pass;
                const verifySession = async (): Promise<string> => {
                    return this.dialogs
                        .account2faPasswordChange(oldPass, newPass)
                        .then(res =>
                            res === 'canceled' ? Promise.reject({ resultCode: res }) : res,
                        );
                };
                if (this.account.account2faEnabled) {
                    return this.cloudApiService
                        .verify(oldPass)
                        .then(verifySession, ({ error }) =>
                            error?.resultCode === 'forbidden'
                                ? verifySession()
                                : Promise.reject(error),
                        );
                } else {
                    return this.cloudApiService.changePassword(newPass, oldPass);
                }
            },
            {
                errorCodes: {
                    notAuthorized: this.LANG.errorCodes.oldPasswordMistmatch,
                    wrongOldPassword: this.LANG.errorCodes.oldPasswordMistmatch,
                    badRequest: this.LANG.errorCodes.oldPasswordMistmatch,
                    canceled: () => {}, // User closed 2fa dialog
                },
                errorPrefix: this.LANG.errorCodes.cantChangePasswordPrefix,
                ignoreUnauthorized: true,
            },
            () => {
                this.toastService.notify(
                    this.LANG.account.passwordChangedSuccess,
                    ToastType.Success,
                );
                this.hideErrors = true;
                this.passwordForm.reset();
            },
        );

        this.accountService.get().then(account => {
            if (account) {
                this.account = account;

                setTimeout(() => {
                    this.applyService.createFormWatcher(
                        'passwordForm',
                        this.passwordForm,
                        this.changePassword,
                    );
                });
            }
        });
    }

    ngOnDestroy(): void {
        this.applyService.removeWatchers();
    }
}
