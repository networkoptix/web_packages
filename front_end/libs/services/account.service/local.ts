import { Location } from '@angular/common';
import type { HttpErrorResponse } from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { CookieService } from 'ngx-cookie-service';
import { firstValueFrom } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxDbService } from '@services/db.service';
import type { UserSession } from '@services/system-api.types';
import { NxSystemRestAPI3 } from '@services/system-rest-api-v3.service';
import { NxToastService } from '@services/toast.service';
import { redirect } from '@variables/static-variables';

import { NxLoginService } from '../login.service';
import { NxAppStateService } from '../nx-app-state.service';
import { NxCloudApiService } from '../nx-cloud-api';
import { OauthService } from '../oauth.service';
import { NxSessionService } from '../session.service';
import { NxStorageService } from '../storage.service';
import { NxSystemAPIService } from '../system-api.service';
import { NxUriService } from '../uri.service';

import { Account, newLocalAccount } from './account';
import { BaseAccount } from './base';

@Injectable()
export class LocalAccount extends BaseAccount {
    constructor(
        protected translateService: TranslateService,
        locationService: Location,
        protected cookieService: CookieService,
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
        protected store: Store,
        protected dialogs: NxDialogsService,
        protected toasts: NxToastService,
        protected db: NxDbService,
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
            db,
        );
        this.mediaServerApi = this.nxSystemAPIService.createConnection({
            version: this.CONFIG.system.version.major,
        }) as NxSystemRestAPI3;
    }

    async get(forceUpdate = false): Promise<Account | undefined> {
        if (this.sessionService.isAuthorized$$() || this.storageService.cloudAccessToken) {
            const user = await this.mediaServerApi.getCurrentUser(forceUpdate).catch(error => {
                return Promise.reject(error);
            });
            let account: Account;
            if (user) {
                // @ts-expect-error FIXME: NxSystemRestAPI3.getCurrentUser() returns v3 user
                // but return type on method is wrong
                account = newLocalAccount(user);
                this.account = account;
            }

            return account;
        }

        if (!this.loginDialogActive) {
            return this.showLoginDialog().then(() => undefined);
        }
    }

    login(
        login: string,
        password: string,
        remember = false,
        _navigateHome = false,
    ): Promise<UserSession> {
        return firstValueFrom(
            this.mediaServerApi.loginToken(login, password, remember).pipe(
                catchError((err: HttpErrorResponse) => Promise.reject(err)),
                tap(_ => {
                    this.sessionService.loginState = this.sessionService.LOGIN_STATE.AUTHORIZED;
                }),
            ),
        );
    }

    logoutHelper(doNotRedirect = false, skipReload = false): void {
        if (!doNotRedirect) {
            this.router.navigate([redirect.unauthorised]).finally(() => {
                this.mediaServerApi.logout().finally(() => {
                    this.cookieService.deleteAll();
                    this.sessionService.invalidateSession(); // Clear session
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

    showLogin(keepPage?: boolean): void {
        this.loginService.login(keepPage);
    }

    private showLoginDialog(): Promise<Account | undefined> {
        this.loginDialogActive = true;
        const temporaryUserToken = new URLSearchParams(this.window.location.href.split('?')[1]).get(
            'tmp_token',
        );
        if (temporaryUserToken) {
            this.loginService.temporaryUserToken$$.set(temporaryUserToken);
            return this.loginService.temporaryUserLogin().then(() => {
                this.loginDialogActive = false;
                return undefined;
            });
        } else {
            return this.loginService.login(true).then(result => {
                this.loginDialogActive = !result;
                if (result === 'newSystem') {
                    return;
                }
                this.storageService.loginRegister = true;
                return this.get();
            });
        }
    }

    redirectAuthorised(): void {
        this.get().catch(err => console.error(err));
    }

    requireLogin(): Promise<Account | undefined> {
        return this.get()
            .then(account => {
                if (!account && !this.loginDialogActive) {
                    this.showLoginDialog();
                }
                return account;
            })
            .catch(() => {
                if (!this.loginDialogActive) {
                    return this.showLoginDialog();
                } else {
                    return undefined;
                }
            });
    }
}
