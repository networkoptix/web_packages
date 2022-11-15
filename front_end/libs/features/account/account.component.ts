import { Component, OnDestroy, OnInit } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateService } from '@ngx-translate/core';

import { NxMenuService } from '@app/menu/menu.service';
import type { Content } from '@app/menu/menu.types';
import staticLang from '@common/language/language_i18n_static.json';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxSessionService } from '@services/session.service';

@UntilDestroy()
@Component({
    selector: 'nx-account',
    templateUrl: 'account.component.html',
    styleUrls: ['account.component.scss']
})

export class NxAccountComponent implements OnInit, OnDestroy {
    CONFIG: IConfig;
    LANG = staticLang;

    content: Content;
    menuReady = false;
    userEmail: string;

    constructor(
        configService: NxConfigService,
        private translateService: TranslateService,
        private sessionService: NxSessionService,
        private menuService: NxMenuService,
    ) {
        this.CONFIG = configService.getConfig();
        this.translateService.onTranslationChange
            .pipe(untilDestroyed(this))
            .subscribe(() => {
                setTimeout(() => {
                    this.initMenu();
                    this.content = { ...this.content }; // trigger onChange
                });
            });
    }

    ngOnDestroy(): void { }

    ngOnInit(): void {
        this.content = {
            base: this.CONFIG.menus.account.baseUrl,
            selectedSection: this.CONFIG.menus.account.settings.id,
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
        const accountMenu = this.CONFIG.menus.account;
        this.content.level1 = [{
            id: accountMenu.settings.id,
            svg: accountMenu.icon,
            label: this.userEmail,
            path: accountMenu.settings.path,
            level3: [
                {
                    id: accountMenu.settings.id,
                    label: this.LANG.account.accountSettings,
                    path: accountMenu.settings.path
                },
                {
                    id: accountMenu.password.id,
                    label: this.LANG.account.changePassword,
                    path: accountMenu.password.path
                },
                {
                    id: accountMenu.security.id,
                    label: this.LANG.account.security,
                    path: accountMenu.security.path
                }
            ]
        }];
    }
}
