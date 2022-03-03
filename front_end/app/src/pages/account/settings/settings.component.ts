import {
    Component,
    OnInit,
    ViewChild,
    ViewContainerRef,
    Inject,
    OnDestroy
} from '@angular/core';
import { NgForm } from '@angular/forms';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { environment } from '@environments/environment';
import { NxAccountService, Account } from '@services/account.service';
import { NxApplyService } from '@services/apply.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxPageService } from '@services/page.service';
import { NxProcessService, Process } from '@services/process.service';
import { NxStorageService } from '@services/storage.service';
import { NxSystemsService } from '@services/systems.service';
import { WINDOW } from '@services/window-provider';
import { NxMenuService } from '@src/menu/menu.service';

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

    private setupDefaults() {
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
        @Inject(WINDOW) protected window: Window
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = this.languageService.translations;
        this.langCode = this.languageService.currentLang;
        this.setupDefaults();
    }

    ngOnInit() {
        this.pageService.pageTitle = this.LANG.pageTitles.account();
        this.applyService.initPageFormsWatcher(this.pageApply);

        this.saveLang = this.processService.createProcess(() => {
            return this.cloudApiService.changeLanguage(this.langCode);
        }, {}).then(result => {
            this.storageService.langChanged = true;
            this.window.location.reload();
        });

        this.saveAccount = this.processService.createProcess(() => {
            return this.cloudApiService.accountPost(this.account);
        }, {
            successMessage: this.LANG.account.accountSavedSuccess(),
            errorPrefix: this.LANG.errorCodes.cantChangeAccountPrefix(),
            logoutForbidden: true
        }).then(() => {
            // account info was changed successful (local and on server)
            // really no need to force update -- TT
            // this.accountService.get(true);
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

    ngOnDestroy() {
        this.applyService.removeWatchers();
    }

    changeLanguage(langCode: string) {
        this.langCode = langCode;
    }

    isUserASystemOwner() {
        this.systemsService.systemsSubject.subscribe((systems: any[]) => {
            this.isSystemOwner = systems.some(system => {
                return system.accessRole === 'owner';
            });
        });
    }

    displayErrors = () => {
        this.hideErrors = false;
    };

    deleteUser() {
        this.dialogs.deleteCloudUser(this.cloudApiService)
            .then((res: any) => {
                if (res && res.resultCode === 'ok') {
                    this.accountService.logout();
                }
            });
    }
}
