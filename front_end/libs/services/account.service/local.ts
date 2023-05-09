import { DOCUMENT, Location } from '@angular/common';
import { Inject, Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { CookieService } from 'ngx-cookie-service';
import { of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

import { redirect } from '@app/variables/static-variables';
import { NxDialogsService } from '@dialogs/dialogs.service';
import { NxDbService } from '@services/db.service';

import { NxLoginService } from '../login.service';
import { NxAppStateService } from '../nx-app-state.service';
import { NxBootstrapProvider } from '../nx-bootstrap-provider';
import { NxCloudApiService } from '../nx-cloud-api';
import { NxConfigService } from '../nx-config/nx-config.service';
import { OauthService } from '../oauth.service';
import { NxSessionService } from '../session.service';
import { NxStorageService } from '../storage.service';
import { NxSystemAPIService } from '../system-api.service';
import { NxUriService } from '../uri.service';
import { WINDOW } from '../window-provider';

import { Account, newLocalAccount } from './account';
import { BaseAccount } from './base';

@Injectable()
export class LocalAccount extends BaseAccount {
    closeResult: string;

    constructor(
        configService: NxConfigService,
        protected translateService: TranslateService,
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
        injector: Injector,
        protected nxSystemAPIService: NxSystemAPIService,
        protected loginService: NxLoginService,
        protected oauthService: OauthService,
        protected bootstrapProviderService: NxBootstrapProvider,
        protected store: Store,
        protected dialogs: NxDialogsService,
        protected db: NxDbService,
    ) {
        super(
            configService,
            translateService,
            locationService,
            document,
            window,
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
            bootstrapProviderService,
            store,
            dialogs,
            db,
        );
        this.mediaServerApi = this.nxSystemAPIService.createConnection(
            undefined,
            undefined,
            undefined,
            () => of(''),
            this.CONFIG.system.version.major,
        );
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

    login(login, password, remember = false, navigateHome = false): Promise<any> {
        return this.mediaServerApi
            .loginToken(login, password, remember)
            .pipe(
                catchError(({ errorString: errorText, ...res }) => {
                    const errorLookup = {
                        'Wrong password.': 'notAuthorized',
                        'Wrong username or password.': 'notAuthorized',
                        'This user on your IP is locked out due to many filed attempts. Please, try again later.':
                            'accountBlocked',
                        'The user is locked out due to several failed attempts. Please try again later.':
                            'accountBlocked',
                    };
                    const resultCode = errorLookup[errorText];
                    return Promise.resolve({ ...res, errorText, resultCode });
                }),
                tap((res: any) => {
                    this.sessionService.loginState = res.resultCode ? undefined : login;
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

    showLogin(
        keepPage?: boolean,
        redirectClose?: boolean,
        redirectHome = false,
        blockNavigation = false,
    ): void {
        this.loginService.login(keepPage, redirectClose, redirectHome, blockNavigation);
    }

    private showLoginDialog(): Promise<string | Account | undefined | boolean> {
        this.loginDialogActive = true;
        return this.loginService
            .login(true, true)
            .then<string | Account | undefined, boolean>(
                result => {
                    if (result === 'newSystem') {
                        return;
                    }
                    this.storageService.loginRegister = true;
                    if (result === 'register') {
                        return this.router.navigate(['/authorize/register']).then(() => result);
                    }
                    return this.get();
                },
                (): any => {
                    this.router.navigate([redirect.unauthorised]);
                },
            )
            .finally(() => {
                this.loginDialogActive = false;
            });
    }
    redirectAuthorised(): void {
        this.get().catch(err => console.error(err));
    }

    requireLogin(): Promise<string | boolean | Account | undefined> {
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
