import { Inject, Injectable, OnDestroy, Injector }        from '@angular/core';
import { DOCUMENT, Location }                             from '@angular/common';
import { LocalStorageService }                            from 'ngx-store';
import { ActivatedRoute, Router }                         from '@angular/router';
import { NxConfigService, IConfig }                       from './nx-config';
import { NxCloudApiService }                              from './nx-cloud-api';
import { NxLanguageProviderService }                      from './nx-language-provider';
import { NxDialogsService }                               from '../dialogs/dialogs.service';
import { NxSessionService }                               from './session.service';
import { NxApplyService }                                 from './apply.service';
import { catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { BehaviorSubject, Observable, of, Subscription }  from 'rxjs';
import { WINDOW }                                         from './window-provider';
import { NxAppStateService }                              from './nx-app-state.service';
import { NxUriService }                                   from './uri.service';
import { LanguageI18NStaticTypes }                        from '../../language_i18n_static_types';
import { NxPollService }                                  from './poll.service';
import { NxUtilsService }                                 from './utils.service';

export interface Account {
    email: string;
    // eslint-disable-next-line camelcase
    first_name: string;
    // eslint-disable-next-line camelcase
    last_name: string;
    language: string;
    // eslint-disable-next-line camelcase
    is_staff: boolean;
    // eslint-disable-next-line camelcase
    is_superuser: boolean;
    permissions: string[];
}

@Injectable({
    providedIn: 'root'
})
export class NxAccountService implements OnDestroy {
    CONFIG: IConfig;
    LANG: LanguageI18NStaticTypes;
    location: Location;
    accountSubject = new BehaviorSubject<Account | undefined>(undefined);
    loggingOut: boolean;
    requestingLogin: Promise<any>;
    loginDialogActive: boolean;

    private accountPoll: Observable<any>;
    private accountPollSubscription: Subscription;
    private loginSubscription: Subscription;
    private queryParamSubscription: Subscription;

    // Declare services that cause circular dependencies here instead of injecting in constructor
    private dialogs: NxDialogsService;
    private applyService: NxApplyService;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        locationService: Location,
        @Inject(DOCUMENT) private document: Document,
        @Inject(WINDOW) private window: Window,
        private cloudApi: NxCloudApiService,
        private sessionService: NxSessionService,
        private uriService: NxUriService,
        private localStorageService: LocalStorageService,
        private router: Router,
        private activatedRoute: ActivatedRoute,
        private appStateService: NxAppStateService,
        private pollService: NxPollService,
        injector: Injector
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.getTranslations();
        this.location = locationService;
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
                                this.startAccountPoll();
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

        this.accountPoll = this.pollService.createPoll(this.cloudApi.account(), this.CONFIG.updateInterval);

        // Imperatively inject any services that cause circular dependencies here instead of passing in constructor
        setTimeout(() => {
            this.dialogs = injector.get(NxDialogsService);
            this.applyService = injector.get(NxApplyService);
        });
    }

    ngOnDestroy() {
        this.loginSubscription.unsubscribe();
        this.queryParamSubscription.unsubscribe();
    }

    get account() {
        return this.accountSubject.getValue();
    }

    set account(account: Account) {
        if (!NxUtilsService.isEqual(account, this.account)) {
            this.accountSubject.next(account);
        }
    }

    get email() {
        return this.sessionService.email;
    }

    set email(email: string) {
        this.sessionService.email = email;
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

    clearLoginState() {
        this.stopAccountPoll();
        this.sessionService.invalidateSession();
    }

    get(forceUpdate = false) {
        if (this.requestingLogin) {
            // login is requesting, so we wait
            return this.requestingLogin
                .then(() => {
                    this.requestingLogin = undefined; // clean requestingLogin reference
                    return this.get(); // Try again
                }, () => {
                    return false;
                });
        }

        if (this.account && !forceUpdate) {
            return Promise.resolve(this.account);
        }

        return this.cloudApi
            .account().toPromise()
            .then((account: Account) => {
                this.account = account;
                return account;
            })
            .catch(() => {
                return undefined;
            });
    }

    requireLogin() {
        return this.get()
            .then((account: Account) => {
                if (!account && !this.loginDialogActive) {
                    this.loginDialogActive = true;
                    return this.dialogs
                        .login(this, true, true).then((result) => {
                            this.localStorageService.set('loginRegister', true);
                            if (result === 'register') {
                                return this.router.navigate(['/register']).then(() => result);
                            }
                            return this.get();
                        })
                        .catch(() => this.router.navigate([this.CONFIG.redirect.unauthorised]))
                        .finally(() => {
                            this.loginDialogActive = false;
                        });
                }
                return this.loginDialogActive ? undefined : account;
            });
    }

    redirectAuthorised() {
        this.get()
            .then((account: Account) => {
                if (account) {
                    this.router
                        .navigate([this.CONFIG.redirect.authorised])
                        .catch(error => {
                            console.error(error);
                        });
                }
            });
    }

    redirectToHome() {
        this.get()
            .then((account: Account) => {
                if (account) {
                    this.router
                        .navigate([this.CONFIG.redirect.authorised])
                        .catch(error => {
                            console.error(error);
                        });
                } else {
                    this.router
                        .navigate([this.CONFIG.redirect.unauthorised])
                        .catch(error => {
                            console.error(error);
                        });
                }
            }).catch(() => {
                this.router
                    .navigate([this.CONFIG.redirect.unauthorised])
                    .catch(error => {
                        console.error(error);
                    });
            });
    }

    login(email: string, password: string, remember: boolean) {
        this.sessionService.email = email;

        this.requestingLogin = this.cloudApi
            .login(email, password, remember)
            .then((result: any) => {
                if (!this.cloudApi.checkResponseHasError(result)) {
                    if (this.sessionService.loginState) {
                        // If the user that logged in matches the current session there's no need to show
                        // the logout dialog.
                        if (result.email !== this.sessionService.loginState) {
                            return this.logoutAuthorised();
                        }

                        return Promise.resolve({
                            data: {
                                account    : result,
                                resultCode : this.CONFIG.responseOk
                            }
                        });
                    }

                    if (result.email) { // (result.data.resultCode === L.errorCodes.ok)
                        this.sessionService.email = result.email;
                        this.sessionService.loginState = result.email; // Forcing changing loginState to reload interface
                    }

                    return Promise.resolve({
                        data: {
                            account    : result,
                            resultCode : this.CONFIG.responseOk
                        }
                    });
                }
                // eslint-disable-next-line prefer-promise-reject-errors
                return Promise.reject({ error: { resultCode: result.resultCode } });
            })
            .catch((result: any) => {
                if (this.cloudApi.checkResponseHasError(result.error)) {
                    // eslint-disable-next-line prefer-promise-reject-errors
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
        const auth         = atob(authKey).split(':');
        const tempLogin    = auth[0];
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
        this.account = undefined;

        if (this.loggingOut) {
            return;
        }

        this.applyService
            .canMove()
            .then((allowed: boolean) => {
                if (allowed) {
                    this.loggingOut = true;
                    this.logoutHelper(doNotRedirect);
                }
            });
    }

    logoutAuthorised() {
        return this.get()
            .then((account: Account) => {
                // logoutAuthorisedLogoutButton
                if (account) {
                    const isRegister = this.router.url.includes('/register');
                    const isRestore  = this.router.url.includes('/restore_password');
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

    private handleAuthKeyLogin(auth: string) {
        this.get()
            .then((account: Account) => {
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
                    if (response) {
                        return this.cloudApi
                            .logout()
                            .finally(() => {
                                this.stopAccountPoll();
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

    private logoutHelper(doNotRedirect: boolean) {
        this.cloudApi
            .logout()
            .finally(() => {
                this.sessionService.invalidateSession(); // Clear session
                if (!doNotRedirect) {
                    this.router
                        .navigate([this.CONFIG.redirect.unauthorised])
                        .finally(() => {
                            setTimeout(() => this.window.location.reload());
                        });
                }

                setTimeout(() => {
                    this.window.location.reload();
                });
            });
    }

    private startAccountPoll() {
        this.stopAccountPoll();
        this.accountPollSubscription = this.accountPoll.pipe(
            catchError(() => {
                this.logoutHelper(false);
                return of('Error');
            })
        ).subscribe((account) => {
            this.account = account;
        });
    }

    private stopAccountPoll() {
        if (this.accountPollSubscription) {
            this.account = undefined;
            this.accountPollSubscription.unsubscribe();
        }
    }
}
