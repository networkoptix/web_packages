import { Component, OnInit, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { CookieService } from 'ngx-cookie-service';

import staticLang from '@common/language/language_i18n_static.json';
import { environment } from '@environments/environment';
import { NxAccountService } from '@services/account.service';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { NxSessionService } from '@services/session.service';
import { WINDOW } from '@services/window-provider';

@UntilDestroy()
@Component({
    selector: 'nx-landing-component',
    templateUrl: 'landing.component.html',
    styleUrls: ['landing.component.scss']
})

export class NxLandingComponent implements OnInit {
    CONFIG: IConfig;
    LANG = staticLang;

    params;
    userEmail;
    login;
    createUrl: string;

    loaded: boolean;
    startParams;
    startUrl;

    private setupDefaults(configService): void {
        this.CONFIG = configService.getConfig();
    }

    constructor(
        private configService: NxConfigService,
        private accountService: NxAccountService,
        private sessionService: NxSessionService,
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
        if (this.startUrl === '/logout') {
            this.accountService.logout();
        } else if (this.startUrl.includes('/content/about')) {
            this.loaded = true;
        } else {
            this.sessionService.loginStateSubject
                .pipe(untilDestroyed(this))
                .subscribe(account => {
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
                });
        }
    }
}
