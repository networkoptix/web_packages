import { Component, OnInit, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';

import { environment } from '@environments/environment';
import { NxAccountService } from '@services/account.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NxPageService } from '@services/page.service';
import { WINDOW } from '@services/window-provider';
import { LanguageI18NStaticTypes } from '@common/language/language_i18n_static_types';

@Component({
    selector: 'nx-landing-component',
    templateUrl: 'landing.component.html',
    styleUrls: ['landing.component.scss']
})

export class NxLandingComponent implements OnInit {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;

    params;
    userEmail;
    login;
    createUrl: string;

    loaded: boolean;
    startParams;
    startUrl;

    private setupDefaults(configService): void {
        this.CONFIG = configService.getConfig();
        this.LANG = this.language.translations;
    }

    constructor(
        private configService: NxConfigService,
        private accountService: NxAccountService,
        private pageService: NxPageService,
        private language: NxLanguageProviderService,
        @Inject(WINDOW) private window: Window,
        private router: Router,
        private cookieService: CookieService
    ) {
        this.setupDefaults(this.configService);
        this.startUrl = this.router.url;
        this.startParams = this.router.parseUrl(this.router.url).queryParams;

        if (this.cookieService.get('devServer')) {
            this.router.navigateByUrl('dashboard');
        } else if (this.configService.flagsEnabled('landingPage')) {
            this.router.navigateByUrl('new-landing', { skipLocationChange: true });
        }

        this.createUrl = environment.production
            ? '/authorize?client_type=create'
            : `https://${environment.cloudHost}/authorize?redirect_uri=${this.window.location.href}&client_type=create`;
    }

    ngOnInit(): void {
        this.pageService.pageTitle = this.LANG.productName();
        this.pageService.pageDescription = this.CONFIG.landing.description;
        if (this.startUrl === '/logout') {
            this.accountService.logout();
        } else if (this.startUrl.includes('/content/about')) {
            this.loaded = true;
            this.pageService.pageTitleRemoveHyphen = this.LANG.pageTitles.about?.();
        } else {
            this.accountService
                .get(/* forceUpdate */true)
                .then(account => {
                    if (account && !this.startParams.next) {
                        this.accountService.redirectAuthorised();
                        this.userEmail = this.accountService.email;
                    } else {
                        if (this.startUrl.includes('/login') && !this.startParams.code) {
                            this.accountService.showLogin(false, false);
                        } else if (this.startParams.next) {
                            return this.router.navigate([this.startParams.next]);
                        } else {
                            this.loaded = true;
                        }
                    }
                }).catch(() => {
                    this.pageService.pageTitle = this.LANG.productName();
                    this.pageService.pageDescription = this.CONFIG.landing.description;
                    this.loaded = true;
                });
        }
    }
}
