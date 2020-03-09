import { Inject, Injectable, OnDestroy }      from '@angular/core';
import { DOCUMENT, Location }                 from '@angular/common';
import { LocalStorageService }                from 'ngx-store';
import { ActivatedRoute, Router }             from '@angular/router';
import { NxConfigService, IConfig }           from './nx-config';
import { NxCloudApiService }                  from './nx-cloud-api';
import { NxLanguageProviderService }          from './nx-language-provider';
import { NxDialogsService }                   from '../dialogs/dialogs.service';
import { NxSessionService }                   from './session.service';
import { NxApplyService }                     from './apply.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ReplaySubject, Subscription, timer, Subscribable, Observable } from 'rxjs';
import { WINDOW }                             from './window-provider';
import { NxAppStateService }                  from './nx-app-state.service';
import { NxUriService }                       from './uri.service';
import { LanguageI18NStaticTypes } from '../../language_i18n_static_types';

// TODO Need to refine this types
export type account = undefined | any

export type accountResolvedPromise = any

export type accountRejectedPromise = any

@Injectable({
    providedIn: 'root'
})
export class NxAccountService implements OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    // Use Location type?
    location: Location;
    loggingOut: boolean;
    requestingLogin: Promise<any>;
    account: account;
    loginStateSubject = new ReplaySubject(1);
    loginDialogActive: boolean;
    reloading: boolean;

    private loginSubscription: Subscription;
    private queryParamSubscription: Subscription;

    constructor(@Inject(DOCUMENT) private document: Document,
                @Inject(WINDOW) private window: Window,
                configService: NxConfigService,
                languageService: NxLanguageProviderService,
                private cloudApi: NxCloudApiService,
                private sessionService: NxSessionService,
                private uriService: NxUriService,
                private localStorageService: LocalStorageService,
                private locationService: Location,
                private dialogs: NxDialogsService,
                private router: Router,
                private activatedRoute: ActivatedRoute,
                private applyService: NxApplyService,
                private appStateService: NxAppStateService
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.getTranslations();
        this.location = this.locationService;
        this.loggingOut = false;
        this.loginDialogActive = false;

        // Distinct until changed is used to prevent the logout function from looping.
        this.loginSubscription = this.sessionService.loginStateSubject
            .pipe(debounceTime(500), distinctUntilChanged())
            .subscribe((loginState) => {
                if (loginState === null) {
                    this.logout();
                } else if (loginState !== '') {
                    this.get()
                        .then((account) => {
                            // prevent stale loginState
                            if (account) {
                                this.loginStateSubject.next(loginState);
                            } else {
                                this.clearLoginState();
                            }
                        });
                }
            });

        // Handles login with auth param everywhere.
        this.queryParamSubscription = this.uriService.queryParamsSubject.pipe(
            distinctUntilChanged()
        ).subscribe((params: any) => {
            if (params.auth) {
                this.handleAuthKeyLogin(params.auth);
            }
        });
    }

    ngOnDestroy() {
        this.loginSubscription.unsubscribe();
        this.queryParamSubscription.unsubscribe();
    }

    clearLoginState() {
        this.sessionService.invalidateSession();
    }

    setupAccount(account: account) {
        // cleanup
        if (this.account && this.account.timer) {
            this.account.timer.unsubscribe();
        }
        this.account = account;

        // Set up timer
        const timer$ = timer(this.CONFIG.updateInterval, this.CONFIG.updateInterval);

        // Update account to unsure any external changes are applied to this session
        this.account.timer = timer$.subscribe(() => {
            this.cloudApi
                .account()
                .then((account) => {
                    this.account = account;
                })
                .catch(() => {
                    this.cloudApi
                        .logout()
                        .finally(() => {
                            this.account = undefined;
                            this.sessionService.invalidateSession(); // Clear session

                            setTimeout(() => {
                                return this.document.location.reload();
                            });
                        });
                });
        });
    }

    get(forceUpdate = false): undefined | Promise<account> {
        if (this.requestingLogin) {
            // login is requesting, so we wait
            return this.requestingLogin
                .then(() => {
                    this.requestingLogin = undefined; // clean requestingLogin reference
                    return this.get(); // Try again
                });
        }

        if (this.account && !forceUpdate) {
            return new Promise(resolve => {
                return resolve(this.account);
            });
        }

        return this.cloudApi
            .account()
            .then((account) => {
                this.setupAccount(account);
                return account;
            })
            .catch(() => {
                return undefined;
            });
    }

    authKey() {
        return this.cloudApi
            .authKey()
            .then((result: any) => {
                return result.auth_key;
            });
    }

    checkVisitedKey(key: string) {
        return this.cloudApi
            .visitedKey(key)
            .then((result: any) => {
                return result.visited;
            });
    }

    checkCode(code: string) {
        return this.cloudApi
            .checkCode(code)
            .then((result: any) => {
                return result.emailExists;
            });
    }

    requireLogin() {
        return this.get()
            .then((account) => {
                if (!account && !this.loginDialogActive) {
                    this.loginDialogActive = true;
                    return this.dialogs
                        .login(this, true, true).then(() => {
                            return this.get().then((account) => {
                                return account;
                            });
                        })
                        .catch(() => {
                            this.router.navigate([this.CONFIG.redirect.unauthorised]);
                        }).finally(() => {
                            this.loginDialogActive = false;
                        });
                } else if (this.loginDialogActive) {
                    return undefined;
                }
                return account;
            });
    }

    redirectAuthorised() {
        this.get()
            .then((account) => {
                if (account) {
                    this.router.navigate([this.CONFIG.redirect.authorised]);
                }
            });
    }

    redirectToHome() {
        this.get()
            .then((account) => {
                if (account) {
                    this.router.navigate([this.CONFIG.redirect.authorised]);
                } else {
                    this.router.navigate([this.CONFIG.redirect.unauthorised]);
                }
            }).catch(() => {
                this.router.navigate([this.CONFIG.redirect.unauthorised]);
            });
    }

    setEmail(email: string) {
        this.sessionService.email = email;
    }

    getEmail() {
        return this.sessionService.email;
    }

    login(email: string, password: string, remember: boolean): Promise<accountResolvedPromise | accountRejectedPromise> {
        this.sessionService.email = email;

        this.requestingLogin = this.cloudApi
            .login(email, password, remember)
            .then((result: any) => {
                if (!this.cloudApi.checkResponseHasError(result)) {
                    if (this.sessionService.loginState) {
                        // If the user that logged in matches the current session there's no need to show
                        // the logout dialog.
                        if (result.email !== this.sessionService.loginState) {
                            this.logoutAuthorised();
                        }

                        return Promise.resolve({ data: { account: result, resultCode: this.CONFIG.responseOk } });
                    }

                    if (result.email) { // (result.data.resultCode === L.errorCodes.ok)
                        this.sessionService.email = result.email;
                        this.sessionService.loginState = result.email; // Forcing changing loginState to reload interface
                    }

                    return Promise.resolve({ data: { account: result, resultCode: this.CONFIG.responseOk } });
                }
                return Promise.reject({ error: { resultCode: result.resultCode } });
            })
            .catch((result: any) => {
                if (this.cloudApi.checkResponseHasError(result.error)) {
                    return Promise.reject({ resultCode: result.error.resultCode });
                }
            });
        return this.requestingLogin;
    }

    // Temporary aid for AJS
    getCredentialsFromAuth(authKey: string) {
        return atob(authKey).split(':');
    }

    loginWithAuthKey(authKey: string) {
        const auth = atob(authKey).split(':');
        const tempLogin = auth[0];
        const tempPassword = auth[1];

        return this.login(tempLogin, tempPassword, false)
            .then(() => {
                const queryParams = { auth: undefined, from: undefined };
                return this.router.navigate([], { queryParams, queryParamsHandling: 'merge' });
            }).catch(() => {
                // If the key login fails ask the user to login manually.
                return this.dialogs
                    .login(this, true, true)
                    .catch(() => {
                        // @ts-ignore: TODO Type Error location.path expects boolean and is being passed a string
                        this.location.path(this.CONFIG.redirect.unauthorised);
                    });
            });
    }

    logout(doNotRedirect?: boolean) {
        if (this.loggingOut) {
            return;
        }

        this.applyService
            .canMove()
            .then((allowed) => {
                if (allowed) {
                    this.loggingOut = true;
                    this.cloudApi
                        .logout()
                        .finally(() => {
                            if (this.account && this.account.timer) {
                                this.account.timer.unsubscribe();
                            }
                            this.account = undefined;
                            this.sessionService.invalidateSession(); // Clear session
                            if (!doNotRedirect) {
                                return this.router
                                    .navigate([this.CONFIG.redirect.unauthorised])
                                    .finally(() => {
                                        setTimeout(() => this.window.location.reload());
                                    });
                            }

                            setTimeout(() => {
                                return this.window.location.reload();
                            });
                        });
                }
            });
    }

    logoutAuthorised() {
        return this.get()
            .then((account) => {
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
                        .confirm('',
                            this.LANG.dialogs.titles.changeAccount.replace('{email}', account.email),
                            this.LANG.dialogs.buttons.stayLoggedIn,
                            undefined,
                            cancelLabel,
                            ''
                        ).then((result) => {
                            if ((isRestore || isRegister || isActivate) && result === cancelLabel) {
                                return this.logout(true);
                            } else {
                                return this.redirectAuthorised();
                            }
                        });
                }
            });
    }

    checkUnauthorized(data: accountResolvedPromise) {
        if (data && data.resultCode === 'notAuthorized') {
            this.logout(true);
            return false;
        }
        return true;
    }

    private handleAuthKeyLogin(auth: string) {
        this.get()
            .then((account) => {
                if (!account) {
                    return this.loginWithAuthKey(auth).then(() => {
                        return this.document.location.reload();
                    }).catch(() => {
                        this.appStateService.ready = true;
                    });
                }

                this.appStateService.ready = true;

                this.cloudApi.checkAuthCode(auth).then(async(result: any) => {
                    if (result.email === account.email) {
                        return;
                    }

                    const response = await this.dialogs
                        .confirm('',
                            this.LANG.dialogs.titles.loggedFromOtherAccount,
                            this.LANG.dialogs.buttons.ok,
                            undefined,
                            this.LANG.dialogs.buttons.stayAs.replace('{email}', account.email),
                            'long-cancel-button');
                    if (response === true) {
                        return this.cloudApi
                            .logout()
                            .finally(() => {
                                if (this.account && this.account.timer) {
                                    this.account.timer.unsubscribe();
                                }
                                this.account = undefined;
                                this.localStorageService.clear('all'); // Clear session
                                // this.sessionService.invalidateSession(); // Clear session
                                return this.loginWithAuthKey(auth).then(() => {
                                    return this.document.location.reload();
                                });
                            });
                    } else {
                        const queryParams = { auth: undefined, from: undefined };
                        return this.router
                            .navigate([], { queryParams, queryParamsHandling: 'merge' })
                            .then(() => this.document.location.reload());
                    }
                });
            });
    }
}
