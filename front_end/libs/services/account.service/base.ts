import { Location } from '@angular/common';
import { Injectable, Injector } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { CookieService } from 'ngx-cookie-service';
import { LocalStorageService } from 'ngx-webstorage';

import { accountActions, accountSelectors } from '@common/store/account';
import { ToastType } from '@components/toast-container/toast.types';
import { NxDialogsService } from '@dialogs/dialogs.service';
import staticLang from '@language_static';
import { NxLoginService } from '@services/login.service';
import { OauthService } from '@services/oauth.service';
import { LOGIN_STATE } from '@services/session.service.types';
import { NxSystemRestAPI3 } from '@services/system-rest-api-v3.service';
import { NxToastService } from '@services/toast.service';
import { oauthStore, redirect } from '@static-variables';

import { NxApplyService } from '../apply.service';
import { NxAppStateService } from '../nx-app-state.service';
import { NxCloudApiService } from '../nx-cloud-api';
import { nxConfig } from '../nx-config/config';
import { NxSessionService } from '../session.service';
import { NxStorageService } from '../storage.service';
import { NxSystemAPIService } from '../system-api.service';
import { NxUriService } from '../uri.service';
import { windowFactory } from '../window-provider';

import { Account } from './account';

/**
 * BaseAccount is an abstract class extended by CloudAccount and LocalAccount.
 * CloudAccount and LocalAccount overrides should maintain same interface
 * as BaseAccount.
 */
@Injectable()
export abstract class BaseAccount {
    protected CONFIG = nxConfig;
    protected window: Window = windowFactory();
    protected document: Document = this.window.document;
    protected LANG = staticLang;
    protected location: Location;
    protected requestingLogin: any;
    protected loginDialogActive: boolean;
    protected localStorage: any;
    protected tokens: any;

    private _account: Account;

    // Declare services that cause circular dependencies here instead of injecting in constructor
    protected applyService: NxApplyService;

    // Only in LocalAccount but added here for TS convenience
    mediaServerApi: NxSystemRestAPI3;

    // Abstract methods implemented by cloud and local versions
    abstract logoutHelper(doNotRedirect?: boolean, skipReload?: boolean): void;
    abstract get(forceUpdate?: boolean): Promise<Account>;
    abstract login(
        email: string,
        password: string,
        remember?: boolean,
        navigateHome?: boolean,
    ): any;
    abstract redirectAuthorised(): void;
    abstract requireLogin(): Promise<any>;
    abstract showLogin(keepPage?: boolean): void;

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
        // language provider will be ready at this point
        // we don't support dynamic lang switch ... ==TT
        // languageService.translateSubject.subscribe(lang => { this.LANG = lang; });
        this.location = locationService;
        this.loginDialogActive = false;

        // Singleton service will be destroyed with application
        this.store
            .select(accountSelectors.selectCurrentUser)
            .pipe(takeUntilDestroyed())
            .subscribe(account => {
                this._account = account;
            });

        // Imperatively inject any services that cause circular dependencies here instead of passing in constructor
        // setTimeout(() => {
        this.applyService = injector.get(NxApplyService);

        this.localStorage = injector.get(LocalStorageService);
        this.localStorage.observe(oauthStore.verify2fa).subscribe(accessToken => {
            if (!this.tokens) {
                return;
            }
            if (this.tokens.access_token !== accessToken) {
                return this.toasts.show(this.LANG.errorCodes.wrongAuthCode, ToastType.Danger);
            }
            this.toasts.notify(this.LANG.toastMessage.loggingIn, ToastType.Success);
            this.loginTokens(this.tokens).then(() => {});
        });
    }

    private loginTokens(tokens) {
        return this.cloudApi.loginTokens(tokens).then((res: any) => {
            this.tokens = undefined;
            this.clearCodeFromUri();
            this.localStorage.clear(oauthStore.verify2fa);
            this.localStorage.clear('systemId');
            // Changing "loginState" is enough here. Re-init routes are subscribed to it.
            this.sessionService.loginState = this.sessionService.LOGIN_STATE.AUTHORIZED;
            setTimeout(() => this.window.location.reload());
        });
    }

    // Methods shared between local and cloud versions of account service.
    private initStoreUpdater(account: Account) {
        this._account = account;
        this.store.dispatch(accountActions.setCurrentUser({ currentUser: account }));
    }

    get account(): Account {
        return this._account;
    }

    set account(account: Account) {
        this.initStoreUpdater(account);
        const login = account?.email || account?.name;
        const currentLogin = this._account?.email || this._account?.name;
        const LOGIN_STATE = this.sessionService.LOGIN_STATE;
        if (currentLogin && login) {
            this.sessionService.loginState =
                currentLogin === login ? LOGIN_STATE.AUTHORIZED : LOGIN_STATE.CHANGED;
        } else if (currentLogin || login) {
            this.sessionService.loginState = LOGIN_STATE.AUTHORIZED;
        }
    }

    get email() {
        return this._account?.email;
    }

    get loginState() {
        return this.sessionService.loginState;
        // This is name on local, not email
    }

    set loginState(state: LOGIN_STATE) {
        this.sessionService.loginState = state;
    }

    async authKey() {
        const { auth_key: auth } = await this.cloudApi.authKey();
        return auth;
    }

    protected clearLoginState(): void {
        this.sessionService.invalidateSession();
    }

    redirectToHome() {
        return this.get()
            .then((account: Account) => {
                if (account) {
                    this.router.navigate([redirect.authorised]).catch(error => {
                        console.error(error);
                    });
                } else {
                    this.router.navigate([redirect.unauthorised]).catch(error => {
                        console.error(error);
                    });
                }
            })
            .catch(() => {
                this.router.navigate([redirect.unauthorised]).catch(error => {
                    console.error(error);
                });
            });
    }

    redirectAfterLogout(doNotRedirect, skipReload): void {
        if (!doNotRedirect) {
            this.router.navigate([redirect.unauthorised]).finally(() => {
                setTimeout(() => {
                    this.account = undefined;
                    if (!skipReload) {
                        this.window.location.reload();
                    }
                });
            });
        } else if (!skipReload) {
            setTimeout(() => {
                this.window.location.reload();
            });
        }
    }

    loginWithAuthKey(authKey: string): Promise<boolean> {
        const auth = atob(decodeURIComponent(authKey)).split(':');
        const tempLogin = auth[0];
        const tempPassword = auth[1];

        return this.login(tempLogin, tempPassword, false)
            .then(() => this.clearAuthFromUri())
            .catch(() => {
                return this.loginService.login(true);
            });
    }

    // TODO: @Chris check for apply service in logout functions

    logout(doNotRedirect = false, skipReload = false): void {
        this.applyService.canMove().then((allowed: boolean) => {
            if (allowed) {
                // this.account = undefined; <- moved to logout helper --TT
                this.logoutHelper(doNotRedirect, skipReload);
            }
        });
    }

    logoutAuthorised(skipReload = false) {
        return this.get().then((account: Account) => {
            // logoutAuthorisedLogoutButton
            if (account) {
                const isRegister = this.router.url.includes('/register');
                const isRestore = this.router.url.includes('/restore_password');
                const isActivate = this.router.url.includes('/activate');

                let cancelLabel = '';
                if (isRegister) {
                    cancelLabel = this.LANG.dialogs.buttons.createAccount;
                } else if (isRestore) {
                    cancelLabel = this.LANG.dialogs.buttons.logoutAuthorised;
                } else {
                    cancelLabel = this.LANG.dialogs.buttons.cancel;
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
                        if ((isRestore || isRegister || isActivate) && result === false) {
                            this.sessionService.loginState = LOGIN_STATE.CHANGED;
                            this.logout(true, skipReload);
                            return true;
                        } else {
                            this.sessionService.loginState = LOGIN_STATE.AUTHORIZED;
                            this.redirectAuthorised();
                            return false;
                        }
                    });
            }
        });
    }

    private clearAuthFromUri() {
        const queryParams = { auth: undefined, from: undefined };
        return this.router.navigate([], { queryParams, queryParamsHandling: 'merge' });
    }

    private clearCodeFromUri(): void {
        const url = new URL(this.window.location.href);
        url.searchParams.delete('code');
        this.window.history.pushState({ url: url.toString() }, '', url.toString());
    }

    protected sleep(time) {
        return new Promise((resolve, reject) => {
            setTimeout(() => resolve(true), time);
        });
    }

    private handleCodeError = async e => {
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

    public async handleRefreshTokenLogin(refreshToken) {
        const url = new URL(this.window.location.href);
        url.searchParams.delete('refresh_token');
        const { code }: any = await this.cloudApi
            .getTokensFromCloud(refreshToken, 'refresh_token', 'code')
            .toPromise();
        url.searchParams.set('code', code);
        this.window.history.pushState({ url: url.toString() }, '', url.toString());
        return this.handleCodeLogin(code);
    }

    public async handleCodeLogin(code: string) {
        const account = await this.get(true);
        if (!account || !account.is_authenticated) {
            return this.cloudApi
                .loginCode(code)
                .then(res => {
                    this.sessionService.loginState = LOGIN_STATE.AUTHORIZED;
                    this.clearCodeFromUri();
                    this.window.location.reload();
                })
                .catch(e =>
                    this.handleCodeError(e).then(reload => reload && this.window.location.reload()),
                )
                .finally(() => {
                    this.appStateService.ready = true;
                });
        }

        const logoutTokens = (tokens, reload = false) => {
            return this.cloudApi
                .logoutTokens(tokens.access_token, tokens.refresh_token)
                .then(() => {
                    this.clearCodeFromUri();
                    if (reload) {
                        this.window.location.reload();
                    }
                });
        };

        try {
            const tokens: any = await this.cloudApi.getTokensFromCloud(code).toPromise();
            const tokenInfo: any = await this.cloudApi
                .getTokenInfo(tokens.access_token)
                .toPromise();
            this.appStateService.ready = true;
            if (tokenInfo.username === account.email) {
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

    public async handleAuthKeyLogin(auth: string) {
        const account: Account = await this.get(true);
        if (!account || !account.is_authenticated) {
            return this.loginWithAuthKey(auth).then(() => this.document.location.reload());
        }
        try {
            const result: any = await this.cloudApi.checkAuthCode(decodeURIComponent(auth));
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
                await this.logoutHelper(true, true);
                await this.sleep(1000);
                return this.window.location.reload();
            }
            return this.clearAuthFromUri().then(() => this.document.location.reload());
        } catch (e) {
            this.toasts.show(this.LANG.errorCodes.wrongAuthCode, ToastType.Danger);
            return this.requireLogin();
        } finally {
            this.appStateService.ready = true;
        }
    }
}
