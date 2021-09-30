import {
    Component, OnInit
}                                                 from '@angular/core';
import { NxLanguageProviderService }              from '@services/nx-language-provider';
import { NxConfigService, IConfig }               from '@services/nx-config';
import { NxAccountService, Account }              from '@services/account.service';
import { NxPageService }                          from '@services/page.service';
import { NxDialogsService }                       from '@dialogs/dialogs.service';
import { NxMenuService }                          from '@src/menu';
import { LanguageI18NStaticTypes }                from '@app/language_i18n_static_types';
import { NxSystemsService, NxSystemWithUserInfo } from '@services/systems.service';
import { NxUtilsService }                         from '@services/utils.service';
import { untilDestroyed, UntilDestroy }           from '@ngneat/until-destroy';

export type TFAUTH = {
    on: boolean,
    enabled: boolean
}

@UntilDestroy({ checkProperties: true })
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

    twoFaSystems: NxSystemWithUserInfo[] = [];

    private setupDefaults() {
        this.menuService.detail = 'security';
    }

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private accountService: NxAccountService,
        private dialogs: NxDialogsService,
        private menuService: NxMenuService,
        private pageService: NxPageService,
        private systemsService: NxSystemsService
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

        this.systemsService.systemsSubject
            .pipe(untilDestroyed(this))
            .subscribe((systems: NxSystemWithUserInfo[]) => {
                systems.forEach(system => {
                    if (system.system2faEnabled) {
                        system.name = NxUtilsService.htmlToEntity(system.name);
                        this.twoFaSystems.push(system);
                    }
                });
            });
    }

    toggle2FA(enabled) {
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
