import { DOCUMENT, Location } from '@angular/common';
import { Inject, Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';

import { Account } from '@services/account.service/account';
import { NxLoginService } from '@services/login.service';
import { NxBootstrapProvider } from '@services/nx-bootstrap-provider';
import { OauthService } from '@services/oauth.service';

import { NxAppStateService } from '../nx-app-state.service';
import { NxCloudApiService } from '../nx-cloud-api';
import { NxConfigService } from '../nx-config';
import { NxLanguageProviderService } from '../nx-language-provider';
import { NxPollService } from '../poll.service';
import { NxSessionService } from '../session.service';
import { NxStorageService } from '../storage.service';
import { NxSystemAPIService } from '../system-api.service';
import { NxUriService } from '../uri.service';
import { WINDOW } from '../window-provider';

import { BaseAccount } from './base';

@Injectable()
export class CloudAccount extends BaseAccount {
    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        locationService: Location,
        @Inject(DOCUMENT) protected document: Document,
        @Inject(WINDOW) protected window: Window,
        protected cloudApi: NxCloudApiService,
        protected sessionService: NxSessionService,
        protected uriService: NxUriService,
        protected storageService: NxStorageService,
        protected router: Router,
        protected appStateService: NxAppStateService,
        protected pollService: NxPollService,
        injector: Injector,
        protected nxSystemAPIService: NxSystemAPIService,
        protected loginService: NxLoginService,
        protected oauthService: OauthService,
        protected cookieService: CookieService,
        protected bootstrapProviderService: NxBootstrapProvider
    ) {
        super(
            configService,
            languageService,
            locationService,
            document,
            window,
            cloudApi,
            sessionService,
            uriService,
            storageService,
            router,
            appStateService,
            pollService,
            injector,
            nxSystemAPIService,
            loginService,
            oauthService,
            cookieService,
            bootstrapProviderService
        );
    }

    get(forceUpdate = false): Promise<Account> {
        if (!forceUpdate && this.requestingLogin) {
            // login is requesting, so we wait
            return this.requestingLogin
                .then(() => {
                    this.requestingLogin = undefined; // clean requestingLogin reference
                    return this.get(); // Try again
                }, () => {
                    return false;
                });
        }

        if (this.account && !forceUpdate) {
            return Promise.resolve(this.account);
        }

        return this.cloudApi
            .account(true).toPromise()
            .then((account: Account|any) => {
                // eslint-disable-next-line camelcase
                if (!account?.is_authenticated) {
                    this.account = undefined;
                    return undefined;
                }
                this.account = { ...account, isCloud: true };
                return this.account;
            })
            .catch((res) => {
                const expiredSession = res?.error?.resultCode === 'badUsername';
                this.account = undefined;

                if (expiredSession) {
                    // We explicitly check if account is null to determine if session has expired
                    // We should probably refactor account since it's a little unclear that null and undefined have different behavior
                    return null;
                }

                this.router
                    .navigate([this.CONFIG.redirect.unauthorised])
                    .catch(error => {
                        console.error(error);
                    });
            });
    }

    login(email: string, password: string, remember: boolean, navigateHome = false) {
        this.sessionService.email = email;
        this.requestingLogin = this.cloudApi.login(email, password, remember);

        return this.requestingLogin.then((result: any) => {
            if (!this.cloudApi.checkResponseHasError(result)) {
                if (this.sessionService.loginState) {
                    // If the user that logged in matches the current session there's no need to show
                    // the logout dialog.
                    if (result.email !== this.sessionService.loginState) {
                        return this.logoutAuthorised();
                    }

                    return Promise.resolve({
                        data: {
                            account: result,
                            resultCode: this.CONFIG.responseOk
                        }
                    });
                }

                if (result.email || result.name) { // (result.data.resultCode === L.errorCodes.ok)
                    this.sessionService.email = result.email;
                    this.sessionService.loginState = result.email || result.name; // Forcing changing loginState to reload interface
                }

                return Promise.resolve({
                    data: {
                        account: result,
                        resultCode: this.CONFIG.responseOk
                    }
                });
            }
            return Promise.reject({ error: { resultCode: result.resultCode } });
        }).then(result => {
            // Add the reload back until we solve the issues with configservice
            // TODO: CLOUD-7267: Handle account changes without reload
            if (result.data?.resultCode === this.CONFIG.responseOk) {
                (navigateHome ? this.redirectToHome() : Promise.resolve()).then(() => this.window.location.reload());
            }
            return result;
        }).catch((result: any) => {
            if (this.cloudApi.checkResponseHasError(result.error)) {
                return Promise.reject({ resultCode: result.error.resultCode });
            }
        });
    }

    logout(doNotRedirect = false, skipReload = false) {
        if (this.loggingOut) {
            return;
        }

        this.applyService
            .canMove()
            .then((allowed: boolean) => {
                if (allowed) {
                    this.loggingOut = true;
                    this.account = undefined;
                    this.logoutHelper(doNotRedirect, skipReload);
                }
            });
    }

    logoutHelper(doNotRedirect = false, skipReload = false) {
        this.cloudApi
            .logout()
            .finally(() => {
                this.sessionService.invalidateSession(); // Clear session
                // cookieService.deleteAll doesn't remove all the cookies most of the time
                // known cookies getting deleted here are the csrftoken and system/code cookies
                const cookies = this.cookieService.getAll();
                for (const cookie in cookies) {
                    if (cookie !== 'language') {
                        this.cookieService.delete(cookie);
                    }
                }
                if (!doNotRedirect) {
                    this.router
                        .navigate([this.CONFIG.redirect.unauthorised])
                        .finally(() => {
                            setTimeout(() => !skipReload && this.window.location.reload());
                        });
                } else if (!skipReload) {
                    setTimeout(() => {
                        this.window.location.reload();
                    });
                }
            });
    }

    showLogin(
        _keepPage?: boolean,
        _redirectClose?: boolean,
        _redirectHome?: boolean,
        _blockNavigation?: boolean
    ): void {
        // Cloud portal no longer uses login dialog
        this.oauthService.redirectOauth();
    }

    requireLogin(): Promise<void | Account> {
        return this.get(true)
            .then(account => {
                if (account === null) {
                    this.logoutHelper(true, true);
                } else if (!account?.is_authenticated) {
                    this.oauthService.redirectOauth();
                } else if (account.is_authenticated) {
                    return account;
                }
            }).catch((err) => {
                console.error(err);
                this.router.navigate([this.CONFIG.redirect.unauthorised]);
            });
    }
}
