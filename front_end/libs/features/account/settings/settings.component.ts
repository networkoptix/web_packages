import { Component, OnDestroy, OnInit, signal, ViewChild, ViewContainerRef } from '@angular/core';
import { NgForm } from '@angular/forms';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { filter, firstValueFrom, take } from 'rxjs';

import { accountActions } from '@common/store/account';
import { ToastType } from '@components/toast-container/toast.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import staticLang from '@language_static';
import { NxMenuService } from '@menu/menu.service';
import { NxAccountService } from '@services/account.service';
import { Account } from '@services/account.service/account';
import { NxApplyService } from '@services/apply.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import type { AccountEdit } from '@services/nx-cloud-api/nx-cloud-api.types';
import { nxConfig } from '@services/nx-config/config';
import { NxPageService } from '@services/page.service';
import { NxProcessService } from '@services/process.service';
import { Process } from '@services/process.service/process';
import { NxSystemsService } from '@services/systems.service';
import { NxToastService } from '@services/toast.service';
import { icons } from '@static-variables';
import { selectCurrentUser } from '@store/account/account.selectors';
import { paramSignal } from '@utils/signals';

@UntilDestroy()
@Component({
    selector: 'nx-account-settings-component',
    templateUrl: 'settings.component.html',
    styleUrls: ['settings.component.scss'],
})
export class NxAccountSettingsComponent implements OnInit, OnDestroy {
    @ViewChild('pageApply', { read: ViewContainerRef, static: true })
    private pageApply: ViewContainerRef;
    @ViewChild('accountForm', { read: NgForm }) private accountForm: NgForm;

    CONFIG = nxConfig;
    LANG = staticLang;

    account: Account;
    langCode: string;
    isSystemOwner = true;
    hideErrors = true;
    icons: {
        dir: string;
    };

    private saveAccount?: Process;

    constructor(
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
    ) {
        this.menuService.navItemId$$.set('settings');
        this.icons = icons;

        translateService.onTranslationChange.pipe(untilDestroyed(this)).subscribe(() => {
            setTimeout(() => {
                this.pageService.pageTitle(this.LANG.pageTitles.account);
                this.initProcess();
            });
        });
    }

    search$$ = paramSignal('search');

    requiresReload$$ = signal(false);

    overrideFlag(flag: string, value: boolean): void {
        // @ts-expect-error - debugConfig is a global variable
        (window.debugConfig as typeof nxConfig).featureFlags[flag] = value;
    }

    ngOnInit(): void {
        this.applyService.initPageFormsWatcher(this.pageApply);

        this.initProcess();

        this.store
            .select<Account>(selectCurrentUser)
            .pipe(
                filter(value => !!value),
                // Eventually update to also update realtime. Right now having issues with clearing apply service on changes.
                take(1),
            )
            .subscribe(async account => {
                if (account?.email) {
                    this.account = { ...account };
                    this.isUserASystemOwner();
                    await firstValueFrom(this.systemsService.forceUpdateSystems());

                    setTimeout(() => {
                        // both form are inside *ngIf="account"
                        // otherwise they should be in ngAfterViewInit
                        this.applyService.createFormWatcher(
                            'accountForm',
                            this.accountForm,
                            this.saveAccount as Process,
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
        this.saveAccount = this.processService.createProcess(
            () => {
                // Optimistic update
                // const { first_name, last_name } = this.account;
                // this.store.dispatch(
                //     accountActions.updateCurrentUser({
                //         update: { first_name, last_name }
                //     })
                // );
                return this.cloudApiService.accountPost(this.account);
            },
            {
                errorPrefix: this.LANG.errorCodes.cantChangeAccountPrefix,
                logoutForbidden: true,
            },
            (res: AccountEdit) => {
                const { first_name, last_name } = res;
                this.store.dispatch(
                    accountActions.updateCurrentUser({
                        update: { first_name, last_name },
                    }),
                );
                this.toastService.notify(this.LANG.account.accountSavedSuccess, ToastType.Success);
            },
            () => {},
        );
    }

    changeLanguage(langCode: string): void {
        this.langCode = langCode;
        this.store.dispatch(accountActions.updateCurrentUser({ update: { language: langCode } }));
    }

    private isUserASystemOwner(): void {
        this.systemsService.systemsSubject.subscribe(systems => {
            this.isSystemOwner = systems.some(system => {
                return system.accessRole === 'owner';
            });
        });
    }

    deleteUser(): void {
        this.dialogs.deleteCloudUser().then(res => {
            if (res && res.resultCode === 'ok') {
                this.accountService.logout();
            }
        });
    }
}
