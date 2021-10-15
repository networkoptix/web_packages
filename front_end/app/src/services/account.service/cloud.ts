import { Inject, Injectable, Injector } from '@angular/core';
import { DOCUMENT, Location }           from '@angular/common';
import { Router }                       from '@angular/router';

import { BaseAccount }               from './base';
import { Exactly }                   from '../utils.service';
import { NxConfigService }           from '../nx-config';
import { NxCloudApiService }         from '../nx-cloud-api';
import { NxLanguageProviderService } from '../nx-language-provider';
import { NxSessionService }          from '../session.service';
import { WINDOW }                    from '../window-provider';
import { NxAppStateService }         from '../nx-app-state.service';
import { NxUriService }              from '../uri.service';
import { NxPollService }             from '../poll.service';
import { NxSystemAPIService }        from '../system-api.service';
import { NxStorageService }          from '../storage.service';
import { Account }                   from '@services/account.service/account';
import { OauthService }              from '@services/oauth.service';

/**
 * CloudAccount overrides BaseAccount, should maintain the same interface.
 * This is enforced using the Exactly<BaseAccount, CloudAccount> type.
 */
@Injectable()
export class CloudAccount extends BaseAccount implements Exactly<BaseAccount, CloudAccount> {
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
        private oauthService: OauthService
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
            nxSystemAPIService
        );
    }

    get(forceUpdate = false): Promise<Account> {
        if (this.requestingLogin) {
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
            .catch(() => {
                this.account = undefined;
                this.router
                    .navigate([this.CONFIG.redirect.unauthorised])
                    .catch(error => {
                        console.error(error);
                    });
                return undefined;
            });
    }

    login(email: string, password: string, remember: boolean, navigateHome = false) {
        this.sessionService.email = email;

        if (this.CONFIG.isLocal) {
            this.requestingLogin = this.mediaServerApi.login(email, password).toPromise();
        } else {
            this.requestingLogin = this.cloudApi.login(email, password, remember);
        }

        return this.requestingLogin.then((result: any) => {
            if (!this.cloudApi.checkResponseHasError(result)) {
                if (this.CONFIG.isLocal) {
                    this.account = result;
                    this.sessionService.loginState = result.email || result.name;
                }
                if (this.sessionService.loginState) {
                    // If the user that logged in matches the current session there's no need to show
                    // the logout dialog.
                    if (!this.CONFIG.isLocal && result.email !== this.sessionService.loginState) {
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
            // eslint-disable-next-line prefer-promise-reject-errors
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
                // eslint-disable-next-line prefer-promise-reject-errors
                return Promise.reject({ resultCode: result.error.resultCode });
            }
        });
    }

    logout(doNotRedirect = false, skipReload = false) {
        this.account = undefined;

        if (this.loggingOut) {
            return;
        }

        this.applyService
            .canMove()
            .then((allowed: boolean) => {
                if (allowed) {
                    this.loggingOut = true;
                    this.logoutHelper(doNotRedirect, skipReload);
                }
            });
    }

    logoutHelper(doNotRedirect = false, skipReload = false) {
        this.cloudApi
            .logout()
            .finally(() => {
                this.sessionService.invalidateSession(); // Clear session
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
        return this.get()
            .then(account => {
                if (!account || !account.is_authenticated) {
                    this.oauthService.redirectOauth();
                } else if (account.is_authenticated) {
                    return account;
                }
            }).catch(() => {
                this.router.navigate([this.CONFIG.redirect.unauthorised]);
            });
    }
}
