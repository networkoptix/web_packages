import { BaseAccount } from './base';
import { Account } from './account';
import { Exactly } from '../../utils/utility-types';
import { Inject, Injector }        from '@angular/core';
import { DOCUMENT, Location }                             from '@angular/common';
import { LocalStorageService }                            from 'ngx-store';
import { Router }                                         from '@angular/router';
import { NxConfigService }                       from '../nx-config';
import { NxCloudApiService }                              from '../nx-cloud-api';
import { NxLanguageProviderService }                      from '../nx-language-provider';
import { NxSessionService }                               from '../session.service';
import { WINDOW }                                         from '../window-provider';
import { NxAppStateService }                              from '../nx-app-state.service';
import { NxUriService }                                   from '../uri.service';
import { NxPollService }                                  from '../poll.service';
import { NxSystemAPIService } from '../system-api.service';

/**
 * CloudAcount over-rides BaseAccount, should maintain the same interface.
 */
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
        protected localStorageService: LocalStorageService,
        protected router: Router,
        protected appStateService: NxAppStateService,
        protected pollService: NxPollService,
        injector: Injector,
        protected nxSystemAPIService: NxSystemAPIService
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
            localStorageService,
            router,
            appStateService,
            pollService,
            injector,
            nxSystemAPIService
        );
    }

    get(forceUpdate = false) {
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
            .account().toPromise()
            .then((account: Account) => {
                this.account = account;
                return account;
            })
            .catch(() => {
                return this.account;
            });
    }

    login(email: string, password: string, remember: boolean) {
        this.sessionService.email = email;

        if (this.CONFIG.isLocal) {
            this.requestingLogin = this.mediaServerApi.login(email, password);
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
                            account    : result,
                            resultCode : this.CONFIG.responseOk
                        }
                    });
                }

                if (result.email || result.name) { // (result.data.resultCode === L.errorCodes.ok)
                    this.sessionService.email = result.email;
                    this.sessionService.loginState = result.email || result.name; // Forcing changing loginState to reload interface
                }

                return Promise.resolve({
                    data: {
                        account    : result,
                        resultCode : this.CONFIG.responseOk
                    }
                });
            }
            // eslint-disable-next-line prefer-promise-reject-errors
            return Promise.reject({ error: { resultCode: result.resultCode } });
        }).catch((result: any) => {
            if (this.cloudApi.checkResponseHasError(result.error)) {
                // eslint-disable-next-line prefer-promise-reject-errors
                return Promise.reject({ resultCode: result.error.resultCode });
            }
        });
    }

    logout(doNotRedirect) {
        this.account = undefined;

        if (this.loggingOut) {
            return;
        }

        this.applyService
            .canMove()
            .then((allowed: boolean) => {
                if (allowed) {
                    this.loggingOut = true;
                    this.logoutHelper(doNotRedirect);
                }
            });
    }

    logoutHelper(doNotRedirect) {
        this.cloudApi
            .logout()
            .finally(() => {
                this.sessionService.invalidateSession(); // Clear session
                if (!doNotRedirect) {
                    this.router
                        .navigate([this.CONFIG.redirect.unauthorised])
                        .finally(() => {
                            setTimeout(() => this.window.location.reload());
                        });
                }

                setTimeout(() => {
                    this.window.location.reload();
                });
            });
    }

    serviceInstance() {
        return 'is cloud';
    }
}
