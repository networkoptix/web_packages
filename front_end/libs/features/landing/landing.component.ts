import { Component, DestroyRef, inject, isDevMode, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';

import { accountSelectors } from '@common/store/account';
import { environment } from '@environments/environment';
import staticLang from '@language_static';
import { NxAccountService } from '@services/account.service';
import { OauthService } from '@services/oauth.service';
import { NxPageService } from '@services/page.service';
import { useNewCloud } from '@utils/general';

@Component({
    selector: 'nx-landing-component',
    templateUrl: 'landing.component.html',
    styleUrls: ['landing.component.scss'],
})
export class NxLandingComponent implements OnInit {
    private oauthService = inject(OauthService);
    private LANG = staticLang;
    private destroyRef = inject(DestroyRef);
    readonly createUrl = !isDevMode()
        ? '/authorize?client_type=create'
        : `https://${environment.cloudHost}/authorize?redirect_uri=${window.location.href}&client_type=create`;
    readonly authorizationUrl = `${window.location.origin}/authorize${window.location.search}`;
    readonly useNewCloud = useNewCloud() && window.self === window.top;

    loaded: boolean;
    userEmail: string;
    startParams: Record<string, string>;
    startUrl: string;

    handleLoad = (event: Event): void => {
        const contentWindow = (event.target as HTMLIFrameElement).contentWindow;
        if (!contentWindow) {
            return;
        }
        const style = contentWindow.document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = `
            body {
                background-color: transparent !important;
            }
            .auth-footer {
                display: none !important;
            }
        `;
        contentWindow.document.head.appendChild(style);

        const observer = new MutationObserver(() => {
            if (contentWindow.document.querySelector('.auth-window')) {
                observer.disconnect();
                this.loaded = true;
            }
        });

        observer.observe(contentWindow.document, {
            childList: true,
            subtree: true,
        });

        const currentHref = contentWindow.location.href;
        if (
            currentHref &&
            !currentHref.startsWith(this.authorizationUrl) &&
            currentHref.startsWith(window.location.origin)
        ) {
            event.preventDefault();
            window.location.href = currentHref;
        }
    };

    constructor(
        private accountService: NxAccountService,
        private pageService: NxPageService,
        private router: Router,
        private store: Store,
    ) {
        this.startUrl = this.router.url;
        this.startParams = this.router.parseUrl(this.router.url).queryParams;
    }

    ngOnInit(): void {
        if (this.startParams.access_token) {
            this.loaded = !this.useNewCloud;
        } else if (this.startUrl === '/logout') {
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
                            this.oauthService.redirectOauth();
                        } else if (this.startParams.next) {
                            return this.router.navigate([this.startParams.next]);
                        } else {
                            this.loaded = !this.useNewCloud;
                        }
                    }
                });
        }
    }
}
