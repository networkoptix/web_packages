import { Component, ElementRef, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { NxConfigService }           from '../../../services/nx-config';
import { NxLanguageProviderService } from '../../../services/nx-language-provider';
import { NxAccountService }          from '../../../services/account.service';
import { NxDialogsService }          from '../../../dialogs/dialogs.service';
import { ActivatedRoute }            from '@angular/router';
import { NxProcessService }          from '../../../services/process.service';
import { NxCloudApiService }         from '../../../services/nx-cloud-api';
import { NxSystemsService }          from '../../../services/systems.service';
import { NxMenuService }             from '../../../components/menu/menu.service';
import { NxApplyService, Watcher }   from '../../../services/apply.service';
import { NxPageService }             from '../../../services/page.service';

@Component({
    selector   : 'nx-account-password-component',
    templateUrl: 'password.component.html',
    styleUrls  : ['password.component.scss']
})

export class NxAccountPasswordComponent implements OnInit {
    @ViewChild('applyContainer', {read: ViewContainerRef, static: true}) applyContainer;
    @ViewChild('passwordForm', {read: ElementRef, static: false}) form: ElementRef;

    CONFIG: any;
    LANG: any;

    account: any = {};
    pass: any = {};

    changePassword: any;

    watchers: any = {
        password: new Watcher<string>(),
        newPassword: new Watcher<string>()
    };

    private setupDefaults() {
        this.CONFIG = this.config.getConfig();
        this.LANG = this.language.getTranslations();

        this.pass = {
            password   : '',
            newPassword: ''
        };
        this.menuService.setDetailsSection('password');
    }

    constructor(private route: ActivatedRoute,
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
        this.pageService.setPageTitle(this.LANG.pageTitles.changePassword);

        this.changePassword = this.processService.createProcess(() => {
            return this.cloudApiService
                       .changePassword(this.pass.newPassword, this.pass.password);
        }, {
            errorCodes        : {
                notAuthorized   : this.LANG.errorCodes.oldPasswordMistmatch,
                wrongOldPassword: this.LANG.errorCodes.oldPasswordMistmatch
            },
            successMessage    : this.LANG.account.passwordChangedSuccess,
            errorPrefix       : this.LANG.errorCodes.cantChangePasswordPrefix,
            ignoreUnauthorized: true
        }).then(() => {
            this.applyService.reset();
        });

        this.applyService.initPageWatcher(this.applyContainer, this.changePassword, () => {
            this.form.nativeElement.reset();
            this.applyService.reset();
        }, Object.values(this.watchers));

        this.accountService
            .checkLoginState()
            .then(() => {
                this.accountService
                    .get()
                    .then((account) => {
                        this.account = account;
                        this.setOriginal();
                    });
            })
            .catch(() => {
                this.dialogs.login(this.accountService, true);
            });
    }

    setOriginal() {
        this.watchers.password.value = '';
        this.watchers.newPassword.value = '';
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

