import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { CookieService } from 'ngx-cookie-service';
import { LocalStorageService } from 'ngx-webstorage';

import { accountActions, accountSelectors } from '@common/store/account';
import { ToastType } from '@components/toast-container/toast.types';
import staticLang from '@language_static';
import { UserSession } from '@services/system-api.types/users.types';
import { NxSystemRestAPI3 } from '@services/system-rest-api-v3.service';
import { NxToastService } from '@services/toast.service';
import { oauthStore } from '@static-variables';

import { NxApplyService } from '../apply.service';
import { NxAppStateService } from '../nx-app-state.service';
import { NxCloudApiService } from '../nx-cloud-api';
import { nxConfig } from '../nx-config/config';
import { NxSessionService } from '../session.service';

import { Account } from './account';

/**
 * BaseAccount is an abstract class extended by CloudAccount and LocalAccount.
 * CloudAccount and LocalAccount overrides should maintain same interface
 * as BaseAccount.
 */
@Injectable()
export abstract class BaseAccount {
    protected CONFIG = nxConfig;
    protected LANG = staticLang;
    protected localStorage = inject(LocalStorageService);
    protected tokens: { access_token: string; refresh_token: string } | undefined;

    private _account = this.store.selectSignal(accountSelectors.selectCurrentUser);

    // Declare services that cause circular dependencies here instead of injecting in constructor
    private applyService = inject(NxApplyService);
    protected appStateService = inject(NxAppStateService);

    // Only in LocalAccount but added here for TS convenience
    mediaServerApi: NxSystemRestAPI3; // Look into removing

    // Abstract methods implemented by cloud and local versions
    abstract logoutHelper(doNotRedirect?: boolean, skipReload?: boolean): void;
    abstract get(forceUpdate?: boolean): Promise<Account | null | undefined>;
    abstract login(
        email: string,
        password: string,
        remember?: boolean,
        navigateHome?: boolean,
    ): Promise<Account | UserSession | undefined>;
    abstract redirectAuthorised(): void;
    abstract requireLogin(): Promise<Account | null | undefined | void>;

    constructor(
        protected cloudApi: NxCloudApiService,
        protected sessionService: NxSessionService,
        protected router: Router,
        protected cookieService: CookieService,
        protected store: Store,
        protected toasts: NxToastService,
    ) {
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

    async showExpired(): Promise<void> {
        return Promise.resolve();
    }

    protected clearCodeFromUri(): void {
        const url = new URL(window.location.href);
        url.searchParams.delete('code');
        window.history.pushState({ url: url.toString() }, '', url.toString());
    }

    protected loginTokens(tokens: Record<string, string>): Promise<void> {
        return this.cloudApi.loginTokens(tokens).then(() => {
            this.tokens = undefined;
            this.clearCodeFromUri();
            this.localStorage.clear(oauthStore.verify2fa);
            this.localStorage.clear('systemId');
            // Changing "loginState" is enough here. Re-init routes are subscribed to it.
            const prevState = this.sessionService.loginState;
            this.sessionService.loginState = this.sessionService.LOGIN_STATE.AUTHORIZED;
            if (prevState !== this.sessionService.LOGIN_STATE.CHANGED) {
                setTimeout(() => window.location.reload());
            }
        });
    }

    // Methods shared between local and cloud versions of account service.
    private initStoreUpdater(account: Account): void {
        this.store.dispatch(accountActions.setCurrentUser({ currentUser: account }));
    }

    get account(): Account {
        return this._account() || undefined;
    }

    set account(account: Account | undefined) {
        if (account) {
            this.initStoreUpdater(account);
        }
        const login = account?.email || account?.name;
        const { email, name } = this._account() || {};
        const currentLogin = email || name;
        const LOGIN_STATE = this.sessionService.LOGIN_STATE;
        if (currentLogin && login) {
            this.sessionService.loginState =
                currentLogin === login ? LOGIN_STATE.AUTHORIZED : LOGIN_STATE.CHANGED;
        } else if (currentLogin || login) {
            this.sessionService.loginState = LOGIN_STATE.AUTHORIZED;
        }
    }

    get email(): string {
        return this._account()?.email;
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
}
