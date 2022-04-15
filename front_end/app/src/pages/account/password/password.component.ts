import {
    Component,
    OnDestroy,
    OnInit,
    ViewChild,
    ViewContainerRef
} from '@angular/core';
import { NgForm } from '@angular/forms';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxAccountService } from '@services/account.service';
import { Account } from '@services/account.service/account';
import { NxApplyService } from '@services/apply.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxPageService } from '@services/page.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { NxMenuService } from '@src/menu/menu.service';

@Component({
    selector: 'nx-account-password-component',
    templateUrl: 'password.component.html',
    styleUrls: ['password.component.scss']
})

export class NxAccountPasswordComponent implements OnInit, OnDestroy {
    @ViewChild('pageApply', { read: ViewContainerRef, static: true }) pageApply;
    @ViewChild('passwordForm', { read: NgForm }) passwordForm;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    account: Account;
    pass: any = {};
    hideErrors = true;
    weakPassword = false;

    changePassword: Process;
    passwordFormWatcher: any;

    private setupDefaults() {
        this.hideErrors = false;
        this.pass = {
            password: '',
            newPassword: ''
        };
        this.menuService.detail = 'password';
    }

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private processService: NxProcessService,
        private cloudApiService: NxCloudApiService,
        private accountService: NxAccountService,
        private dialogs: NxDialogsService,
        private menuService: NxMenuService,
        private applyService: NxApplyService,
        private pageService: NxPageService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;

        this.setupDefaults();
    }

    ngOnInit(): void {
        this.pageService.pageTitle = this.LANG.pageTitles.changePassword;
        this.applyService.initPageFormsWatcher(this.pageApply);

        this.changePassword = this.processService.createProcess(() => {
            const verifySession = () => this.dialogs.passwordVerificationCode(
                this.pass.newPassword, this.pass.password
            );
            return this.account.account2faEnabled
                ? this.cloudApiService.verify(this.pass.password)
                    .then(
                        () => verifySession(),
                        ({ error }) => error?.resultCode === 'forbidden'
                            ? verifySession()
                            : Promise.reject(error)
                    )
                : this.cloudApiService.changePassword(
                    this.pass.newPassword, this.pass.password
                );
        }, {
            errorCodes: {
                notAuthorized: this.LANG.errorCodes.oldPasswordMistmatch?.(),
                wrongOldPassword: this.LANG.errorCodes.oldPasswordMistmatch?.()
            },
            errorPrefix: this.LANG.errorCodes.cantChangePasswordPrefix?.(),
            ignoreUnauthorized: true
        }).then(() => {
            this.hideErrors = true;
            this.passwordForm.reset();
        });

        this.accountService
            .get()
            .then(account => {
                if (account) {
                    this.account = account;

                    setTimeout(() => {
                        this.passwordFormWatcher = this.applyService.createFormWatcher(
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
