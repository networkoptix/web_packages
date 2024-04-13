import { Location } from '@angular/common';
import type { HttpErrorResponse } from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { CookieService } from 'ngx-cookie-service';
import { firstValueFrom, Subject } from 'rxjs';
import { tap, catchError, debounceTime, filter, switchMap, shareReplay } from 'rxjs/operators';

import { NxDialogsService } from '@dialogs/dialogs.service';
import type { UserSession } from '@services/system-api.types/users.types';
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
        translateService: TranslateService,
        locationService: Location,
        cookieService: CookieService,
        cloudApi: NxCloudApiService,
        sessionService: NxSessionService,
        uriService: NxUriService,
        storageService: NxStorageService,
        router: Router,
        appStateService: NxAppStateService,
        injector: Injector,
        nxSystemAPIService: NxSystemAPIService,
        loginService: NxLoginService,
        oauthService: OauthService,
        store: Store,
        dialogs: NxDialogsService,
        toasts: NxToastService,
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
        this.mediaServerApi = this.nxSystemAPIService.createConnection({
            version: this.CONFIG.system.version.major,
        }) as NxSystemRestAPI3;
    }

    private openDialog$ = new Subject<void>();
    private dialogResult$ = this.openDialog$.pipe(
        takeUntilDestroyed(),
        debounceTime(100),
        filter(() => !this.loginDialogActive),
        switchMap(() => {
            this.loginDialogActive = true;
            return this.showLoginDialog()
                .then(account => {
                    this.loginDialogActive = false;
                    return account;
                })
                .catch(() => undefined);
        }),
        filter(Boolean),
        shareReplay({ bufferSize: 1, refCount: false }),
    );

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
            this.openDialog$.next();
            return firstValueFrom(this.dialogResult$);
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

    showLogin(keepPage?: boolean): void {
        this.loginService.login(keepPage);
    }

    private showLoginDialog(): Promise<Account | undefined> {
        this.loginDialogActive = true;
        const temporaryUserToken = new URLSearchParams(window.location.href.split('?')[1]).get(
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

    async requireLogin(): Promise<Account | undefined> {
        let account: Account | undefined;
        try {
            account = await this.get();
        } catch {
            if (!this.loginDialogActive) {
                this.openDialog$.next();
                return firstValueFrom(this.dialogResult$);
            }
        }
        return account;
    }
}
