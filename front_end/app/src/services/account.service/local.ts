import {
    Inject, Injectable, Injector
}                                     from '@angular/core';
import { DOCUMENT, Location }         from '@angular/common';
import { Router }                     from '@angular/router';
import { LocalStorageService }        from 'ngx-store';
import { Exactly }                    from '../utils.service';
import { NxConfigService }            from '../nx-config';
import { NxCloudApiService }          from '../nx-cloud-api';
import { NxLanguageProviderService }  from '../nx-language-provider';
import { NxSessionService }           from '../session.service';
import { WINDOW }                     from '../window-provider';
import { NxAppStateService }          from '../nx-app-state.service';
import { NxUriService }               from '../uri.service';
import { NxPollService }              from '../poll.service';
import { NxSystemAPIService }         from '../system-api.service';
import { BaseAccount }                from './base';
import { Account }                    from './account';
import { tap, catchError }            from 'rxjs/operators';

/**
 * LocalAcount overrides BaseAccount, should maintain the same interface.
 * This is enforced using the Exactly<BaseAccount, LocalAccount> type.
 */
@Injectable()
export class LocalAccount extends BaseAccount implements Exactly<BaseAccount, LocalAccount> {
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
        protected nxSystemAPIService: NxSystemAPIService,
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

    async get(forceUpdate = false) {
        try {
            const { reply: user } = await this.mediaServerApi.getCurrentUser(forceUpdate);
            return new Account(user);
        } catch (err) {
            if (!this.loginDialogActive) {
                return this.showLogin().then(() => <false> false);
            }
        }
    }

    login(login, password, remember = false) {
        return this.mediaServerApi.login(login, password, remember)
            .pipe(
                catchError(({ errorString: errorText, ...res }) => {
                    const errorLookup = {
                        'Wrong username or password.'                                                             : 'notAuthorized',
                        'This user on your IP is locked out due to many filed attempts. Please, try again later.' : 'accountBlocked'
                    };
                    const resultCode = errorLookup[errorText];
                    return Promise.resolve({ ...res, errorText, resultCode });
                }),
                tap(res => {
                    this.sessionService.loginState = login;
                })
            );
    }

    logout(doNotRedirect = false) {
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

    logoutHelper(doNotRedirect = false) {
        this.mediaServerApi
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

    requireLogin() {
        return this.get()
            .then((account: Account) => {
                return account || !this.loginDialogActive && this.showLogin();
            }).catch(() => {
                if (!this.loginDialogActive) {
                    return this.showLogin();
                } else {
                    return undefined;
                }
            });
    }
}
