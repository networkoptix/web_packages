import {
    Component, OnInit, AfterViewInit, ViewChild, ViewContainerRef, ViewChildren, QueryList
}                                  from '@angular/core';
import { ActivatedRoute }          from '@angular/router';
import { NgForm }                  from '@angular/forms';
import {
    NxConfigService, IConfig,
    NxLanguageProviderService,
    NxAccountService, Account,
    NxProcessService, NxCloudApiService,
    NxSystemsService, NxPageService,
    NxApplyService, Watcher
}                                  from '../../../services';
import { NxDialogsService }        from '../../../dialogs';
import { NxMenuService }           from '../../../components/menu';
import { LanguageI18NStaticTypes } from '../../../../language_i18n_static_types';
import { first }                   from 'rxjs/operators';

@Component({
    selector    : 'nx-account-password-component',
    templateUrl : 'password.component.html',
    styleUrls   : ['password.component.scss']
})

export class NxAccountPasswordComponent implements OnInit, AfterViewInit {
    @ViewChild('applyContainer', { read: ViewContainerRef, static: true }) applyContainer;
    @ViewChildren('passwordForm', { read: NgForm }) formQueryList: QueryList<NgForm>;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    form: NgForm;

    account: Account;
    pass: any = {};

    changePassword: any;

    watchers: any = {
        password    : new Watcher<string>(),
        newPassword : new Watcher<string>()
    };

    private setupDefaults() {
        this.pass = {
            password    : '',
            newPassword : ''
        };
        this.menuService.setDetailsSection('password');
    }

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private route: ActivatedRoute,
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
        this.LANG = language.getTranslations();

        this.setupDefaults();
    }

    ngOnInit(): void {
        this.pageService.setPageTitle(this.LANG.pageTitles.changePassword);

        this.changePassword = this.processService.createProcess(() => {
            return this.cloudApiService
                .changePassword(this.pass.newPassword, this.pass.password);
        }, {
            errorCodes: {
                notAuthorized    : this.LANG.errorCodes.oldPasswordMistmatch,
                wrongOldPassword : this.LANG.errorCodes.oldPasswordMistmatch
            },
            errorPrefix        : this.LANG.errorCodes.cantChangePasswordPrefix,
            ignoreUnauthorized : true
        }).then(() => {
            this.form.reset();
            this.setOriginal();
            this.applyService.reset();
        });

        this.applyService.initPageWatcher(this.applyContainer, this.changePassword, () => {
            this.form.reset();
            this.applyService.reset();
        }, Object.values(this.watchers));

        this.accountService
            .get()
            .then((account) => {
                if (account) {
                    this.account = account;
                    this.setOriginal();
                }
            });

        this.applyService.setVisible();
    }

    ngAfterViewInit() {
        this.formQueryList.changes.pipe(first()).subscribe((changes) => {
            this.form = changes.first;
            this.applyService.setForm(this.form);
        });
    }

    setOriginal() {
        this.setPassword('');
        this.setNewPassword('');
    }

    setPassword(password) {
        this.pass.password = password;
        this.watchers.password.value = password;
    }

    setNewPassword(newPassword) {
        this.pass.newPassword = newPassword;
        this.watchers.newPassword.value = newPassword;
    }
}
