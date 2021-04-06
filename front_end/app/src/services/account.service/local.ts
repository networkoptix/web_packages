import {
    Inject, Injectable, Injector
}                                    from '@angular/core';
import { DOCUMENT, Location }        from '@angular/common';
import { Router }                    from '@angular/router';
import { forkJoin }                  from 'rxjs';
import { tap, catchError, map }      from 'rxjs/operators';

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
import { BaseAccount }               from './base';
import { Account }                   from './account';
import { NxStorageService }          from '../storage.service';
import { CookieService }             from 'ngx-cookie-service';

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
        protected cookieService: CookieService,
        protected cloudApi: NxCloudApiService,
        protected sessionService: NxSessionService,
        protected uriService: NxUriService,
        protected storageService: NxStorageService,
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
            storageService,
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
            const account = new Account(user);
            this.account = account;
            return account;
        } catch (err) {
            if (!this.loginDialogActive) {
                return this.showLogin().then(() => undefined);
            }
        }
    }

    login(login, password, remember = false, navigateHome = false) {
        return this.mediaServerApi.login(login, password, remember)
            .pipe(
                catchError(({ errorString: errorText, ...res }) => {
                    const errorLookup = {
                        'Wrong password.'                                                                         : 'notAuthorized',
                        'Wrong username or password.'                                                             : 'notAuthorized',
                        'This user on your IP is locked out due to many filed attempts. Please, try again later.' : 'accountBlocked'
                    };
                    const resultCode = errorLookup[errorText];
                    return Promise.resolve({ ...res, errorText, resultCode });
                }),
                tap(res => {
                    this.sessionService.loginState = (res.resultCode) ? undefined : login;
                })
            );
    }

    loginAllServers(login, password, remember = false) {
        return this.mediaServerApi.getMediaServers(false).pipe(
            map((servers: any) =>
                forkJoin(servers.map((server) => {
                    const newServer = this.nxSystemAPIService.createConnection(login, undefined, server.id, () => {
                    });
                    return newServer.login(login, password, remember);
                }))
            )
        ).toPromise();
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
        this.mediaServerApi
            .logout()
            .finally(() => {
                this.cookieService.deleteAll();
                this.sessionService.invalidateSession(); // Clear session

                if (!doNotRedirect) {
                    this.router
                        .navigate([this.CONFIG.redirect.unauthorised])
                        .finally(() => {
                            setTimeout(() => skipReload && this.window.location.reload());
                        });
                } else if (!skipReload) {
                    setTimeout(() => {
                        this.window.location.reload();
                    });
                }
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
