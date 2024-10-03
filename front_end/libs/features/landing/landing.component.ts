import { Component, DestroyRef, inject, Inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { CookieService } from 'ngx-cookie-service';

import { accountSelectors } from '@common/store/account';
import { environment } from '@environments/environment';
import staticLang from '@language_static';
import { NxAccountService } from '@services/account.service';
import { nxConfig } from '@services/nx-config/config';
import { NxPageService } from '@services/page.service';
import { WINDOW } from '@services/window-provider';

@Component({
    selector: 'nx-landing-component',
    templateUrl: 'landing.component.html',
    styleUrls: ['landing.component.scss'],
})
export class NxLandingComponent implements OnInit {
    LANG = staticLang;
    destroyRef = inject(DestroyRef);
    params;
    userEmail;
    login;
    createUrl: string;

    loaded: boolean;
    startParams;
    startUrl;

    constructor(
        private accountService: NxAccountService,
        private pageService: NxPageService,
        @Inject(WINDOW) private window: Window,
        private router: Router,
        private store: Store,
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
            : `https://${environment.cloudHost}/authorize?redirect_uri=${this.window.location.href}&client_type=create`;
    }

    ngOnInit(): void {
        if (this.startUrl === '/logout') {
            this.accountService.logout();
        } else if (this.startUrl.includes('/content/about')) {
            this.pageService.pageTitle(this.LANG.pageTitles.about, '');
            this.loaded = true;
        } else {
            this.store
                .select(accountSelectors.selectCurrentUserName)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(email => {
                    if (email && !this.startParams.next) {
                        this.accountService.redirectAuthorised();
                        this.userEmail = email;
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
