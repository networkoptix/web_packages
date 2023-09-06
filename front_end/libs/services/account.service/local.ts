import { Location } from '@angular/common';
import type { HttpErrorResponse } from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { CookieService } from 'ngx-cookie-service';
import { tap, catchError } from 'rxjs/operators';

import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxDbService } from '@services/db.service';
import type { UserSession } from '@services/system-api.types';
import type { NxSystemRestAPI } from '@services/system-rest-api.service';
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
        }) as NxSystemRestAPI;
    }

    async get(forceUpdate = false): Promise<Account | undefined> {
        if (this.sessionService.loginState || this.storageService.cloudAccessToken) {
            const user = await this.mediaServerApi.getCurrentUser(forceUpdate);
            let account: Account;
            if (user) {
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
        return this.mediaServerApi
            .loginToken(login, password, remember)
            .pipe(
                catchError((err: HttpErrorResponse) => {
                    const errorLookup = {
                        'Wrong password.': 'notAuthorized',
                        'Wrong username or password.': 'notAuthorized',
                        'This user on your IP is locked out due to many filed attempts. Please, try again later.':
                            'accountBlocked',
                        'The user is locked out due to several failed attempts. Please try again later.':
                            'accountBlocked',
                    };
                    const resultCode = errorLookup[err.error.errorString];
                    return Promise.reject({ resultCode });
                }),
                tap(_ => {
                    this.sessionService.loginState = login;
                }),
            )
            .toPromise();
    }

    logoutHelper(doNotRedirect = false, skipReload = false): void {
        if (!doNotRedirect) {
            this.router.navigate([redirect.unauthorised]).finally(() => {
                this.mediaServerApi.logout().finally(() => {
                    this.cookieService.deleteAll();
                    this.sessionService.invalidateSession(); // Clear session
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

    showLogin(keepPage?: boolean): void {
        this.loginService.login(keepPage);
    }

    private showLoginDialog(): Promise<Account | undefined> {
        this.loginDialogActive = true;
        const temporaryUserToken = new URLSearchParams(this.window.location.href.split('?')[1]).get(
            'temporaryUserToken',
        );
        if (temporaryUserToken) {
            return this.loginService.temporaryUserLogin().then(() => {
                this.loginDialogActive = false;
                return undefined;
            });
        } else {
            return this.loginService.login(true).then(result => {
                this.loginDialogActive = false;
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
                !account && !this.loginDialogActive && this.showLoginDialog();
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
