import { Component, Inject, OnInit, ViewContainerRef } from '@angular/core';
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

@Component({
    selector   : 'nx-account-password-component',
    templateUrl: 'password.component.html',
    styleUrls  : ['password.component.scss']
})

export class NxAccountPasswordComponent implements OnInit {
    CONFIG: any;
    LANG: any;
    viewContainerRef: ViewContainerRef;

    account: any = {};
    pass: any = {};

    changePassword: any;

    form: any;

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

    constructor(@Inject(ViewContainerRef) viewContainerRef,
                private route: ActivatedRoute,
                private config: NxConfigService,
                private processService: NxProcessService,
                private cloudApiService: NxCloudApiService,
                private language: NxLanguageProviderService,
                private systemsService: NxSystemsService,
                private accountService: NxAccountService,
                private dialogs: NxDialogsService,
                private menuService: NxMenuService,
                private applyService: NxApplyService,
    ) {
        this.setupDefaults();
        this.viewContainerRef = viewContainerRef;
    }

    ngOnInit(): void {
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

        this.applyService.initPageWatcher(this.viewContainerRef, this.changePassword, () => {
            this.form.reset();
            this.applyService.reset();
            this.form.controls.newPassword.reset();
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

    setPassword(password, form) {
        this.pass.password = password;
        this.watchers.password.value = password;
        this.form = form;
    }

    setNewPassword(newPassword, form, control) {
        this.pass.newPassword = newPassword;
        this.watchers.newPassword.value = newPassword;
        this.form = form;
    }
}

