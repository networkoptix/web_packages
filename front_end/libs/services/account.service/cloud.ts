import { Location } from '@angular/common';
import { Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { CookieService } from 'ngx-cookie-service';
import { combineLatest, distinctUntilChanged, firstValueFrom, of, timer } from 'rxjs';
import { catchError, debounceTime, filter, map, shareReplay, switchMap } from 'rxjs/operators';

import { accountSelectors } from '@common/store/account';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { environment } from '@environments/environment';
import { NxLoginService } from '@services/login.service';
import { nxConfig } from '@services/nx-config/config';
import { OauthService } from '@services/oauth.service';
import { NxToastService } from '@services/toast.service';
import { redirect, responseOk, updateInterval } from '@static-variables';

import { NxAppStateService } from '../nx-app-state.service';
import { NxCloudApiService } from '../nx-cloud-api';
import { NxSessionService } from '../session.service';
import { NxStorageService } from '../storage.service';
import { NxSystemAPIService } from '../system-api.service';
import { NxUriService } from '../uri.service';

import { Account } from './account';
import { BaseAccount } from './base';

@Injectable()
export class CloudAccount extends BaseAccount {
    constructor(
        protected translateService: TranslateService,
        locationService: Location,
        protected cloudApi: NxCloudApiService,
        protected sessionService: NxSessionService,
        protected uriService: NxUriService,
        protected storageService: NxStorageService,
        protected router: Router,
        protected appStateService: NxAppStateService,
        injector: Injector,
        protected nxSystemAPIService: NxSystemAPIService,
        protected loginService: NxLoginService,
        protected oauthService: OauthService,
        protected cookieService: CookieService,
        protected store: Store,
        protected dialogs: NxDialogsService,
        protected toasts: NxToastService,
    ) {
        super(
            translateService,
            locationService,
            cloudApi,
            sessionService,
            uriService,
            storageService,
            router,
            appStateService,
            injector,
            nxSystemAPIService,
            loginService,
            oauthService,
            cookieService,
            store,
            dialogs,
            toasts,
        );
        this.account = this.CONFIG.preloadedAccount as Account;
        const currentEmail$ = this.store
            .select(accountSelectors.selectCurrentUserName)
            .pipe(
                debounceTime(1000),
                distinctUntilChanged(),
                shareReplay({ bufferSize: 1, refCount: true }),
            );

        // Distinct until changed is used to prevent the logout function from looping.
        currentEmail$.subscribe(email => {
            if (email !== '') {
                if (!email) {
                    this.clearLoginState();
                }
            }
        });

        combineLatest([timer(0, updateInterval), currentEmail$])
            .pipe(
                filter(([_, email]) => !!email),
                switchMap(() => this.cloudApi.account(false)),
                map((account: Account) => {
                    if (!account?.is_authenticated) {
                        throw Error('unauthorized');
                    }
                    return account;
                }),
                catchError(res => {
                    if (
                        res?.error?.resultCode === 'badUsername' ||
                        res?.message === 'unauthorized'
                    ) {
                        // Ensures that we logout if the user tries to leave the page.
                        this.window.onbeforeunload = () => {
                            this.sessionService.invalidateSession();
                        };
                        return this.dialogs.expiredSession().then(() => this.logoutHelper(true));
                    }
                    return of(undefined);
                }),
            )
            .subscribe((account: Account) => {
                this.account = account;
            });
    }

    get(forceUpdate = false): Promise<Account> {
        if (!forceUpdate && this.requestingLogin) {
            // login is requesting, so we wait
            return this.requestingLogin.then(
                () => {
                    this.requestingLogin = undefined; // clean requestingLogin reference
                    return this.get(); // Try again
                },
                () => {
                    return false;
                },
            );
        }

        return firstValueFrom(this.cloudApi.account(forceUpdate))
            .then((account: Account | any) => {
                if (!account?.is_authenticated) {
                    this.account = undefined;
                    return undefined;
                }
                this.account = { ...account, isCloud: true };
                return this.account;
            })
            .catch(res => {
                const expiredSession = res?.error?.resultCode === 'badUsername';
                this.account = undefined;

                if (expiredSession) {
                    // We explicitly check if account is null to determine if session has expired
                    // We should probably refactor account since it's a little unclear that null and undefined have different behavior
                    return null;
                }

                this.router.navigate([redirect.unauthorised]).catch(error => {
                    console.error(error);
                });
            });
    }

    login(email: string, password: string, remember: boolean, navigateHome = false): Promise<any> {
        this.requestingLogin = this.cloudApi.login(email, password, remember);

        return this.requestingLogin
            .then((result: any) => {
                if (!this.cloudApi.checkResponseHasError(result)) {
                    if (!this.sessionService.isUnauthorized$$()) {
                        // If the user that logged in matches the current session there's no need to show
                        // the logout dialog.
                        if (this.sessionService.changed$$()) {
                            return this.logoutAuthorised();
                        }

                        return Promise.resolve({
                            data: {
                                account: result,
                                resultCode: responseOk,
                            },
                        });
                    }

                    if (result.email || result.name) {
                        // (result.data.resultCode === L.errorCodes.ok)
                        this.sessionService.loginState = this.sessionService.LOGIN_STATE.AUTHORIZED; // Forcing changing loginState to reload interface
                    }

                    return Promise.resolve({
                        data: {
                            account: result,
                            resultCode: responseOk,
                        },
                    });
                }
                return Promise.reject({ error: { resultCode: result.resultCode } });
            })
            .then(result => {
                // Add the reload back until we solve the issues with configservice
                // TODO: CLOUD-7267: Handle account changes without reload
                if (result.data?.resultCode === responseOk) {
                    (navigateHome ? this.redirectToHome() : Promise.resolve()).then(() =>
                        this.window.location.reload(),
                    );
                }
                return result;
            })
            .catch((result: any) => {
                if (this.cloudApi.checkResponseHasError(result.error)) {
                    return Promise.reject({ resultCode: result.error.resultCode });
                }
            });
    }

    logoutHelper(doNotRedirect = false, skipReload = false): void {
        this.cloudApi.logout().finally(() => {
            this.sessionService.invalidateSession(); // Clear session
            // cookieService.deleteAll doesn't remove all the cookies most of the time
            // known cookies getting deleted here are the csrftoken and system/code cookies
            const cookies = this.cookieService.getAll();
            for (const cookie in cookies) {
                if (cookie !== 'language') {
                    this.cookieService.delete(cookie);
                }
            }

            this.redirectAfterLogout(doNotRedirect, skipReload);
        });
    }

    redirectAuthorised(): void {
        this.get().then((account: Account) => {
            if (account) {
                this.router
                    .navigate([
                        !environment.isLocal && nxConfig.featureFlags.channelPartners
                            ? redirect.channelPartners
                            : redirect.authorised,
                    ])
                    .catch(error => {
                        console.error(error);
                    });
            }
        });
    }

    showLogin(_keepPage?: boolean): void {
        // Cloud portal no longer uses login dialog
        this.oauthService.redirectOauth();
    }

    async requireLogin(): Promise<void | Account> {
        return this.get(false)
            .catch(async () => {
                await this.sleep(1000);
                return this.get(false);
            })
            .then(account => {
                if (account === null) {
                    this.logoutHelper(true, true);
                } else if (!account?.is_authenticated) {
                    this.oauthService.redirectOauth();
                } else if (account.is_authenticated) {
                    return account;
                }
            })
            .catch(err => {
                console.error(err);
                this.router.navigate([redirect.unauthorised]).catch(_ => {});
            });
    }
}
