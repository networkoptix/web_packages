import {
    Component, OnInit
}                                    from '@angular/core';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxConfigService, IConfig }  from '@services/nx-config';
import { NxAccountService, Account } from '@services/account.service';
import { NxPageService }             from '@services/page.service';
import { NxDialogsService }          from '@dialogs/dialogs.service';
import { NxMenuService }             from '@src/menu';
import { LanguageI18NStaticTypes }   from '@app/language_i18n_static_types';

export type TFAUTH = {
    on: boolean,
    enabled: boolean
}

@Component({
    selector    : 'nx-account-security-component',
    templateUrl : 'security.component.html',
    styleUrls   : ['security.component.scss']
})

export class NxAccountSecurityComponent implements OnInit {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    account: Account;
    tfauth : TFAUTH;

    private setupDefaults() {
        this.menuService.detail = 'security';
    }

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private accountService: NxAccountService,
        private dialogs: NxDialogsService,
        private menuService: NxMenuService,
        private pageService: NxPageService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = language.translations;

        this.setupDefaults();
    }

    ngOnInit(): void {
        this.pageService.pageTitle = this.LANG.pageTitles.security;
        this.account = this.accountService.account;

        this.tfauth = {
            on      : !!this.account.account2faEnabled,
            enabled : !!this.account.account2faEnabled
        };
    }

    enabled2FA(enabled) {
        this.tfauth.on = enabled;

        if (enabled) {
            this.dialogs
                .wizard2FA()
                .then((action) => {
                    this.tfauth.on = !(action === 'canceled');
                    this.tfauth.enabled = (action === 'enabled');
                });
        } else {
            this.dialogs
                .off2FA()
                .then((action) => {
                    this.tfauth.on = (action === 'canceled');
                    this.tfauth.enabled = !(action === 'disabled');
                });
        }
    }

    genNewCode() {
        this.dialogs
            .newCode2FA();
    }
}
