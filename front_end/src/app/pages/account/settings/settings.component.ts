import {
    Component,
    OnInit,
    ViewChild,
    ViewContainerRef,
    Inject,
    OnDestroy
} from '@angular/core';
import { NgForm } from '@angular/forms';

import { NxMenuService } from '@app/menu/menu.service';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxToastService } from '@dialogs/toast.service';
import { environment } from '@environments/environment';
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
import { NxStorageService } from '@services/storage.service';
import { NxSystemsService } from '@services/systems.service';
import { WINDOW } from '@services/window-provider';
import { LanguageI18NStaticTypes } from '@src/language_i18n_static_types';

@Component({
    selector: 'nx-account-settings-component',
    templateUrl: 'settings.component.html',
    styleUrls: ['settings.component.scss']
})

export class NxAccountSettingsComponent implements OnInit, OnDestroy {
    @ViewChild('pageApply', { read: ViewContainerRef, static: true }) pageApply;
    @ViewChild('accountForm', { read: NgForm }) accountForm;
    @ViewChild('langForm', { read: NgForm }) langForm;

    accountFormWatcher: any;
    langFormWatcher: any;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    account: Account;
    saveLang: Process;
    saveAccount: Process;
    langCode: string;
    isSystemOwner = true;
    hideErrors = true;

    private setupDefaults(): void {
        this.menuService.detail = 'settings';
    }

    constructor(
        configService: NxConfigService,
        private languageService: NxLanguageProviderService,
        private storageService: NxStorageService,
        private processService: NxProcessService,
        private cloudApiService: NxCloudApiService,
        private systemsService: NxSystemsService,
        private accountService: NxAccountService,
        private dialogs: NxDialogsService,
        private menuService: NxMenuService,
        private applyService: NxApplyService,
        private pageService: NxPageService,
        private toastService: NxToastService,
        @Inject(WINDOW) protected window: Window
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = this.languageService.translations;
        this.langCode = this.languageService.currentLang;
        this.setupDefaults();
    }

    ngOnInit(): void {
        this.pageService.pageTitle = this.LANG.pageTitles.account();
        this.applyService.initPageFormsWatcher(this.pageApply);

        this.saveLang = this.processService.createProcess(() => {
            this.storageService.langChanged = true;
            this.toastService.remove();
            return this.cloudApiService.changeLanguage(this.langCode);
        }, {}).then(() => {
            setTimeout(() => {
                this.window.location.reload();
            });
        });

        this.saveAccount = this.processService.createProcess(() => {
            this.storageService.langChanged = false;
            return this.cloudApiService.accountPost(this.account);
        }, {
            errorPrefix: this.LANG.errorCodes.cantChangeAccountPrefix(),
            logoutForbidden: true
        }).then(() => {
            this.accountService.accountSubject.next(this.accountService.accountSubject.value);
            // account info was changed successful (local and on server)
            // really no need to force update -- TT
            // this.accountService.get(true);
            if (!this.storageService.langChanged) {
                this.toastService.notify(
                    this.LANG.account.accountSavedSuccess(),
                    this.CONFIG.toast.success,
                );
            }
        }, () => {});

        this.accountService
            .get(true)
            .then(account => {
                if (account?.email) {
                    this.account = account;
                    if (!environment.isLocal && !this.systemsService.isPolling) {
                        this.systemsService.getSystems(account.email);
                    }
                    this.isUserASystemOwner();

                    setTimeout(() => {
                        // both form are inside *ngIf="account"
                        // otherwise they should be in ngAfterViewInit

                        this.accountFormWatcher = this.applyService.createFormWatcher(
                            'accountForm',
                            this.accountForm,
                            this.saveAccount
                        );

                        this.langFormWatcher = this.applyService.createFormWatcher(
                            'langForm',
                            this.langForm,
                            this.saveLang
                        );
                    });
                }
            });

        if (this.storageService && this.storageService.langChanged) {
            this.dialogs.notify(this.LANG.account.accountSavedSuccess(), 'success');
            this.storageService.langChanged = false;
        }
    }

    ngOnDestroy(): void {
        this.applyService.removeWatchers();
    }

    changeLanguage(langCode: string): void {
        this.langCode = langCode;
    }

    isUserASystemOwner(): void {
        this.systemsService.systemsSubject.subscribe((systems: any[]) => {
            this.isSystemOwner = systems.some(system => {
                return system.accessRole === 'owner';
            });
        });
    }

    displayErrors = (): void => {
        this.hideErrors = false;
    };

    deleteUser(): void {
        this.dialogs.deleteCloudUser(this.cloudApiService)
            .then((res: any) => {
                if (res && res.resultCode === 'ok') {
                    this.accountService.logout();
                }
            });
    }
}
