import {
    Component, OnInit, AfterViewInit, ViewChild, ViewContainerRef, ViewChildren, QueryList
}                                    from '@angular/core';
import { ActivatedRoute }            from '@angular/router';
import { NgForm }                    from '@angular/forms';
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

@Component({
    selector: 'nx-account-password-component',
    templateUrl: 'password.component.html',
    styleUrls: ['password.component.scss']
})

export class NxAccountPasswordComponent implements OnInit, AfterViewInit {
    @ViewChild('applyContainer', { read: ViewContainerRef, static: true }) applyContainer;
    @ViewChildren('passwordForm', { read: NgForm }) formQueryList: QueryList<NgForm>;

    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    form: NgForm;

    account: Account;
    pass: any = {};
    hideErrors = true;
    weakPassword = false;

    changePassword: Process;

    watchers: any = {
        password: new Watcher<string>(),
        newPassword: new Watcher<string>()
    };

    private setupDefaults() {
        this.pass = {
            password: '',
            newPassword: ''
        };
        this.menuService.detail = 'password';
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
        this.LANG = language.translations;

        this.setupDefaults();
    }

    ngOnInit(): void {
        this.pageService.pageTitle = this.LANG.pageTitles.changePassword;

        this.changePassword = this.processService.createProcess(() => {
            return this.account.account2faEnabled
                ? this.dialogs.passwordVerificationCode(this.pass.newPassword, this.pass.password)
                : this.cloudApiService.changePassword(this.pass.newPassword, this.pass.password);
        }, {
            errorCodes: {
                notAuthorized: this.LANG.errorCodes.oldPasswordMistmatch?.(),
                wrongOldPassword: this.LANG.errorCodes.oldPasswordMistmatch?.()
            },
            errorPrefix: this.LANG.errorCodes.cantChangePasswordPrefix?.(),
            ignoreUnauthorized: true
        }).then(() => {
            this.form.reset();
            this.setOriginal();
            this.applyService.reset();
        });

        this.applyService.initPageWatcher(this.applyContainer, this.changePassword, () => {
            this.form.reset();
            this.applyService.reset();
        }, Object.values(this.watchers), undefined, this.displayErrors);

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
        this.hideErrors = true;
        this.pass.password = password;
        this.watchers.password.value = password;
    }

    setNewPassword(newPassword) {
        this.hideErrors = true;
        this.pass.newPassword = newPassword;
        this.watchers.newPassword.value = newPassword;
    }

    displayErrors = () => {
        this.hideErrors = false;
    }
}
