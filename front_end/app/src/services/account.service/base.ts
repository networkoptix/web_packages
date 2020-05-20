import { Inject, OnDestroy, Injector }                    from '@angular/core';
import { DOCUMENT, Location }                             from '@angular/common';
import { LocalStorageService }                            from 'ngx-store';
import { Router }                                         from '@angular/router';
import { NxConfigService, IConfig }                       from '../nx-config';
import { NxCloudApiService }                              from '../nx-cloud-api';
import { NxLanguageProviderService }                      from '../nx-language-provider';
import { NxDialogsService }                               from '../../dialogs/dialogs.service';
import { NxSessionService }                               from '../session.service';
import { NxApplyService }                                 from '../apply.service';
import { catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { BehaviorSubject, Observable, of, Subscription }  from 'rxjs';
import { WINDOW }                                         from '../window-provider';
import { NxAppStateService }                              from '../nx-app-state.service';
import { NxUriService }                                   from '../uri.service';
import { LanguageI18NStaticTypes }                        from '../../../language_i18n_static_types';
import { NxPollService }                                  from '../poll.service';
import { NxUtilsService }                                 from '../utils.service';
import { IParams }                                        from '../../components/search/search.component';
import { Account }                                        from './account';

/**
 * BaseAccount is an abstract class extended by CloudAccount and LocalAccount.
 * CloudAccount and LocalAccount overrides should maintiain same interface
 * as BaseAccount.
 */
export abstract class BaseAccount implements OnDestroy {
    protected CONFIG: IConfig;
    protected LANG: LanguageI18NStaticTypes;
    protected location: Location;
    accountSubject = new BehaviorSubject<Account>(undefined);
    protected loggingOut: boolean;
    protected requestingLogin: Promise<{data: {account: Account, resultCode: string}}>;
    protected loginDialogActive: boolean;

    protected accountPoll: Observable<Account | string>;
    protected accountPollSubscription: Subscription;
    protected loginSubscription: Subscription;
    protected queryParamSubscription: Subscription;

    // Declare services that cause circular dependencies here instead of injecting in constructor
    protected dialogs: NxDialogsService;
    protected applyService: NxApplyService;

    constructor(
        configService: NxConfigService,
        languageService: NxLanguageProviderService,
        locationService: Location,
        @Inject(DOCUMENT) protected document: Document,
        @Inject(WINDOW) protected window: Window,
        protected cloudApi: NxCloudApiService,
        protected sessionService: NxSessionService,
        protected uriService: NxUriService,
        protected localStorageService: LocalStorageService,
        protected router: Router,
        protected appStateService: NxAppStateService,
        protected pollService: NxPollService,
        injector: Injector
    ) {
        this.CONFIG = configService.getConfig();
        this.LANG = languageService.translations;
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
        ).subscribe((params: IParams) => {
            if (params.auth) {
                this.handleAuthKeyLogin(params.auth);
            }
        });

        this.accountPoll = this.pollService.createPoll<Account>(this.cloudApi.account(), this.CONFIG.updateInterval);

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

    protected get account() {
        return this.accountSubject.getValue();
    }

    protected set account(account: Account) {
        if (!NxUtilsService.isEqual(account, this.account)) {
            this.accountSubject.next(account);
        }
    }

    get email() {
        return this.sessionService.email;
    }

    set email(email) {
        this.sessionService.email = email;
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

    protected clearLoginState() {
        this.stopAccountPoll();
        this.sessionService.invalidateSession();
    }

    get(forceUpdate = false): Promise<Account | undefined> {
        if (this.requestingLogin) {
            // login is requesting, so we wait
            return this.requestingLogin
                .then(() => {
                    this.requestingLogin = undefined; // clean requestingLogin reference
                    return this.get(); // Try again
                }, () => {
                    return undefined;
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
                        .login(<any> this, true, true).then((result) => {
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

        this.requestingLogin = <Promise<{data: {account: Account, resultCode: string}}>> this.cloudApi
            .login(email, password, remember)
            .then((result: any): any => {
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

    protected loginWithAuthKey(authKey: string): Promise<boolean> {
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
                    .login(<any> this, true, true)
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

    // TODO: Need to refine return value
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

    protected handleAuthKeyLogin(auth: string) {
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

    protected logoutHelper(doNotRedirect: boolean) {
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

    protected startAccountPoll() {
        this.stopAccountPoll();
        this.accountPollSubscription = this.accountPoll.pipe(
            catchError((ex) => {
                this.logoutHelper(false);
                return of(undefined);
            })
        ).subscribe((account: Account) => {
            this.account = account;
        });
    }

    protected stopAccountPoll() {
        if (this.accountPollSubscription) {
            this.account = undefined;
            this.accountPollSubscription.unsubscribe();
        }
    }

    serviceInstance() {
        return 'is base';
    }
}
