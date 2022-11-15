import {
    Component,
    OnInit,
    ViewChild,
    ViewContainerRef,
    Inject,
    OnDestroy
} from '@angular/core';
import { NgForm } from '@angular/forms';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';

import { NxMenuService } from '@app/menu/menu.service';
import staticLang from '@common/language/language_i18n_static.json';
import { accountActions } from '@common/store/account';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxToastService } from '@dialogs/toast.service';
import { environment } from '@environments/environment';
import { icons, toast } from '@lib/variables/static-variables';
import { NxAccountService } from '@services/account.service';
import { Account } from '@services/account.service/account';
import { NxApplyService } from '@services/apply.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { AccountEdit } from '@services/nx-cloud-api/nx-cloud-api.types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxPageService } from '@services/page.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { NxSystemsService } from '@services/systems.service';
import { WINDOW } from '@services/window-provider';

@UntilDestroy()
@Component({
    selector: 'nx-account-settings-component',
    templateUrl: 'settings.component.html',
    styleUrls: ['settings.component.scss']
})

export class NxAccountSettingsComponent implements OnInit, OnDestroy {
    @ViewChild('pageApply', { read: ViewContainerRef, static: true }) private pageApply: ViewContainerRef;
    @ViewChild('accountForm', { read: NgForm }) private accountForm: NgForm;

    CONFIG: IConfig;
    LANG = staticLang;

    account: Account;
    langCode: string;
    isSystemOwner = true;
    hideErrors = true;
    icons: {
        dir: string;
    };

    private saveAccount: Process;
    private langChanged = false;

    constructor(
        configService: NxConfigService,
        translateService: TranslateService,
        private processService: NxProcessService,
        private cloudApiService: NxCloudApiService,
        private systemsService: NxSystemsService,
        private accountService: NxAccountService,
        private dialogs: NxDialogsService,
        private menuService: NxMenuService,
        private applyService: NxApplyService,
        private pageService: NxPageService,
        private toastService: NxToastService,
        private store: Store,
        @Inject(WINDOW) protected window: Window,
    ) {
        this.CONFIG = configService.getConfig();
        this.menuService.detail = 'settings';
        this.icons = icons;

        translateService.onTranslationChange
            .pipe(untilDestroyed(this))
            .subscribe(() => {
                setTimeout(() => {
                    this.pageService.pageTitle(this.LANG.pageTitles.account);
                    this.initProcess();
                    if (this.langChanged) {
                        this.langChanged = false;
                        this.toastService.notify(
                            this.LANG.account.accountSavedSuccess,
                            toast.success,
                        );
                    }
                });
            });
    }

    ngOnInit(): void {
        this.applyService.initPageFormsWatcher(this.pageApply);

        this.initProcess();

        this.accountService
            .get(true)
            .then(account => {
                if (account?.email) {
                    this.account = { ...account };
                    if (!environment.isLocal && !this.systemsService.isPolling) {
                        this.systemsService.getSystems(account.email);
                    }
                    this.isUserASystemOwner();

                    setTimeout(() => {
                        // both form are inside *ngIf="account"
                        // otherwise they should be in ngAfterViewInit
                        this.applyService.createFormWatcher(
                            'accountForm',
                            this.accountForm,
                            this.saveAccount
                        );
                    });
                }
            });
    }

    ngOnDestroy(): void {
        this.applyService.removeWatchers();
    }

    private initProcess(): void {
        this.saveAccount = undefined;
        this.saveAccount = this.processService.createProcess(() => {
            // Optimistic update
            const { first_name, last_name } = this.account;
            this.store.dispatch(
                accountActions.updateCurrentUser({
                    update: { first_name, last_name }
                })
            );
            return this.cloudApiService.accountPost(this.account);
        }, {
            errorPrefix: this.LANG.errorCodes.cantChangeAccountPrefix,
            logoutForbidden: true
        }, (res: AccountEdit) => {
            const { first_name, last_name } = res;
            this.store.dispatch(
                accountActions.updateCurrentUser({
                    update: { first_name, last_name }
                })
            );
            this.toastService.notify(
                this.LANG.account.accountSavedSuccess,
                toast.success,
            );
        }, () => {
        });
    }

    changeLanguage(langCode: string): void {
        this.langChanged = true;
        this.langCode = langCode;
        this.store.dispatch(
            accountActions.updateCurrentUser({ update: { language: langCode } })
        );
    }

    private isUserASystemOwner(): void {
        this.systemsService.systemsSubject.subscribe(systems => {
            this.isSystemOwner = systems.some(system => {
                return system.accessRole === 'owner';
            });
        });
    }

    deleteUser(): void {
        this.dialogs.deleteCloudUser(this.cloudApiService)
            .then(res => {
                if (res && res.resultCode === 'ok') {
                    this.accountService.logout();
                }
            });
    }
}
