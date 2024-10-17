import type { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { CookieService } from 'ngx-cookie-service';
import { firstValueFrom, Subject } from 'rxjs';
import { catchError, debounceTime, filter, shareReplay, switchMap, tap } from 'rxjs/operators';

import type { UserSession } from '@services/system-api.types/users.types';
import { NxSystemRestAPI3 } from '@services/system-rest-api-v3.service';
import { NxToastService } from '@services/toast.service';
import { redirect } from '@variables/static-variables';

import { NxLoginService } from '../login.service';
import { NxCloudApiService } from '../nx-cloud-api';
import { NxSessionService } from '../session.service';
import { NxStorageService } from '../storage.service';
import { NxSystemAPIService } from '../system-api.service';

import { Account, newLocalAccount } from './account';
import { BaseAccount } from './base';

@Injectable()
export class LocalAccount extends BaseAccount {
    private loginService = inject(NxLoginService);
    private nxSystemAPIService = inject(NxSystemAPIService);
    private storageService = inject(NxStorageService);

    private loginDialogActive = false;

    constructor(
        cookieService: CookieService,
        cloudApi: NxCloudApiService,
        sessionService: NxSessionService,
        router: Router,
        store: Store,
        toasts: NxToastService,
    ) {
        super(cloudApi, sessionService, router, cookieService, store, toasts);
        this.mediaServerApi = this.nxSystemAPIService.createConnection({
            version: this.CONFIG.system.version?.major || NxSystemRestAPI3.VERSION,
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

    async get(forceUpdate = false): Promise<Account | null | undefined> {
        if (this.sessionService.isAuthorized$$() || this.storageService.cloudAccessToken) {
            const user = await this.mediaServerApi.getCurrentUser(forceUpdate).catch(error => {
                return Promise.reject(error);
            });
            let account: Account | null | undefined;
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

    private showLoginDialog(): Promise<Account | null | undefined> {
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

    async requireLogin(): Promise<Account | null | undefined> {
        let account: Account | null | undefined;
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
