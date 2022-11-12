import { Component, OnDestroy, OnInit } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import { NxMenuService } from '@app/menu/menu.service';
import type { Content } from '@app/menu/menu.types';
import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';
import { menus } from '@lib/variables/static-variables';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxSessionService } from '@services/session.service';

@UntilDestroy()
@Component({
    selector: 'nx-account',
    templateUrl: 'account.component.html',
    styleUrls: ['account.component.scss']
})

export class NxAccountComponent implements OnInit, OnDestroy {
    LANG: LanguageI18NStaticTypes;

    content: Content;
    menuReady = false;
    userEmail: string;

    constructor(
        languageService: NxLanguageProviderService,
        private sessionService: NxSessionService,
        private menuService: NxMenuService,
    ) {
        this.LANG = languageService.translations;

        languageService.translateSubject
            .pipe(untilDestroyed(this))
            .subscribe(translations => {
                setTimeout(() => {
                    this.LANG = translations;
                    this.initMenu();
                    this.content = { ...this.content }; // trigger onChange
                });
            });
    }

    ngOnDestroy(): void { }

    ngOnInit(): void {
        this.content = {
            base: menus.account.baseUrl,
            selectedSection: menus.account.settings.id,
            level1: [],
        };

        this.sessionService.loginStateSubject
            .pipe(untilDestroyed(this))
            .subscribe((loginState: string) => {
                this.userEmail = loginState;
                this.init();
            });
    }

    init(): void {
        if (!this.userEmail) {
            return;
        }

        this.initMenu();

        this.menuService.selectedDetailsSection
            .pipe(untilDestroyed(this))
            .subscribe(selection => {
                this.content.selectedDetailsSection = selection;
                this.content = { ...this.content }; // trigger onChange
                this.menuReady = true;
            });
    }

    private initMenu(): void {
        const accountMenu = menus.account;
        this.content.level1 = [{
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
        }];
    }
}
