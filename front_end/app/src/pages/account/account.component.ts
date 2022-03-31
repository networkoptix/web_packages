import { Component, OnDestroy, OnInit } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Subscription } from 'rxjs';

import { LanguageI18NStaticTypes } from '@app/language_i18n_static_types';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxSessionService } from '@services/session.service';
import { NxMenuService } from '@src/menu/menu.service';
import type { Content } from '@src/menu/menu.types';

@UntilDestroy({ checkProperties: true })
@Component({
    selector: 'account',
    templateUrl: 'account.component.html',
    styleUrls: ['account.component.scss']
})

export class NxAccountComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    content: Partial<Content> = {};
    menuReady = false;
    userEmail: string;
    private loginStateSubscription: Subscription;
    private menuDetailSubscription: Subscription;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        private sessionService: NxSessionService,
        private menuService: NxMenuService
    ) {
        this.CONFIG = configService.getConfig();
        languageService.translateSubject.subscribe(translation => {
            this.LANG = translation as LanguageI18NStaticTypes;
        });
    }

    ngOnDestroy(): void {}

    ngOnInit(): void {
        this.loginStateSubscription = this.sessionService.loginStateSubject
            .subscribe((loginState: string) => {
                this.userEmail = loginState;
                this.init();
            });
    }

    init(): void {
        const accountMenu = this.CONFIG.menus.account;
        if (!this.userEmail) {
            return;
        }
        this.content = {
            base: accountMenu.baseUrl,
            selectedSection: accountMenu.settings.id,
            level1: [
                {
                    id: accountMenu.settings.id,
                    svg: accountMenu.icon,
                    label: this.userEmail,
                    path: accountMenu.settings.path,
                    level3: [
                        {
                            id: accountMenu.settings.id,
                            label: this.LANG.account.accountSettings(),
                            path: accountMenu.settings.path
                        },
                        {
                            id: accountMenu.password.id,
                            label: this.LANG.account.changePassword(),
                            path: accountMenu.password.path
                        },
                        {
                            id: accountMenu.security.id,
                            label: this.LANG.account.security(),
                            path: accountMenu.security.path
                        }
                    ]
                }
            ]
        };

        this.menuDetailSubscription = this.menuService
            .selectedDetailsSection
            .subscribe(selection => {
                this.content.selectedDetailsSection = selection;
                this.content = { ...this.content }; // trigger onChange
                this.menuReady = true;
            });
    }
}
