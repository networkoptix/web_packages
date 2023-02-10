import { DOCUMENT, Location } from '@angular/common';
import { Inject, OnDestroy, Injector, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { CookieService } from 'ngx-cookie-service';
import { LocalStorageService } from 'ngx-webstorage';
import { Observable, of, Subscription } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';

import staticLang from '@common/language/language_i18n_static.json';
import { accountActions, accountSelectors } from '@common/store/account';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { environment } from '@environments/environment';
import { oauthStore, redirect, updateInterval } from '@lib/variables/static-variables';
import { NxLoginService } from '@services/login.service';
import { NxBootstrapProvider } from '@services/nx-bootstrap-provider';
import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import { OauthService } from '@services/oauth.service';
import type { NxSystemRestAPI } from '@services/system-rest-api.service';

import { NxApplyService } from '../apply.service';
import { NxAppStateService } from '../nx-app-state.service';
import { NxCloudApiService } from '../nx-cloud-api';
import { NxPollService } from '../poll.service';
import { NxSessionService } from '../session.service';
import { NxStorageService } from '../storage.service';
import { NxSystemAPIService } from '../system-api.service';
import { NxUriService } from '../uri.service';
import { WINDOW } from '../window-provider';

import { Account } from './account';

/**
 * BaseAccount is an abstract class extended by CloudAccount and LocalAccount.
 * CloudAccount and LocalAccount overrides should maintain same interface
 * as BaseAccount.
 */
@Injectable()
export abstract class BaseAccount implements OnDestroy {
    protected CONFIG: IConfig;
    protected LANG = staticLang;
    protected location: Location;
    protected requestingLogin: any;
    protected loginDialogActive: boolean;
    protected localStorage: any;
    protected tokens: any;

    protected accountPoll: Observable<Account | string>;
    protected accountPollSubscription: Subscription;
    protected loginSubscription: Subscription;
    protected queryParamSubscription: Subscription;

    private _account: Account;

    // Declare services that cause circular dependencies here instead of injecting in constructor
    protected applyService: NxApplyService;

    // Only in LocalAccount but added here for TS convenience
    mediaServerApi: NxSystemRestAPI;

    // Abstract methods implemented by cloud and local versions
    abstract logoutHelper(doNotRedirect?: boolean, skipReload?: boolean): void;
    abstract get(forceUpdate?: boolean): Promise<Account>;
    abstract login(email: string, password: string, remember?: boolean, navigateHome?: boolean): any;
    abstract requireLogin(): Promise<any>;
    abstract showLogin(
        keepPage?: boolean,
        redirectClose?: boolean,
        redirectHome?: boolean,
        blockNavigation?: boolean
    ): void;

    constructor(
        configService: NxConfigService,
        protected translateService: TranslateService,
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
        protected bootstrapProviderService: NxBootstrapProvider,
        protected store: Store,
        protected dialogs: NxDialogsService,
    ) {
        this.CONFIG = configService.getConfig();
        // language provider will be ready at this point
        // we don't support dynamic lang switch ... ==TT
        // languageService.translateSubject.subscribe(lang => { this.LANG = lang; });
        this.location = locationService;
        this.loginDialogActive = false;

        // Singleton service will be destroyed with application
        this.store.select(accountSelectors.selectCurrentUser)
            // eslint-disable-next-line ngrx/no-store-subscription
            .subscribe(account => {
                this._account = account;
            });

        // Distinct until changed is used to prevent the logout function from looping.
        this.loginSubscription = this.sessionService.loginStateSubject
            .pipe(debounceTime(1000), distinctUntilChanged())
            .subscribe(loginState => {
                if (loginState !== '' && !environment.isLocal) {
                    if (loginState) {
                        this.startAccountPoll();
                    } else {
                        this.clearLoginState();
                    }
                }
            });

        if (!environment.isLocal) {
            this.accountPoll = this.pollService.createPoll(
                () => this.cloudApi.account(true),
                updateInterval
            );
        }

        // Imperatively inject any services that cause circular dependencies here instead of passing in constructor
        // setTimeout(() => {
        this.applyService = injector.get(NxApplyService);
        this.loginService.accountService = this;

        this.localStorage = injector.get(LocalStorageService);
        this.localStorage.observe(oauthStore.verify2fa).pipe(
            filter(() => !!this.tokens)
        ).subscribe(accessToken => {
            if (this.tokens.access_token !== accessToken) {
                return this.dialogs.notify(this.LANG.errorCodes.wrongAuthCode, 'danger', true);
            }
            this.dialogs.notify(this.LANG.toastMessage.loggingIn, 'success', false);
            this.loginTokens(this.tokens).then(() => { });
        });
    }

    private loginTokens(tokens) {
        return this.cloudApi.loginTokens(tokens).then((res: any) => {
            this.tokens = undefined;
            this.clearCodeFromUri();
            this.localStorage.clear(oauthStore.verify2fa);
            this.localStorage.clear('systemId');
            // Changing "loginState" is enough here. Re-init routes are subscribed to it.
            this.sessionService.loginState = res.email;
            setTimeout(() => this.window.location.reload());
        });
    }

    ngOnDestroy(): void {
        this.loginSubscription && this.loginSubscription.unsubscribe();
        this.queryParamSubscription.unsubscribe();
    }

    // Methods shared between local and cloud versions of account service.

    get account(): Account {
        return this._account;
    }

    set account(account: Account) {
        this.store.dispatch(
            accountActions.setCurrentUser({ currentUser: account })
        );
        const loginState = this.sessionService.loginState;
        const login = account?.email || account?.name;
        if (login && (!loginState || loginState !== login)) {
            this.sessionService.loginState = login;
        }
    }

    // these seem to be deprecated (@gbezyuk)
    get email() {
        return this.sessionService.loginState;
    }

    async authKey() {
        const { auth_key: auth } = await this.cloudApi.authKey();
        return auth;
    }

    async checkVisitedKey(key: string) {
        const { visited } = await this.cloudApi.visitedKey(key);
        return !!visited;
    }

    async checkCode(code: string) {
        const { emailExists } = await this.cloudApi.checkCode(code) as any;
        return !!emailExists;
    }

    protected clearLoginState(): void {
        this.stopAccountPoll();
        this.sessionService.invalidateSession();
    }

    redirectAuthorised(): void {
        this.get()
            .then((account: Account) => {
                if (account && !environment.isLocal) {
                    this.router
                        .navigate([(this.CONFIG.featureFlags.dashboardRedirect || this.cookieService.get('devServer')) ? '/dashboard' : redirect.authorised])
                        .catch(error => {
                            console.error(error);
                        });
                }
            });
    }

    redirectToHome() {
        return this.get()
            .then((account: Account) => {
                if (account) {
                    this.router
                        .navigate([redirect.authorised])
                        .catch(error => {
                            console.error(error);
                        });
                } else {
                    this.router
                        .navigate([redirect.unauthorised])
                        .catch(error => {
                            console.error(error);
                        });
                }
            }).catch(() => {
                this.router
                    .navigate([redirect.unauthorised])
                    .catch(error => {
                        console.error(error);
                    });
            });
    }

    redirectAfterLogout(doNotRedirect, skipReload): void {
        if (!doNotRedirect) {
            this.router
                .navigate([redirect.unauthorised])
                .finally(() => {
                    setTimeout(() => {
                        this.account = undefined;
                        !skipReload && this.window.location.reload();
                    });
                });
        } else if (!skipReload) {
            setTimeout(() => {
                this.window.location.reload();
            });
        }
    }

    reactivate(email) {
        return this.cloudApi.reactivate(email);
    }

    disconnect(systemId) {
        return this.cloudApi.disconnect(systemId).toPromise();
    }

    connect(systemName, userEmail, userPassword) {
        return this.cloudApi.connect(systemName, userEmail, userPassword);
    }

    verify(password) {
        return this.cloudApi.verify(password);
    }

    update2fa(password, mfaCode, action: 'activate' | 'deactivate' | 'toggle' = 'toggle') {
        return this.cloudApi.update2fa(password, mfaCode, action);
    }

    get2FaKey() {
        return this.cloudApi.get2FaKey();
    }

    deactivate2FaKey() {
        return this.cloudApi.deactivate2FaKey();
    }

    get2FaBackupCode() {
        return this.cloudApi.get2FaBackupCode();
    }

    verify2FaKey(code, verificationCode) {
        return this.cloudApi.verify2FaKey(code, verificationCode);
    }

    updateSessionWith2fa(verificationCode) {
        return this.cloudApi.updateSessionWith2fa(verificationCode);
    }

    sendMessage(subject, asset, message, userName, userEmail) {
        return this.cloudApi.sendMessage(subject, asset, message, userName, userEmail).toPromise();
    }

    // Temporary aid for AJS
    getCredentialsFromAuth(authKey: string) {
        return atob(authKey).split(':');
    }

    loginWithAuthKey(authKey: string): Promise<boolean> {
        const auth = atob(decodeURIComponent(authKey)).split(':');
        const tempLogin = auth[0];
        const tempPassword = auth[1];

        return this.login(tempLogin, tempPassword, false)
            .then(() => this.clearAuthFromUri()).catch(() => {
                // If the key login fails ask the user to login manually.
                return this.loginService.login(true, true)
                    .catch(() => {
                        // @ts-expect-error: TODO Type Error location.path expects boolean and is being passed a string
                        this.location.path(redirect.unauthorised);
                    });
            });
    }

    // TODO: @Chris check for apply service in logout functions

    logout(doNotRedirect = false, skipReload = false): void {
        this.applyService
            .canMove()
            .then((allowed: boolean) => {
                if (allowed) {
                    // this.account = undefined; <- moved to logout helper --TT
                    this.logoutHelper(doNotRedirect, skipReload);
                }
            });
    }

    logoutAuthorised(skipReload = false) {
        return this.get()
            .then((account: Account) => {
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
                            title: { value: this.LANG.dialogs.titles.changeAccount, params: { email: account.email } },
                            footer: {
                                actionLabel: this.LANG.dialogs.buttons.stayLoggedIn,
                                cancelLabel,
                            }
                        }).then(result => {
                            if ((isRestore || isRegister || isActivate) && result === false) {
                                this.logout(true, skipReload);
                                return true;
                            } else {
                                this.redirectAuthorised();
                                return false;
                            }
                        });
                }
            });
    }

    private clearAuthFromUri() {
        const queryParams = { auth: undefined, from: undefined };
        return this.router
            .navigate([], { queryParams, queryParamsHandling: 'merge' });
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
            this.dialogs.notify(this.LANG.toastMessage.twoFaRequired, 'info', false);
            return this.oauthService.add2fa(data.access_token || '');
        } else {
            this.clearCodeFromUri();
            this.dialogs.notify(this.LANG.errorCodes.wrongAuthCode, 'danger', true);
            await this.sleep(3000);
            return Promise.resolve(true);
        }
    };

    public async handleRefreshTokenLogin(refreshToken) {
        const url = new URL(this.window.location.href);
        url.searchParams.delete('refresh_token');
        const { code }: any = await this.cloudApi.getTokensFromCloud(refreshToken, 'refresh_token', 'code').toPromise();
        url.searchParams.set('code', code);
        this.window.history.pushState({ url: url.toString() }, '', url.toString());
        return this.handleCodeLogin(code);
    }

    public async handleCodeLogin(code: string) {
        const account = await this.get(true);
        if (!account || !account.is_authenticated) {
            return this.cloudApi.loginCode(code)
                .then(res => {
                    this.loginSubscription && this.loginSubscription.unsubscribe();
                    this.sessionService.loginState = res.email;
                    this.clearCodeFromUri();
                    this.window.location.reload();
                })
                .catch(e => this.handleCodeError(e)
                    .then(reload => reload && this.window.location.reload())
                ).finally(() => {
                    this.appStateService.ready = true;
                });
        }

        const logoutTokens = (tokens, reload = false) => {
            return this.cloudApi.logoutTokens(tokens.access_token, tokens.refresh_token).then(() => {
                this.clearCodeFromUri();
                if (reload) {
                    this.window.location.reload();
                }
            });
        };

        try {
            const tokens: any = await this.cloudApi.getTokensFromCloud(code).toPromise();
            const tokenInfo: any = await this.cloudApi.getTokenInfo(tokens.access_token).toPromise();
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
                    cancelLabel: { value: this.LANG.dialogs.buttons.stayAs, params: { email: account.email } },
                }
            });
            if (res) {
                this.stopAccountPoll();
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
                    cancelLabel: { value: this.LANG.dialogs.buttons.stayAs, params: { email: account.email } },
                }
            });

            if (response) {
                await this.logoutHelper(true, true);
                await this.sleep(1000);
                return this.window.location.reload();
            }
            return this.clearAuthFromUri().then(() => this.document.location.reload());
        } catch (e) {
            this.dialogs.notify(this.LANG.errorCodes.wrongAuthCode, 'danger', true);
            return this.requireLogin();
        } finally {
            this.appStateService.ready = true;
        }
    }

    // TODO: Need to refine return value
    protected startAccountPoll(): void {
        this.stopAccountPoll();
        this.accountPollSubscription = this.accountPoll
            .pipe(
                distinctUntilChanged(),
                catchError(res => {
                    if (res?.error?.resultCode === 'badUsername') {
                        return this.dialogs.expiredSession()
                            .then(() => this.logoutHelper(true));
                    }
                    return of(undefined);
                })
            ).subscribe((account: Account) => {
                this.account = account;
            });
    }

    protected stopAccountPoll(): void {
        if (this.accountPollSubscription) {
            this.accountPollSubscription.unsubscribe();
        }
    }
}
