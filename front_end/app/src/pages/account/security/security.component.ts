import { Component, OnInit, ViewChild, ViewContainerRef } from '@angular/core';

import { NxApplyService, Watcher }                from '@services/apply.service';
import { NxProcessService, Process }              from '@services/process.service';
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
    subV5Systems: NxSystemWithUserInfo[] = [];

    @ViewChild('applyContainer', { read: ViewContainerRef, static: true }) applyContainer;
    verificationWatcher = new Watcher<boolean>();

    private setupDefaults() {
        this.menuService.detail = 'security';
    }

    constructor(
        configService: NxConfigService,
        language: NxLanguageProviderService,
        private applyService: NxApplyService,
        private processService: NxProcessService,
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
        this.verificationWatcher.value = !!this.account.account2faEnabled;

        this.systemsService.systemsSubject
            .pipe(untilDestroyed(this))
            .subscribe((systems: NxSystemWithUserInfo[]) => {
                systems.forEach(system => {
                    system.name = NxUtilsService.htmlToEntity(system.name);

                    if (system.system2faEnabled) {
                        this.twoFaSystems.push(system);
                    }

                    if (!system.useRest) {
                        this.subV5Systems.push(system);
                    }
                });
            });

        // TODO: Replace with API logic
        this.applyService.initPageWatcher(
            this.applyContainer,
            this.processService.createProcess(
                () => {
                    return this.dialogs
                        .toggleVerificationCode(this.verificationWatcher.value)
                        .then(action => {
                            if (action === 'canceled') {
                                // eslint-disable-next-line prefer-promise-reject-errors
                                return Promise.reject('dialogCancel');
                            } else {
                                const newState = (action === 'enabled');
                                this.tfauth.on = newState;
                                this.tfauth.enabled = newState;
                                this.updateVerificationOriginal();
                            }
                        });
                },
                { errorCodes: { dialogCancel: () => {} } },
                () => {},
                () => {}
            ),
            () => {
                this.applyService.reset();
            },
            [this.verificationWatcher]
        );
    }

    updateVerificationOriginal(newValue?: boolean): void {
        if (newValue !== undefined) {
            this.verificationWatcher.value = newValue;
        }
        this.verificationWatcher.originalValue = this.verificationWatcher.value;
    }

    toggle2FA(enabled) {
        this.tfauth.on = enabled;

        if (enabled) {
            this.dialogs
                .wizard2FA()
                .then((action) => {
                    this.tfauth.on = (action !== 'canceled');
                    this.tfauth.enabled = (action === 'enabled');
                    this.updateVerificationOriginal(action === 'enabled');
                    this.applyService.reset();
                });
        } else {
            this.dialogs
                .off2FA()
                .then((action) => {
                    this.tfauth.on = (action === 'canceled');
                    this.tfauth.enabled = (action !== 'disabled');
                    this.updateVerificationOriginal(action !== 'disabled');
                    this.applyService.reset();
                });
        }
    }

    genNewCode() {
        this.dialogs
            .newCode2FA();
    }
}
