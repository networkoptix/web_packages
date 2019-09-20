import { Component, OnInit, AfterViewInit, ViewContainerRef, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { NxConfigService }           from '../../../services/nx-config';
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

@Component({
    selector   : 'nx-account-settings-component',
    templateUrl: 'settings.component.html',
    styleUrls  : ['settings.component.scss']
})

export class NxAccountSettingsComponent implements OnInit, AfterViewInit {
    @ViewChild('applyContainer', {read: ViewContainerRef, static: true}) applyContainer;
    @ViewChildren('accountForm', {read: NgForm}) formQueryList: QueryList<NgForm>;

    CONFIG: any;
    LANG: any;

    account: any = {};
    save: any;
    langCode: string;

    watchers: any = {
        firstName: new Watcher<string>(),
        lastName: new Watcher<string>(),
        langCode: new Watcher<string>(),
    };


    private setupDefaults() {
        this.CONFIG = this.config.getConfig();
        this.LANG = this.language.getTranslations();

        this.menuService.setDetailsSection('settings');
    }

    constructor(private route: ActivatedRoute,
                private localStorage: LocalStorageService,
                private config: NxConfigService,
                private processService: NxProcessService,
                private cloudApiService: NxCloudApiService,
                private language: NxLanguageProviderService,
                private systemsService: NxSystemsService,
                private accountService: NxAccountService,
                private dialogs: NxDialogsService,
                private menuService: NxMenuService,
                private applyService: NxApplyService,
                private pageService: NxPageService) {
        this.setupDefaults();
    }

    ngOnInit(): void {
        this.pageService.setPageTitle(this.LANG.pageTitles.account);

        this.save = this.processService.createProcess(() => {
            return this.cloudApiService.accountPost(this.account);
        }, {
            successMessage: this.LANG.account.accountSavedSuccess,
            errorPrefix: this.LANG.errorCodes.cantChangeAccountPrefix,
            logoutForbidden: true
        }).then((result) => {
            if (this.langCode !== this.account.language) {
                this.cloudApiService
                    .changeLanguage(this.langCode)
                    .then(() => {
                        this.localStorage.set('langChanged', true);
                        window.location.reload(); // reload window to catch new language
                    });
            } else {
                this.systemsService.forceUpdateSystems();
            }


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
            .requireLogin()
            .then((account) => {
                this.account = account;
                this.setOriginal();
            });

        if (this.localStorage && this.localStorage.get('langChanged')) {
            this.localStorage.set('langChanged', false);
        }
    }

    ngAfterViewInit() {
        this.formQueryList.changes.pipe(first()).subscribe((changes) => {
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
}

