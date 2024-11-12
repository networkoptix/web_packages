import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { CookieService } from 'ngx-cookie-service';
import { combineLatest, distinctUntilChanged, firstValueFrom, of, timer } from 'rxjs';
import { catchError, debounceTime, filter, map, shareReplay, switchMap } from 'rxjs/operators';

import { accountActions, accountSelectors } from '@common/store/account';
import { ToastType } from '@components/toast-container/toast.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { nxConfig } from '@services/nx-config/config';
import { OauthService } from '@services/oauth.service';
import { LOGIN_STATE } from '@services/session.service.types';
import { NxToastService } from '@services/toast.service';
import { redirect, responseOk, updateInterval } from '@static-variables';

import { NxCloudApiService } from '../nx-cloud-api';
import { NxSessionService } from '../session.service';

import { Account } from './account';
import { BaseAccount } from './base';

@Injectable()
export class CloudAccount extends BaseAccount {
    private dialogs = inject(NxDialogsService);
    private oauthService = inject(OauthService);

    private requestingLogin: Promise<Account | undefined> | undefined;

    constructor(
        cloudApi: NxCloudApiService,
        sessionService: NxSessionService,
        router: Router,
        cookieService: CookieService,
        store: Store,
        toasts: NxToastService,
    ) {
        super(cloudApi, sessionService, router, cookieService, store, toasts);
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
                    this.sessionService.invalidateSession();
                }
            }
        });

        combineLatest([timer(0, updateInterval), currentEmail$])
            .pipe(
                filter(([_, email]) => !!email),
                switchMap(() =>
                    this.cloudApi.account(false).pipe(
                        catchError(err => {
                            // If the error is dealing with connectivity return the current account value.
                            if (err.status > 500) {
                                return of(this.account);
                            }
                            throw err;
                        }),
                    ),
                ),
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
                        window.onbeforeunload = () => {
                            this.sessionService.invalidateSession();
                        };
                        return this.showExpired();
                    }
                    return of(undefined);
                }),
            )
            .subscribe((account: Account) => {
                this.account = account;
            });
    }

    private sleep(time: number): Promise<boolean> {
        return new Promise(resolve => {
            setTimeout(() => resolve(true), time);
        });
    }

    /**
     * This method will log the user out. Be careful when using.
     */
    override async showExpired(): Promise<void> {
        await this.dialogs.expiredSession();
        return this.logoutHelper(true);
    }

    async get(forceUpdate = false): Promise<Account | null | undefined> {
        if (!forceUpdate && this.requestingLogin) {
            // login is requesting, so we wait
            try {
                await this.requestingLogin;
                this.requestingLogin = undefined;
                return this.get();
            } catch {
                return undefined;
            }
        }

        try {
            const account = await firstValueFrom(this.cloudApi.account(forceUpdate)).catch(
                () => this.account,
            );
            if (!account?.is_authenticated) {
                this.account = undefined;
                return undefined;
            }
            this.account = { ...account, isCloud: true };
            return this.account;
        } catch (e) {
            const expiredSession = e?.error?.resultCode === 'badUsername';
            this.account = undefined;

            if (expiredSession) {
                // We explicitly check if account is null to determine if session has expired
                // We should probably refactor account since it's a little unclear that null and undefined have different behavior
                return null;
            }

            this.router.navigate([redirect.unauthorised]).catch(error => {
                console.error(error);
            });
        }
    }

    login(
        email: string,
        password: string,
        remember: boolean,
        navigateHome = false,
    ): Promise<Account | undefined> {
        return this.cloudApi
            .login(email, password, remember)
            .then(result => {
                if (!this.cloudApi.checkResponseHasError(result)) {
                    if (!this.sessionService.isUnauthorized$$()) {
                        // If the user that logged in matches the current session there's no need to show
                        // the logout dialog.
                        if (this.sessionService.changed$$()) {
                            return this.logoutAuthorised().then(() =>
                                Promise.reject({ error: { resultCode: responseOk } }),
                            );
                        }

                        return Promise.resolve({
                            data: {
                                account: result,
                                resultCode: responseOk,
                            },
                        });
                    }

                    if (result?.email || result?.name) {
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
                return Promise.reject({ error: { resultCode: responseOk } });
            })
            .then(result => {
                // Add the reload back until we solve the issues with configservice
                // TODO: CLOUD-7267: Handle account changes without reload
                if (result.data?.resultCode === responseOk) {
                    (navigateHome ? this.redirectToHome() : Promise.resolve()).then(() =>
                        window.location.reload(),
                    );
                }
                return result.data.account as Account;
            })
            .catch((result: HttpErrorResponse) => {
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

    async logoutAuthorised(skipReload = false): Promise<boolean> {
        try {
            const account = await this.get();
            if (!account) {
                return false;
            }
            const isRegister = this.router.url.includes('/register');
            const isRestore = this.router.url.includes('/restore_password');
            const isActivate = this.router.url.includes('/activate');

            let cancelLabel = this.LANG.dialogs.buttons.cancel;
            if (isRegister) {
                cancelLabel = this.LANG.dialogs.buttons.createAccount;
            } else if (isRestore) {
                cancelLabel = this.LANG.dialogs.buttons.logoutAuthorised;
            }
            return this.dialogs
                .confirm({
                    disableClose: true,
                    title: {
                        value: this.LANG.dialogs.titles.changeAccount,
                        params: { email: account.email },
                    },
                    footer: {
                        actionLabel: this.LANG.dialogs.buttons.stayLoggedIn,
                        cancelLabel,
                    },
                })
                .then(result => {
                    const LOGIN_STATE = this.sessionService.LOGIN_STATE;
                    if ((isRestore || isRegister || isActivate) && !result) {
                        this.sessionService.loginState = LOGIN_STATE.CHANGED;
                        this.logout(true, skipReload);
                        return true;
                    } else {
                        this.sessionService.loginState = LOGIN_STATE.AUTHORIZED;
                        this.redirectAuthorised();
                        return false;
                    }
                });
        } catch {
            return false;
        }
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

    // Redirect Methods

    redirectAuthorised(): void {
        this.get().then((account: Account) => {
            if (account) {
                this.router
                    .navigate([
                        nxConfig.featureFlags.channelPartners
                            ? redirect.channelPartners
                            : redirect.authorised,
                    ])
                    .catch(error => {
                        console.error(error);
                    });
            }
        });
    }

    private async redirectToHome(): Promise<void> {
        try {
            const account = await this.get();
            if (account) {
                this.router.navigate([redirect.authorised]).catch(error => {
                    console.error(error);
                });
            } else {
                this.router.navigate([redirect.unauthorised]).catch(error => {
                    console.error(error);
                });
            }
        } catch {
            this.router.navigate([redirect.unauthorised]).catch(error => {
                console.error(error);
            });
        }
    }

    private redirectAfterLogout(doNotRedirect: boolean, skipReload: boolean): void {
        if (!doNotRedirect) {
            this.store.dispatch(accountActions.setCurrentUser({ currentUser: undefined }));
            this.router.navigate([redirect.unauthorised]).finally(() => {
                setTimeout(() => {
                    this.account = undefined;
                    if (!skipReload) {
                        window.location.reload();
                    }
                });
            });
        } else if (!skipReload) {
            setTimeout(() => {
                window.location.reload();
            });
        }
    }

    // Current way of logging in using tokens

    private handleCodeError = async (e: HttpErrorResponse): Promise<boolean | void> => {
        const data = e.error;
        if (data?.error === 'second_factor_required') {
            this.tokens = data;
            this.toasts.notify(this.LANG.toastMessage.twoFaRequired, ToastType.Info);
            return this.oauthService.add2fa(data.access_token || '');
        } else {
            this.clearCodeFromUri();
            this.toasts.show(this.LANG.errorCodes.wrongAuthCode, ToastType.Danger);
            await this.sleep(3000);
            return Promise.resolve(true);
        }
    };

    public async handleRefreshTokenLogin(refreshToken: string): Promise<Account | boolean | void> {
        const url = new URL(window.location.href);
        url.searchParams.delete('refresh_token');
        const { code } = await firstValueFrom(
            this.cloudApi.getTokensFromCloud(refreshToken, 'refresh_token', 'code'),
        );
        url.searchParams.set('code', code);
        window.history.pushState({ url: url.toString() }, '', url.toString());
        return this.handleCodeLogin(code);
    }

    public async handleCodeLogin(code: string): Promise<Account | boolean | void> {
        const account = await this.get(true);
        if (!account || !account.is_authenticated) {
            return this.cloudApi
                .loginCode(code)
                .then(() => {
                    this.sessionService.loginState = LOGIN_STATE.AUTHORIZED;
                    this.clearCodeFromUri();
                    window.location.reload();
                })
                .catch(e =>
                    this.handleCodeError(e).then(reload => reload && window.location.reload()),
                )
                .finally(() => {
                    this.appStateService.ready = true;
                });
        }

        const logoutTokens = (tokens: Record<string, string>, reload = false): Promise<void> => {
            return this.cloudApi
                .logoutTokens(tokens.access_token, tokens.refresh_token)
                .then(() => {
                    this.clearCodeFromUri();
                    if (reload) {
                        window.location.reload();
                    }
                });
        };

        try {
            const tokens = await firstValueFrom(this.cloudApi.getTokensFromCloud(code));
            const tokenInfo = await firstValueFrom(this.cloudApi.getTokenInfo(tokens.access_token));
            this.appStateService.ready = true;
            if ('username' in tokenInfo && tokenInfo.username === account.email) {
                await logoutTokens(tokens);
                return false;
            }

            const res = await this.dialogs.confirm({
                disableClose: true,
                title: this.LANG.dialogs.titles.loggedFromOtherAccount,
                footer: {
                    footerClass: 'long-cancel-button',
                    actionLabel: this.LANG.dialogs.buttons.ok,
                    cancelLabel: {
                        value: this.LANG.dialogs.buttons.stayAs,
                        params: { email: account.email },
                    },
                },
            });

            if (res) {
                this.sessionService.loginState = this.sessionService.LOGIN_STATE.CHANGED;
                return this.loginTokens(tokens);
            }
            return logoutTokens(tokens, true);
        } catch (e) {
            return this.handleCodeError(e).then(() => this.requireLogin());
        } finally {
            this.appStateService.ready = true;
        }
    }

    // Old authKey auth support for pre 5.0 systems
    private clearAuthFromUri(): Promise<boolean> {
        const queryParams = { auth: undefined, from: undefined };
        return this.router.navigate([], { queryParams, queryParamsHandling: 'merge' });
    }

    private async loginWithAuthKey(authKey: string): Promise<boolean> {
        const auth = atob(decodeURIComponent(authKey)).split(':');
        const tempLogin = auth[0];
        const tempPassword = auth[1];

        try {
            await this.login(tempLogin, tempPassword, false);
            return this.clearAuthFromUri();
        } catch {
            return false;
        }
    }

    public async handleAuthKeyLogin(auth: string): Promise<Account | void> {
        const account = await this.get(true);
        if (!account || !account.is_authenticated) {
            return this.loginWithAuthKey(auth).then(() => document.location.reload());
        }
        try {
            const result = await this.cloudApi.checkAuthCode(decodeURIComponent(auth));
            if (result.email === account.email) {
                return;
            }
            const response = await this.dialogs.confirm({
                disableClose: false,
                title: this.LANG.dialogs.titles.loggedFromOtherAccount,
                footer: {
                    footerClass: 'long-cancel-button',
                    actionLabel: this.LANG.dialogs.buttons.ok,
                    cancelLabel: {
                        value: this.LANG.dialogs.buttons.stayAs,
                        params: { email: account.email },
                    },
                },
            });

            if (response) {
                this.logoutHelper(true, true);
                await this.sleep(1000);
                return window.location.reload();
            }
            return this.clearAuthFromUri().then(() => document.location.reload());
        } catch (e) {
            this.toasts.show(this.LANG.errorCodes.wrongAuthCode, ToastType.Danger);
            return this.requireLogin();
        } finally {
            this.appStateService.ready = true;
        }
    }
}
