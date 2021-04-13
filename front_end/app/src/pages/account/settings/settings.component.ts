import {
    Component, OnInit,
    AfterViewInit, ViewChild,
    ViewContainerRef, OnDestroy,
    ViewChildren, QueryList
}                                    from '@angular/core';
import { ActivatedRoute }            from '@angular/router';
import { NgForm }                    from '@angular/forms';
import { UntilDestroy }              from '@ngneat/until-destroy';
import { Subscription }              from 'rxjs';
import { first }                     from 'rxjs/operators';

import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxConfigService, IConfig }  from '@services/nx-config';
import { NxAccountService, Account } from '@services/account.service';
import { NxPageService }             from '@services/page.service';
import { NxProcessService, Process } from '@services/process.service';
import { NxCloudApiService }         from '@services/nx-cloud-api';
import { NxSystemsService }          from '@services/systems.service';
import { NxApplyService, Watcher }   from '@services/apply.service';
import { NxDialogsService }          from '@dialogs/dialogs.service';
import { NxMenuService }             from '@src/menu';
import { LanguageI18NStaticTypes }   from '@app/language_i18n_static_types';
import { NxStorageService }          from '@services/storage.service';
import { NxSessionService }          from '@services/session.service';

@UntilDestroy({ checkProperties: true })
@Component({
    selector    : 'nx-account-settings-component',
    templateUrl : 'settings.component.html',
    styleUrls   : ['settings.component.scss']
})

export class NxAccountSettingsComponent implements OnInit, OnDestroy, AfterViewInit {
    @ViewChild('applyContainer', { read: ViewContainerRef, static: true }) applyContainer;
    @ViewChildren('accountForm', { read: NgForm }) formQueryList: QueryList<NgForm>;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    account: Account;
    save: Process;
    langCode: string;
    isSystemOwner = true;
    hideErrors = true;

    watchers = {
        firstName : new Watcher<string>(),
        lastName  : new Watcher<string>(),
        langCode  : new Watcher<string>()
    };

    private formSubscription: Subscription;

    private setupDefaults() {
        this.menuService.detail = 'settings';
    }

    constructor(
        configService: NxConfigService,
        private languageService: NxLanguageProviderService,
        private route: ActivatedRoute,
        private storageService: NxStorageService,
        private processService: NxProcessService,
        private cloudApiService: NxCloudApiService,
        private systemsService: NxSystemsService,
        private accountService: NxAccountService,
        private dialogs: NxDialogsService,
        private menuService: NxMenuService,
        private applyService: NxApplyService,
        private pageService: NxPageService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = this.languageService.translations;
        this.setupDefaults();
    }

    ngOnDestroy() {}

    ngOnInit() {
        this.pageService.pageTitle = this.LANG.pageTitles.account();

        this.save = this.processService.createProcess(() => {
            return this.cloudApiService.accountPost(this.account).then(() => {
                let lang = Promise.resolve();
                if (this.langCode !== this.account.language) {
                    this.account.language = this.langCode;

                    lang = new Promise<any>((resolve) => {
                        return this.cloudApiService
                            .changeLanguage(this.langCode)
                            .then(() => {
                                this.storageService.langChanged = true;
                                this.languageService.currentLang = this.langCode;
                                return resolve(false);
                            });
                    });
                }
                return lang.then(() => this.systemsService.forceUpdateSystemsAsPromise() as Promise<any>);
            }).finally(() => {
                this.watchers.langCode.originalValue = this.watchers.langCode.value = this.langCode;
                this.accountService.get(true);
            });
        }, {
            errorPrefix     : this.LANG.errorCodes.cantChangeAccountPrefix(),
            logoutForbidden : true
        }).then((result) => {
            this.applyService.reset(true);
            this.setOriginal();
            this.applyService.reset();
            return result;
        });

        this.applyService.initPageWatcher(this.applyContainer, this.save, () => {
            this.account.first_name = this.watchers.firstName.originalValue;
            this.account.last_name = this.watchers.lastName.originalValue;
            this.langCode = this.watchers.langCode.originalValue;
            this.applyService.reset();
        }, Object.values(this.watchers), undefined, this.displayErrors);

        this.accountService
            .get()
            .then((account) => {
                if (account) {
                    this.account = account;
                    this.setOriginal();
                    if (!this.CONFIG.isLocal && !this.systemsService.systemsPoll.destination?.observers?.length) {
                        this.systemsService.getSystems(account.email);
                    }
                    this.isUserASystemOwner();
                }
            });

        if (this.storageService && this.storageService.langChanged) {
            this.dialogs.notify(this.LANG.account.accountSavedSuccess(), 'success');
            this.storageService.langChanged = false;
        }
        this.applyService.reset(true);
        this.applyService.setVisible();
    }

    ngAfterViewInit() {
        this.formSubscription = this.formQueryList.changes.pipe(first()).subscribe((changes) => {
            this.applyService.setForm(changes.first);
        });
    }

    setOriginal() {
        this.watchers.firstName.value = this.account.first_name;
        this.watchers.lastName.value = this.account.last_name;
        this.watchers.langCode.value = this.langCode;
    }

    changeLanguage(langCode) {
        this.langCode = langCode;
        this.watchers.langCode.value = langCode;
    }

    changeFirstName(firstName) {
        this.account.first_name = firstName;
        this.watchers.firstName.value = firstName;
    }

    changeLastName(lastName) {
        this.account.last_name = lastName;
        this.watchers.lastName.value = lastName;
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
    }

    deleteUser() {
        this.dialogs.deleteCloudUser(this.cloudApiService)
            .then((res: any) => {
                if (res && res.resultCode === 'ok') {
                    this.accountService.logout();
                }
            });
    }
}
