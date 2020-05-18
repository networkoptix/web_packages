import {
    Component,
    OnInit,
    AfterViewInit,
    ViewContainerRef,
    ViewChild,
    ViewChildren,
    QueryList,
    OnDestroy
} from '@angular/core';
import { NxConfigService, IConfig }  from '../../../services/nx-config';
import { NxLanguageProviderService } from '../../../services/nx-language-provider';
import { NxAccountService }          from '../../../services/account.service';
import { NxDialogsService }          from '../../../dialogs/dialogs.service';
import { ActivatedRoute }            from '@angular/router';
import { LocalStorageService }       from 'ngx-store';
import { NxProcessService }          from '../../../services/process.service';
import { NxCloudApiService }         from '../../../services/nx-cloud-api';
import { NxSystemsService }          from '../../../services/systems.service';
import { NxMenuService }             from '../../../components/menu/menu.service';
import { NxApplyService, Watcher }   from '../../../services/apply.service';
import { NxPageService }             from '../../../services/page.service';
import { NgForm }                    from '@angular/forms';
import { first }                     from 'rxjs/operators';
import { Subscription }              from 'rxjs';
import { AutoUnsubscribe }           from 'ngx-auto-unsubscribe';
import { LanguageI18NStaticTypes }   from '../../../../language_i18n_static_types';

@AutoUnsubscribe()
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

    account: any = {};
    save: any;
    langCode: string;
    isSystemOwner = true;

    watchers: any = {
        firstName : new Watcher<string>(),
        lastName  : new Watcher<string>(),
        langCode  : new Watcher<string>()
    };

    private formSubscription: Subscription;

    private setupDefaults() {
        this.menuService.setDetailsSection('settings');
    }

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private route: ActivatedRoute,
        private localStorage: LocalStorageService,
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
        this.LANG = language.translations;
        this.setupDefaults();
    }

    ngOnDestroy() {}

    ngOnInit() {
        this.pageService.pageTitle = this.LANG.pageTitles.account;

        this.save = this.processService.createProcess(() => {
            return this.cloudApiService.accountPost(this.account).then(() => {
                if (this.langCode !== this.account.language) {
                    return this.cloudApiService
                        .changeLanguage(this.langCode)
                        .then(() => {
                            this.localStorage.set('langChanged', true);
                            setTimeout(() => window.location.reload()); // reload window to catch new language
                            return false;
                        });
                }
                return this.systemsService.forceUpdateSystemsAsPromise();
            }).finally(() => {
                this.accountService.get(true);
            });
        }, {
            successMessage  : this.LANG.account.accountSavedSuccess,
            errorPrefix     : this.LANG.errorCodes.cantChangeAccountPrefix,
            logoutForbidden : true
        }).then((result) => {
            this.applyService.hardReset();
            this.setOriginal();
            this.applyService.reset();
            return result;
        });

        this.applyService.initPageWatcher(this.applyContainer, this.save, () => {
            this.account.first_name = this.watchers.firstName.originalValue;
            this.account.last_name = this.watchers.lastName.originalValue;
            this.langCode = this.watchers.langCode.originalValue;
            this.applyService.reset();
        }, Object.values(this.watchers));

        this.accountService
            .get()
            .then((account) => {
                if (account) {
                    this.account = account;
                    this.setOriginal();
                    if (!this.systemsService.systemsPoll.destination.observers.length) {
                        this.systemsService.getSystems(account.email);
                    }
                    this.isUserASystemOwner();
                }
            });

        if (this.localStorage && this.localStorage.get('langChanged')) {
            this.dialogs.notify(this.LANG.account.accountSavedSuccess, 'success');
            this.localStorage.set('langChanged', false);
        }

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

    deleteUser() {
        this.dialogs.deleteCloudUser(this.cloudApiService)
            .then(res => {
                if (res && res.resultCode === 'ok') {
                    this.accountService.logout();
                }
            });
    }
}
