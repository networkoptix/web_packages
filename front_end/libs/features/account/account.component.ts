import { Component, effect } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';

import { accountSelectors } from '@common/store/account';
import staticLang from '@language_static';
import { NxMenuService } from '@menu/menu.service';
import type { Content } from '@menu/menu.types';
import { NxPageTitleStrategy } from '@resolvers/title-resolver';
import { menus } from '@static-variables';

@Component({
    selector: 'nx-account',
    templateUrl: 'account.component.html',
    styleUrls: ['account.component.scss'],
})
export class NxAccountComponent {
    LANG = staticLang;

    content: Content = {
        base: menus.account.baseUrl,
        selectedSection: menus.account.settings.id,
        level1: [],
    };
    menuReady = false;
    userEmail$$ = this.store.selectSignal(accountSelectors.selectCurrentEmail);

    constructor(
        router: Router,
        titleService: NxPageTitleStrategy,
        private store: Store,
        private translateService: TranslateService,
        private menuService: NxMenuService,
    ) {
        this.translateService.onTranslationChange.pipe(takeUntilDestroyed()).subscribe(() => {
            setTimeout(() => {
                this.initMenu();
                this.content = { ...this.content }; // trigger onChange

                setTimeout(() => {
                    titleService.updateTitle(router.routerState.snapshot);
                });
            });
        });

        effect(() => {
            const selectedDetailsSection = this.menuService.selectedDetailsSection();
            if (this.content) {
                this.content.selectedDetailsSection = selectedDetailsSection;
            }
            this.content = { ...this.content }; // trigger onChange
            this.menuReady = true;
        });

        effect(() => {
            if (this.userEmail$$()) {
                this.initMenu();
            }
        });
    }

    private initMenu(): void {
        const accountMenu = menus.account;
        this.content.level1 = [
            {
                id: accountMenu.settings.id,
                svg: accountMenu.icon,
                label: this.userEmail$$(),
                path: accountMenu.settings.path,
                level3: [
                    {
                        id: accountMenu.settings.id,
                        label: this.LANG.account.accountSettings,
                        path: accountMenu.settings.path,
                    },
                    {
                        id: accountMenu.password.id,
                        label: this.LANG.account.changePassword,
                        path: accountMenu.password.path,
                    },
                    {
                        id: accountMenu.security.id,
                        label: this.LANG.account.security,
                        path: accountMenu.security.path,
                    },
                ],
            },
        ];
    }
}
