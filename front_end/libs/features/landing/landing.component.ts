import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { CookieService } from 'ngx-cookie-service';

import { environment } from '@environments/environment';
import staticLang from '@language_static';
import { NxAccountService } from '@services/account.service';
import { nxConfig } from '@services/nx-config/config';
import { NxPageService } from '@services/page.service';
import { NxSessionService } from '@services/session.service';

@UntilDestroy()
@Component({
    selector: 'nx-landing-component',
    templateUrl: 'landing.component.html',
    styleUrls: ['landing.component.scss'],
})
export class NxLandingComponent implements OnInit {
    LANG = staticLang;
    params;
    userEmail;
    login;
    createUrl: string;

    loaded: boolean;
    startParams;
    startUrl;

    constructor(
        private accountService: NxAccountService,
        private sessionService: NxSessionService,
        private pageService: NxPageService,
        private router: Router,
        private cookieService: CookieService,
    ) {
        this.startUrl = this.router.url;
        this.startParams = this.router.parseUrl(this.router.url).queryParams;

        if (this.cookieService.get('devServer')) {
            this.router.navigateByUrl('dashboard');
        } else if (nxConfig.featureFlags.landingPage) {
            this.router.navigateByUrl('new-landing', { skipLocationChange: true });
        }

        this.createUrl = environment.production
            ? '/authorize?client_type=create'
            : `https://${environment.cloudHost}/authorize?redirect_uri=${window.location.href}&client_type=create`;
    }

    ngOnInit(): void {
        if (this.startUrl === '/logout') {
            this.accountService.logout();
        } else if (this.startUrl.includes('/content/about')) {
            this.pageService.pageTitle(this.LANG.pageTitles.about, '');
            this.loaded = true;
        } else {
            this.sessionService.loginStateSubject.pipe(untilDestroyed(this)).subscribe(account => {
                if (account && !this.startParams.next) {
                    this.accountService.redirectAuthorised();
                    this.userEmail = this.accountService.email;
                } else {
                    if (this.startUrl.includes('/login') && !this.startParams.code) {
                        this.accountService.showLogin(false);
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
